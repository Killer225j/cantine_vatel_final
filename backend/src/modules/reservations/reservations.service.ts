import { lirePreferences } from '../notifications/preferences.dto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatutReservation, TypeTransaction } from '@prisma/client';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { AllergeneVue, conflitsAllergie } from '../../common/utils/allergies.util';
import { aujourdhui, versDate, versJour } from '../../common/utils/dates.util';
import {
  PREFIXE_CODE_RESERVATION,
  genererCodeVerification,
  normaliserCodeVerification,
} from '../../shared/codes/code-verification';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { STATUTS_OCCUPANT } from '../menus/menus.service';
import { ListerReservationsDto, ReserverDto } from './reservations.dto';

/** Heure limite d'annulation, le jour du repas (heure d'Abidjan = UTC). */
export const HEURE_LIMITE_ANNULATION = 10;

/** Tout ce qu'il faut pour afficher une réservation, côté élève comme côté comptoir. */
const DETAIL = {
  menuItem: {
    select: {
      id: true,
      plat: {
        select: {
          id: true,
          nom: true,
          photoUrl: true,
          categorie: true,
          poidsPortionG: true,
          allergenes: { select: { code: true, nom: true } },
        },
      },
    },
  },
  creneau: { select: { id: true, heureDebut: true, heureFin: true } },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classe: true,
      allergenes: { select: { code: true, nom: true } },
    },
  },
  servieePar: { select: { firstName: true, lastName: true } },
  note: { select: { etoiles: true } },
} satisfies Prisma.ReservationInclude;

type ReservationDetail = Prisma.ReservationGetPayload<{ include: typeof DETAIL }>;

