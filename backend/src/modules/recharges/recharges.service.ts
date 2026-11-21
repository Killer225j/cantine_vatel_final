import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MoyenPaiement, Prisma, StatutTransaction, TypeTransaction } from '@prisma/client';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { erreurMetier } from '../../common/errors/erreur-metier';
import { PREFIXE_CODE_RECU, genererCodeVerification } from '../../shared/codes/code-verification';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ParentsService } from '../parents/parents.service';

export const LIBELLE_MOYEN: Record<MoyenPaiement, string> = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  MOOV_MONEY: 'Moov Money',
};

const DETAIL = {
  id: true,
  montant: true,
  moyen: true,
  statut: true,
  reference: true,
  creeLe: true,
  payeurId: true,
  portefeuille: {
    select: { userId: true, solde: true, user: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.TransactionSelect;

type Recharge = Prisma.TransactionGetPayload<{ select: typeof DETAIL }>;

@Injectable()
export class RechargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parents: ParentsService,
  ) {}

  /**
   * Démarre une recharge : une transaction EN_ATTENTE, créditée seulement quand le paiement
   * (simulé) réussit. L'élève recharge son propre portefeuille ; le parent, celui d'un enfant lié.
   */
  async creer(
    user: { sub: string; role: string },
    dto: { montant: number; moyen: MoyenPaiement; enfantId?: string },
    baseUrl: string,
  ) {
    let beneficiaireId = user.sub;
    if (user.role === 'PARENT') {
      if (!dto.enfantId) {
        throw erreurMetier(
          ForbiddenException,
          ERROR_REASON.ENFANT_NON_LIE,
          'Choisissez l’enfant à recharger.',
        );
      }
      await this.parents.verifierLien(user.sub, dto.enfantId);
      beneficiaireId = dto.enfantId;
    } else if (dto.enfantId && dto.enfantId !== user.sub) {
      throw erreurMetier(
        ForbiddenException,
        ERROR_REASON.ENFANT_NON_LIE,
        'Vous ne pouvez recharger que votre propre portefeuille.',
      );
    }

    const portefeuille = await this.prisma.portefeuille.findUnique({
      where: { userId: beneficiaireId },
    });
    if (!portefeuille) throw new NotFoundException('Portefeuille introuvable.');

    const t = await this.prisma.transaction.create({
      data: {
        portefeuilleId: portefeuille.id,
        type: TypeTransaction.RECHARGE,
        montant: dto.montant,
        moyen: dto.moyen,
        statut: StatutTransaction.EN_ATTENTE,
        reference: genererCodeVerification(PREFIXE_CODE_RECU),
        payeurId: user.sub,
      },
      select: DETAIL,
    });
    return { ...this.vue(t), urlPaiement: `${baseUrl}/api/v1/recharges/${t.id}/paiement` };
  }

  /** Statut d'une recharge et reçu, pour la personne qui paie ou le titulaire du portefeuille. */
  async lire(userId: string, id: string) {
    const t = await this.charger(id);
    if (t.payeurId !== userId && t.portefeuille.userId !== userId) {
      throw new ForbiddenException('Cette recharge ne vous concerne pas.');
    }
    return this.vue(t);
  }

  /** Données de la page de paiement simulée (publique : l'identifiant n'est pas devinable). */
  async pourPaiement(id: string) {
    return this.charger(id);
  }

  /**
   * Termine la simulation. Succès : la transaction passe à REUSSIE et le portefeuille est crédité
   * dans la même transaction SQL ; le garde « EN_ATTENTE » empêche tout double crédit.
   */
  async terminer(id: string, reussie: boolean) {
    const avant = await this.charger(id);
    if (avant.statut !== StatutTransaction.EN_ATTENTE) return avant;

    await this.prisma.$transaction(async (tx) => {
      const maj = await tx.transaction.updateMany({
        where: { id, statut: StatutTransaction.EN_ATTENTE },
        data: { statut: reussie ? StatutTransaction.REUSSIE : StatutTransaction.ECHOUEE },
      });
      if (maj.count === 0 || !reussie) return;

      const p = await tx.portefeuille.update({
        where: { userId: avant.portefeuille.userId },
        data: { solde: { increment: avant.montant } },
        select: { solde: true },
      });
      const montant = `${avant.montant.toLocaleString('fr-FR')} FCFA`;
      const destinataires = new Set([
        avant.portefeuille.userId,
        ...(avant.payeurId ? [avant.payeurId] : []),
      ]);
      await tx.notification.createMany({
        data: [...destinataires].map((userId) => ({
          userId,
          type: 'RECHARGE',
          titre: `Recharge reçue : ${montant}`,
          corps: `Nouveau solde : ${p.solde.toLocaleString('fr-FR')} FCFA (reçu ${avant.reference}).`,
        })),
      });
    });
    return this.charger(id);
  }

  private async charger(id: string): Promise<Recharge> {
    const t = await this.prisma.transaction.findFirst({
      where: { id, type: TypeTransaction.RECHARGE },
      select: DETAIL,
    });
    if (!t) throw new NotFoundException('Recharge introuvable.');
    return t;
  }

  vue(t: Recharge) {
    const { firstName, lastName } = t.portefeuille.user;
    return {
      id: t.id,
      reference: t.reference,
      montant: t.montant,
      moyen: t.moyen,
      moyenLibelle: t.moyen ? LIBELLE_MOYEN[t.moyen] : null,
      statut: t.statut,
      beneficiaire: `${firstName ?? ''} ${lastName ?? ''}`.trim(),
      creeLe: t.creeLe,
    };
  }
}
