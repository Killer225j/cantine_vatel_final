import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutReservation } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { erreurMetier } from '../../common/errors/erreur-metier';
import { aujourdhui, versDate, versJour } from '../../common/utils/dates.util';
import { PrismaService } from '../../shared/prisma/prisma.service';

const IDENTITE = {
  id: true,
  firstName: true,
  lastName: true,
  classe: true,
  allergenes: { select: { code: true, nom: true } },
  portefeuille: { select: { solde: true, seuilAlerte: true } },
} satisfies Prisma.UserSelect;

type Enfant = Prisma.UserGetPayload<{ select: typeof IDENTITE }>;

const nomComplet = (u: { firstName: string | null; lastName: string | null }) =>
  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lie un élève au parent, grâce au code de liaison que l'élève lit dans son profil. */
  async lier(parentId: string, codeBrut: string) {
    const code = codeBrut.trim().toUpperCase();
    const enfant = await this.prisma.user.findUnique({
      where: { codeLiaison: code },
      select: { ...IDENTITE, role: true },
    });
    if (!enfant || enfant.role !== 'ELEVE') {
      throw erreurMetier(
        NotFoundException,
        ERROR_REASON.CODE_LIAISON_INCONNU,
        'Code de liaison introuvable : vérifiez-le auprès de votre enfant (format ABC-1234).',
      );
    }
    const deja = await this.prisma.lienParent.findUnique({
      where: { parentId_enfantId: { parentId, enfantId: enfant.id } },
    });
    if (deja) {
      throw erreurMetier(
        ConflictException,
        ERROR_REASON.DEJA_LIE,
        'Cet enfant est déjà lié à votre compte.',
      );
    }
    await this.prisma.lienParent.create({ data: { parentId, enfantId: enfant.id } });
    return this.vue(enfant, null);
  }

  /** Mes enfants : solde, alerte de solde bas, et le repas du jour s'il y en a un. */
  async enfants(parentId: string) {
    const liens = await this.prisma.lienParent.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      select: { enfant: { select: IDENTITE } },
    });
    const ids = liens.map((l) => l.enfant.id);
    const repas = await this.prisma.reservation.findMany({
      where: {
        userId: { in: ids },
        date: versDate(aujourdhui()),
        statut: { not: StatutReservation.ANNULEE },
      },
      select: {
        userId: true,
        statut: true,
        servieLe: true,
        controleAllergie: true,
        creneau: { select: { heureDebut: true, heureFin: true } },
        menuItem: { select: { plat: { select: { nom: true } } } },
      },
    });
    const parEnfant = new Map(repas.map((r) => [r.userId, r]));
    return liens.map((l) => this.vue(l.enfant, parEnfant.get(l.enfant.id) ?? null));
  }

  /** Historique des transactions d'un de mes enfants. */
  async transactions(parentId: string, enfantId: string, page: number, limit: number) {
    await this.verifierLien(parentId, enfantId);
    const where = { portefeuille: { userId: enfantId } };
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { creeLe: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          montant: true,
          moyen: true,
          statut: true,
          reference: true,
          creeLe: true,
          reservation: { select: { menuItem: { select: { plat: { select: { nom: true } } } } } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return paginate(
      items.map(({ reservation, ...t }) => ({
        ...t,
        libelle:
          reservation?.menuItem.plat.nom ??
          (t.type === 'RECHARGE'
            ? `Recharge ${t.moyen?.replace('_', ' ').toLowerCase() ?? ''}`.trim()
            : t.type),
      })),
      total,
      page,
      limit,
    );
  }

  /** Seuil d'alerte de solde bas d'un enfant. */
  async reglages(parentId: string, enfantId: string, seuilAlerte: number) {
    await this.verifierLien(parentId, enfantId);
    const p = await this.prisma.portefeuille.update({
      where: { userId: enfantId },
      data: { seuilAlerte },
      select: { solde: true, seuilAlerte: true },
    });
    return { solde: p.solde, seuilAlerte: p.seuilAlerte, soldeBas: p.solde < p.seuilAlerte };
  }

  /** Le parent n'agit que sur ses propres enfants. */
  async verifierLien(parentId: string, enfantId: string) {
    const lien = await this.prisma.lienParent.findUnique({
      where: { parentId_enfantId: { parentId, enfantId } },
    });
    if (!lien) {
      throw erreurMetier(
        ForbiddenException,
        ERROR_REASON.ENFANT_NON_LIE,
        'Cet élève n’est pas lié à votre compte.',
      );
    }
  }

  private vue(
    e: Enfant,
    repas: {
      statut: StatutReservation;
      servieLe: Date | null;
      controleAllergie: boolean;
      creneau: { heureDebut: string; heureFin: string };
      menuItem: { plat: { nom: string } };
    } | null,
  ) {
    const solde = e.portefeuille?.solde ?? 0;
    const seuil = e.portefeuille?.seuilAlerte ?? 2000;
    return {
      id: e.id,
      nom: nomComplet(e),
      prenom: e.firstName,
      classe: e.classe,
      allergenes: e.allergenes,
      solde,
      seuilAlerte: seuil,
      soldeBas: solde < seuil,
      repasDuJour: repas
        ? {
            plat: repas.menuItem.plat.nom,
            creneau: `${repas.creneau.heureDebut} – ${repas.creneau.heureFin}`,
            statut: repas.statut,
            servieLe: repas.servieLe,
            allergieVerifiee: repas.controleAllergie,
          }
        : null,
      date: versJour(versDate(aujourdhui())),
    };
  }
}