function erreur<T extends new (body: object) => Error>(
  Type: T,
  reason: string,
  message: string,
  extra = {},
) {
  return new Type({ message, reason, ...extra });
}

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Réserve un plat sur un créneau, en une seule transaction Serializable : menu publié et date à
   * venir, capacité du créneau, une réservation active par jour, solde suffisant, débit et code
   * RV-… . Deux élèves qui prennent la dernière place en même temps : l'un des deux est rejoué et
   * reçoit « créneau complet ».
   */
  async reserver(eleveId: string, dto: ReserverDto, maintenant = new Date()) {
    const resultat = await this.avecRejeu(() =>
      this.prisma.$transaction(
        async (tx) => {
          const item = await tx.menuItem.findUnique({
            where: { id: dto.menuItemId },
            include: { menuJour: true, plat: true },
          });
          if (!item || !item.plat.actif)
            throw new NotFoundException('Plat introuvable dans le menu.');
          if (!item.menuJour.publie) {
            throw erreur(
              BadRequestException,
              ERROR_REASON.MENU_NON_PUBLIE,
              'Ce menu n’est pas encore publié.',
            );
          }
          const jour = versJour(item.menuJour.date);
          if (jour < aujourdhui(maintenant)) {
            throw erreur(BadRequestException, ERROR_REASON.DATE_PASSEE, 'Ce repas est passé.');
          }

          const creneau = await tx.creneau.findUnique({ where: { id: dto.creneauId } });
          if (!creneau || creneau.menuJourId !== item.menuJourId) {
            throw new NotFoundException('Créneau introuvable pour ce jour.');
          }
          const occupes = await tx.reservation.count({
            where: { creneauId: creneau.id, statut: { in: STATUTS_OCCUPANT } },
          });
          if (occupes >= creneau.capacite) {
            throw erreur(
              ConflictException,
              ERROR_REASON.CRENEAU_COMPLET,
              'Ce créneau est complet : choisissez-en un autre.',
            );
          }

          const existante = await tx.reservation.findFirst({
            where: {
              userId: eleveId,
              date: item.menuJour.date,
              statut: { not: StatutReservation.ANNULEE },
            },
            select: { id: true },
          });
          if (existante) {
            throw erreur(
              ConflictException,
              ERROR_REASON.DEJA_RESERVE,
              'Vous avez déjà un repas réservé ce jour-là.',
            );
          }

          let prix = item.plat.prix;
          if (dto.antiGaspi) {
            const offreActive =
              item.prixAntiGaspi !== null &&
              (!item.antiGaspiJusqua || item.antiGaspiJusqua > maintenant);
            if (!offreActive)
              throw new BadRequestException('Aucune offre anti-gaspi en cours sur ce plat.');
            prix = item.prixAntiGaspi as number;
          }

          const portefeuille = await tx.portefeuille.findUnique({ where: { userId: eleveId } });
          if (!portefeuille || portefeuille.solde < prix) {
            throw erreur(
              BadRequestException,
              ERROR_REASON.SOLDE_INSUFFISANT,
              'Solde insuffisant : rechargez votre compte.',
              {
                solde: portefeuille?.solde ?? 0,
                prix,
              },
            );
          }

          const reservation = await tx.reservation.create({
            data: {
              code: genererCodeVerification(PREFIXE_CODE_RESERVATION),
              userId: eleveId,
              menuItemId: item.id,
              creneauId: creneau.id,
              date: item.menuJour.date,
              prix,
              antiGaspi: Boolean(dto.antiGaspi),
            },
          });
          const soldeApres = portefeuille.solde - prix;
          await tx.portefeuille.update({
            where: { id: portefeuille.id },
            data: { solde: soldeApres },
          });
          await tx.transaction.create({
            data: {
              portefeuilleId: portefeuille.id,
              type: TypeTransaction.REPAS,
              montant: -prix,
              reservationId: reservation.id,
            },
          });

          if (
            soldeApres < portefeuille.seuilAlerte &&
            portefeuille.solde >= portefeuille.seuilAlerte
          ) {
            await this.alerterSoldeBas(tx, eleveId, soldeApres, portefeuille.seuilAlerte);
          }
          return { id: reservation.id, soldeApres };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    const reservation = await this.charger(resultat.id);
    return { ...this.vue(reservation), soldeApres: resultat.soldeApres };
  }

  /** Mes réservations : à venir (aujourd'hui compris) puis historique. */
  async miennes(eleveId: string, maintenant = new Date()) {
    const toutes = await this.prisma.reservation.findMany({
      where: { userId: eleveId },
      include: DETAIL,
      orderBy: [{ date: 'desc' }, { creeLe: 'desc' }],
      take: 60,
    });
    const jour = aujourdhui(maintenant);
    const vues = toutes.map((r) => this.vue(r));
    return {
      aVenir: vues
        .filter((r) => r.date >= jour && r.statut === StatutReservation.CONFIRMEE)
        .reverse(),
      historique: vues.filter((r) => !(r.date >= jour && r.statut === StatutReservation.CONFIRMEE)),
    };
  }

  /** Annuler : seulement une réservation confirmée, avant 10h le jour du repas. Remboursement immédiat. */
  async annuler(eleveId: string, id: string, maintenant = new Date()) {
    await this.prisma.$transaction(
      async (tx) => {
        const r = await tx.reservation.findUnique({ where: { id } });
        if (!r || r.userId !== eleveId) throw new NotFoundException('Réservation introuvable.');
        if (r.statut !== StatutReservation.CONFIRMEE) {
          throw new BadRequestException('Seule une réservation confirmée peut être annulée.');
        }
        const jour = versJour(r.date);
        const limite = new Date(
          `${jour}T${String(HEURE_LIMITE_ANNULATION).padStart(2, '0')}:00:00.000Z`,
        );
        if (maintenant >= limite) {
          throw erreur(
            BadRequestException,
            ERROR_REASON.ANNULATION_TROP_TARD,
            `L’annulation n’est possible que jusqu’à ${HEURE_LIMITE_ANNULATION}h le jour du repas.`,
          );
        }
        const portefeuille = await tx.portefeuille.findUniqueOrThrow({
          where: { userId: eleveId },
        });
        await tx.reservation.update({ where: { id }, data: { statut: StatutReservation.ANNULEE } });
        await tx.portefeuille.update({
          where: { id: portefeuille.id },
          data: { solde: { increment: r.prix } },
        });
        await tx.transaction.create({
          data: {
            portefeuilleId: portefeuille.id,
            type: TypeTransaction.REMBOURSEMENT,
            montant: r.prix,
            reservationId: id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.vue(await this.charger(id));
  }

  /** Commandes d'un jour (défaut : aujourd'hui), avec compteurs et alertes allergie. */
  async lister(dto: ListerReservationsDto, maintenant = new Date()) {
    const jour = dto.date ?? aujourdhui(maintenant);
    const toutes = await this.prisma.reservation.findMany({
      where: { date: versDate(jour) },
      include: DETAIL,
      orderBy: [{ creneau: { heureDebut: 'asc' } }, { creeLe: 'asc' }],
    });
    const vues = toutes.map((r) => this.vue(r));
    const compte = (s: StatutReservation) => vues.filter((r) => r.statut === s).length;
    const q = dto.q?.trim().toLowerCase();
    const filtrees = vues.filter(
      (r) =>
        (!dto.creneauId || r.creneau.id === dto.creneauId) &&
        (!dto.statut || r.statut === dto.statut) &&
        (!q || r.code.toLowerCase().includes(q) || r.eleve.nom.toLowerCase().includes(q)),
    );
    return {
      date: jour,
      compteurs: {
        total: vues.filter((r) => r.statut !== StatutReservation.ANNULEE).length,
        servies: compte(StatutReservation.SERVIE),
        aServir: compte(StatutReservation.CONFIRMEE),
        absents: compte(StatutReservation.ABSENT),
        annulees: compte(StatutReservation.ANNULEE),
        aRisqueAllergique: vues.filter(
          (r) => r.alertesAllergie.length && r.statut !== StatutReservation.ANNULEE,
        ).length,
      },
      reservations: filtrees,
    };
  }

  /**
   * Lecture d'un code au comptoir. Ne sert pas : renvoie l'élève, le plat, le créneau et les
   * alertes allergie. 404 code inconnu, 400 pas pour aujourd'hui ou annulée, 409 déjà servie.
   */
  async scanner(brut: string, maintenant = new Date()) {
    const code = normaliserCodeVerification(brut, PREFIXE_CODE_RESERVATION);
    const r = code
      ? await this.prisma.reservation.findUnique({ where: { code }, include: DETAIL })
      : null;
    if (!r) {
      throw erreur(
        NotFoundException,
        ERROR_REASON.CODE_INCONNU,
        'Code introuvable : vérifiez la saisie (format RV-XXXX-XXXX-XXXX).',
      );
    }
    const vue = this.vue(r);
    if (r.statut === StatutReservation.SERVIE) {
      throw erreur(
        ConflictException,
        ERROR_REASON.DEJA_SERVIE,
        'Code déjà utilisé : ce repas a déjà été servi.',
        {
          reservation: vue,
        },
      );
    }
    if (r.statut === StatutReservation.ANNULEE) {
      throw erreur(
        BadRequestException,
        ERROR_REASON.RESERVATION_ANNULEE,
        'Cette réservation a été annulée.',
        {
          reservation: vue,
        },
      );
    }
    if (vue.date !== aujourdhui(maintenant)) {
      throw erreur(
        BadRequestException,
        ERROR_REASON.PAS_AUJOURDHUI,
        `Cette réservation est pour le ${vue.date}.`,
        {
          reservation: vue,
        },
      );
    }
    return vue;
  }

  /** Servir. Si le plat contient un allergène de l'élève, `controleAllergie: true` est obligatoire. */
  async servir(id: string, serveurId: string, controleAllergie = false, maintenant = new Date()) {
    const r = await this.prisma.reservation.findUnique({ where: { id }, include: DETAIL });
    if (!r) throw new NotFoundException('Réservation introuvable.');
    if (r.statut === StatutReservation.SERVIE) {
      throw erreur(ConflictException, ERROR_REASON.DEJA_SERVIE, 'Ce repas a déjà été servi.');
    }
    if (r.statut !== StatutReservation.CONFIRMEE) {
      throw new BadRequestException('Seule une réservation confirmée peut être servie.');
    }
    if (versJour(r.date) !== aujourdhui(maintenant)) {
      throw erreur(
        BadRequestException,
        ERROR_REASON.PAS_AUJOURDHUI,
        'Cette réservation n’est pas pour aujourd’hui.',
      );
    }
    const alertes = this.vue(r).alertesAllergie;
    if (alertes.length && !controleAllergie) {
      throw erreur(
        BadRequestException,
        ERROR_REASON.CONTROLE_ALLERGIE_REQUIS,
        `Allergie ${alertes.map((a) => a.nom.toLowerCase()).join(', ')} : confirmez le contrôle avant de servir.`,
        { alertesAllergie: alertes },
      );
    }
    // updateMany avec condition de statut : deux comptoirs qui servent en même temps, un seul gagne.
    const { count } = await this.prisma.reservation.updateMany({
      where: { id, statut: StatutReservation.CONFIRMEE },
      data: {
        statut: StatutReservation.SERVIE,
        servieLe: maintenant,
        servieParId: serveurId,
        controleAllergie: alertes.length > 0,
      },
    });
    if (count === 0)
      throw erreur(ConflictException, ERROR_REASON.DEJA_SERVIE, 'Ce repas vient d’être servi.');
    return this.vue(await this.charger(id));
  }

  /** Une réservation de l'élève (pour noter, afficher le QR…). */
  async uneDeMoi(eleveId: string, id: string) {
    const r = await this.charger(id);
    if (r.userId !== eleveId) throw new ForbiddenException('Cette réservation n’est pas la vôtre.');
    return this.vue(r);
  }

  /** Donne un avis sur un repas servi : une fois, par l'élève qui l'a mangé. */
  async noter(
    eleveId: string,
    id: string,
    dto: { etoiles: number; etiquettes?: string[]; commentaire?: string },
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        userId: true,
        statut: true,
        menuItem: { select: { platId: true } },
        note: { select: { id: true } },
      },
    });
    if (!r) throw new NotFoundException('Réservation introuvable.');
    if (r.userId !== eleveId) throw new ForbiddenException('Cette réservation n’est pas la vôtre.');
    if (r.statut !== StatutReservation.SERVIE) {
      throw erreur(
        BadRequestException,
        ERROR_REASON.PAS_SERVIE,
        'Vous pourrez donner votre avis une fois le repas servi.',
      );
    }
    if (r.note) {
      throw erreur(ConflictException, ERROR_REASON.DEJA_NOTE, 'Vous avez déjà noté ce repas.');
    }
    const texte = [dto.etiquettes?.join(', '), dto.commentaire?.trim()].filter(Boolean).join(' — ');
    const note = await this.prisma.note.create({
      data: {
        userId: eleveId,
        platId: r.menuItem.platId,
        reservationId: id,
        etoiles: dto.etoiles,
        commentaire: texte || null,
      },
      select: { etoiles: true, commentaire: true },
    });
    return note;
  }

  vue(r: ReservationDetail) {
    const plat = r.menuItem.plat;
    const alertesAllergie: AllergeneVue[] = conflitsAllergie(plat.allergenes, r.user.allergenes);
    const prenom = r.user.firstName ?? '';
    const nom = r.user.lastName ?? '';
    return {
      id: r.id,
      code: r.code,
      date: versJour(r.date),
      statut: r.statut,
      prix: r.prix,
      antiGaspi: r.antiGaspi,
      creeLe: r.creeLe,
      servieLe: r.servieLe,
      servieePar: r.servieePar
        ? `${r.servieePar.firstName ?? ''} ${r.servieePar.lastName ?? ''}`.trim()
        : null,
      controleAllergie: r.controleAllergie,
      note: r.note?.etoiles ?? null,
      plat,
      creneau: r.creneau,
      eleve: {
        id: r.user.id,
        nom: `${prenom} ${nom}`.trim(),
        initiales: `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase(),
        classe: r.user.classe,
        allergenes: r.user.allergenes,
      },
      alertesAllergie,
    };
  }

  private async charger(id: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id }, include: DETAIL });
    if (!r) throw new NotFoundException('Réservation introuvable.');
    return r;
  }

  /** Notifie l'élève et ses parents quand le solde passe sous le seuil. */
  private async alerterSoldeBas(
    tx: Prisma.TransactionClient,
    eleveId: string,
    solde: number,
    seuil: number,
  ) {
    const [eleve, liens] = await Promise.all([
      tx.user.findUnique({ where: { id: eleveId }, select: { firstName: true } }),
      tx.lienParent.findMany({ where: { enfantId: eleveId }, select: { parentId: true } }),
    ]);
    const montant = `${solde.toLocaleString('fr-FR')} FCFA`;
    // Chacun peut désactiver l'alerte « solde bas » dans ses préférences.
    const veulent = new Set(
      (
        await tx.user.findMany({
          where: { id: { in: [eleveId, ...liens.map((l) => l.parentId)] } },
          select: { id: true, preferencesNotif: true },
        })
      )
        .filter((u) => lirePreferences(u.preferencesNotif).alerteSoldeBas)
        .map((u) => u.id),
    );
    await tx.notification.createMany({
      data: [
        {
          userId: eleveId,
          type: 'SOLDE_BAS',
          titre: `Solde bas : ${montant}`,
          corps: `Votre solde est passé sous ${seuil} FCFA.`,
        },
        ...liens.map((l) => ({
          userId: l.parentId,
          type: 'SOLDE_BAS',
          titre: `Solde bas : ${montant}`,
          corps: `Il reste ${montant} à ${eleve?.firstName ?? 'votre enfant'}, sous votre seuil de ${seuil} FCFA.`,
        })),
      ].filter((n) => veulent.has(n.userId)),
    });
  }

  /** Rejoue une transaction Serializable interrompue par une écriture concurrente (P2034). */
  private async avecRejeu<T>(action: () => Promise<T>, essais = 3): Promise<T> {
    for (let i = 1; ; i++) {
      try {
        return await action();
      } catch (err) {
        const conflit = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
        if (!conflit) throw err;
        if (i >= essais) {
          throw erreur(
            ConflictException,
            ERROR_REASON.CONFLIT_CONCURRENT,
            'Beaucoup de réservations en même temps : réessayez.',
          );
        }
      }
    }
  }
}
