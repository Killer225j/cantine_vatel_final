import { Injectable } from '@nestjs/common';
import { StatutReservation } from '@prisma/client';
import { conflitsAllergie } from '../../common/utils/allergies.util';
import { ajouterJours, aujourdhui, versDate } from '../../common/utils/dates.util';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MenusService } from '../menus/menus.service';
import { absentsPrevus, portionsAPreparer, tauxAbsence } from './prevision';

const NON_ANNULEE = { not: StatutReservation.ANNULEE } as const;

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menus: MenusService,
  ) {}

  /** Taux d'absence sur les 4 semaines qui précèdent ce jour. */
  async tauxAbsence4Semaines(jour: string): Promise<number> {
    const periode = { gte: versDate(ajouterJours(jour, -28)), lt: versDate(jour) };
    const [servies, absents] = await Promise.all([
      this.prisma.reservation.count({ where: { date: periode, statut: StatutReservation.SERVIE } }),
      this.prisma.reservation.count({ where: { date: periode, statut: StatutReservation.ABSENT } }),
    ]);
    return tauxAbsence(servies, absents);
  }

  /** Le tableau de bord d'un jour. */
  async jour(jour = aujourdhui()) {
    const date = versDate(jour);
    const debutMois = versDate(`${jour.slice(0, 7)}-01`);
    const [reservations, semaineDerniere, taux, menu, sauvees] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { date, statut: NON_ANNULEE },
        select: {
          statut: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              allergenes: { select: { code: true, nom: true } },
            },
          },
          menuItem: {
            select: {
              plat: { select: { nom: true, allergenes: { select: { code: true, nom: true } } } },
            },
          },
          creneau: { select: { heureDebut: true, heureFin: true } },
        },
      }),
      this.prisma.reservation.count({
        where: { date: versDate(ajouterJours(jour, -7)), statut: NON_ANNULEE },
      }),
      this.tauxAbsence4Semaines(jour),
      this.prisma.menuJour.findUnique({
        where: { date },
        include: { creneaux: { orderBy: { heureDebut: 'asc' } } },
      }),
      this.prisma.reservation.findMany({
        where: {
          antiGaspi: true,
          statut: StatutReservation.SERVIE,
          date: { gte: debutMois, lte: date },
        },
        select: { menuItem: { select: { plat: { select: { poidsPortionG: true } } } } },
      }),
    ]);

    const reserves = reservations.length;
    const creneaux = menu ? await this.menus.avecPlaces(menu.creneaux) : [];
    const capacite = creneaux.reduce((s, c) => s + c.capacite, 0);
    const alertes = reservations
      .map((r) => ({
        eleve: `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim(),
        plat: r.menuItem.plat.nom,
        creneau: `${r.creneau.heureDebut} – ${r.creneau.heureFin}`,
        statut: r.statut,
        allergenes: conflitsAllergie(r.menuItem.plat.allergenes, r.user.allergenes),
      }))
      .filter((a) => a.allergenes.length);

    return {
      date: jour,
      menuPublie: menu?.publie ?? false,
      reserves,
      evolutionSemaineDerniere: reserves - semaineDerniere,
      servies: reservations.filter((r) => r.statut === StatutReservation.SERVIE).length,
      absents: reservations.filter((r) => r.statut === StatutReservation.ABSENT).length,
      tauxAbsence: Math.round(taux * 1000) / 10,
      tauxPresence: Math.round((1 - taux) * 1000) / 10,
      portionsAPreparer: portionsAPreparer(reserves, taux),
      kgSauvesMois:
        Math.round(sauvees.reduce((s, r) => s + r.menuItem.plat.poidsPortionG, 0) / 100) / 10,
      repasSauvesMois: sauvees.length,
      affluence: {
        capacite,
        reserves: creneaux.reduce((s, c) => s + c.reserves, 0),
        creneauxComplets: creneaux.filter((c) => c.complet).length,
        creneaux,
      },
      alertesAllergie: alertes,
    };
  }

  /**
   * Réservations des derniers jours de service (jusqu'à `jours`, aujourd'hui compris) : réservées,
   * servies et absentes par date. Seuls les jours qui ont eu des réservations comptent.
   */
  async reservationsParJour(jours = 7, jour = aujourdhui()) {
    const groupes = await this.prisma.reservation.groupBy({
      by: ['date', 'statut'],
      where: {
        date: { gte: versDate(ajouterJours(jour, -(jours * 2 + 4))), lte: versDate(jour) },
        statut: NON_ANNULEE,
      },
      _count: { _all: true },
    });
    const parJour = new Map<string, { reservees: number; servies: number; absents: number }>();
    for (const g of groupes) {
      const cle = g.date.toISOString().slice(0, 10);
      const ligne = parJour.get(cle) ?? { reservees: 0, servies: 0, absents: 0 };
      ligne.reservees += g._count._all;
      if (g.statut === StatutReservation.SERVIE) ligne.servies += g._count._all;
      if (g.statut === StatutReservation.ABSENT) ligne.absents += g._count._all;
      parJour.set(cle, ligne);
    }
    return [...parJour.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-jours)
      .map(([date, v]) => ({ date, ...v }));
  }

  /** Prévision anti-gaspi par plat : réservés, absents prévus, portions à préparer. */
  async prevision(jour = aujourdhui()) {
    const [menu, taux] = await Promise.all([
      this.prisma.menuJour.findUnique({
        where: { date: versDate(jour) },
        include: {
          items: {
            include: {
              plat: {
                select: {
                  nom: true,
                  categorie: true,
                  allergenes: { select: { code: true, nom: true } },
                },
              },
              _count: { select: { reservations: { where: { statut: NON_ANNULEE } } } },
            },
          },
        },
      }),
      this.tauxAbsence4Semaines(jour),
    ]);
    const plats = (menu?.items ?? [])
      .map((i) => {
        const reserves = i._count.reservations;
        return {
          menuItemId: i.id,
          plat: i.plat,
          reserves,
          absentsPrevus: absentsPrevus(reserves, taux),
          aPreparer: portionsAPreparer(reserves, taux),
          portionsPrevues: i.portionsPrevues,
        };
      })
      .sort((a, b) => b.reserves - a.reserves);
    return {
      date: jour,
      tauxAbsence: Math.round(taux * 1000) / 10,
      plats,
      total: {
        reserves: plats.reduce((s, p) => s + p.reserves, 0),
        absentsPrevus: plats.reduce((s, p) => s + p.absentsPrevus, 0),
        aPreparer: plats.reduce((s, p) => s + p.aPreparer, 0),
      },
    };
  }
}
