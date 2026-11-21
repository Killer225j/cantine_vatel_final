import { Injectable } from '@nestjs/common';
import { StatutReservation, TypeTransaction } from '@prisma/client';
import { ajouterJours, aujourdhui, lundiDe, versDate } from '../../common/utils/dates.util';
import { PrismaService } from '../../shared/prisma/prisma.service';

const un = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class RapportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Synthèse d'une période (défaut : le mois en cours) : repas servis et présence, recettes,
   * gaspillage évité, satisfaction, fréquentation par semaine, recharges par moyen, ventes par
   * catégorie et notes des plats. La période précédente, de même durée, sert de comparaison.
   */
  async synthese(debut?: string, fin?: string) {
    const jourFin = fin ?? aujourdhui();
    const jourDebut = debut ?? `${jourFin.slice(0, 7)}-01`;
    const nbJours =
      Math.round((versDate(jourFin).getTime() - versDate(jourDebut).getTime()) / 86_400_000) + 1;
    const precFin = ajouterJours(jourDebut, -1);
    const precDebut = ajouterJours(jourDebut, -nbJours);

    const periode = { gte: versDate(jourDebut), lte: versDate(jourFin) };
    const [reservations, precServies, notesPeriode, recharges, parPlat] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { date: periode, statut: { not: StatutReservation.ANNULEE } },
        select: {
          date: true,
          statut: true,
          prix: true,
          antiGaspi: true,
          menuItem: {
            select: {
              plat: { select: { id: true, nom: true, categorie: true, poidsPortionG: true } },
            },
          },
        },
      }),
      this.prisma.reservation.count({
        where: {
          date: { gte: versDate(precDebut), lte: versDate(precFin) },
          statut: StatutReservation.SERVIE,
        },
      }),
      this.prisma.note.aggregate({
        where: { creeLe: { gte: versDate(jourDebut), lt: versDate(ajouterJours(jourFin, 1)) } },
        _avg: { etoiles: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['moyen'],
        where: {
          type: TypeTransaction.RECHARGE,
          statut: 'REUSSIE',
          creeLe: { gte: versDate(jourDebut), lt: versDate(ajouterJours(jourFin, 1)) },
        },
        _sum: { montant: true },
      }),
      this.prisma.note.groupBy({
        by: ['platId'],
        _avg: { etoiles: true },
        _count: { _all: true },
      }),
    ]);

    const servies = reservations.filter((r) => r.statut === StatutReservation.SERVIE);
    const absents = reservations.filter((r) => r.statut === StatutReservation.ABSENT).length;
    const recettes = servies.reduce((s, r) => s + r.prix, 0);
    const offres = servies.filter((r) => r.antiGaspi);
    const gramme = offres.reduce((s, r) => s + (r.menuItem.plat.poidsPortionG ?? 0), 0);
    // Poids sauvés plat par plat (repas vendus à prix réduit × poids d'une portion).
    const parPlatEvite = new Map<string, { plat: string; grammes: number; repas: number }>();
    for (const r of offres) {
      const l = parPlatEvite.get(r.menuItem.plat.id) ?? {
        plat: r.menuItem.plat.nom,
        grammes: 0,
        repas: 0,
      };
      l.grammes += r.menuItem.plat.poidsPortionG ?? 0;
      l.repas += 1;
      parPlatEvite.set(r.menuItem.plat.id, l);
    }

    // Fréquentation : repas servis par semaine (lundi → dimanche).
    const parSemaine = new Map<string, number>();
    for (const r of servies) {
      const lundi = lundiDe(r.date.toISOString().slice(0, 10));
      parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + 1);
    }
    const frequentation = [...parSemaine.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([lundi, repas]) => ({ debut: lundi, fin: ajouterJours(lundi, 4), repas }));

    // Recharges par moyen de paiement.
    const totalRecharges = recharges.reduce((s, r) => s + (r._sum.montant ?? 0), 0);
    const parMoyen = recharges
      .map((r) => ({
        moyen: r.moyen,
        montant: r._sum.montant ?? 0,
        pourcentage: totalRecharges
          ? Math.round(((r._sum.montant ?? 0) / totalRecharges) * 100)
          : 0,
      }))
      .sort((a, b) => b.montant - a.montant);

    // Ventes par catégorie, plus les offres de fin de service.
    const categories = new Map<string, { ventes: number; montant: number }>();
    for (const r of servies) {
      const c = r.menuItem.plat.categorie;
      const ligne = categories.get(c) ?? { ventes: 0, montant: 0 };
      ligne.ventes += 1;
      ligne.montant += r.prix;
      categories.set(c, ligne);
    }
    const ventes = [...categories.entries()].map(([categorie, v]) => ({ categorie, ...v }));

    // Notes moyennes par plat (tous les avis).
    const plats = await this.prisma.plat.findMany({
      where: { id: { in: parPlat.map((p) => p.platId) } },
      select: { id: true, nom: true },
    });
    const nomDe = new Map(plats.map((p) => [p.id, p.nom]));
    const notesPlats = parPlat
      .map((p) => ({
        plat: nomDe.get(p.platId) ?? '—',
        note: un(p._avg.etoiles ?? 0),
        avis: p._count._all,
      }))
      .sort((a, b) => b.note - a.note || b.avis - a.avis)
      .slice(0, 8);

    return {
      periode: { debut: jourDebut, fin: jourFin, jours: nbJours },
      repasServis: {
        total: servies.length,
        presence:
          servies.length + absents ? un((servies.length / (servies.length + absents)) * 100) : 0,
        evolution: precServies ? un(((servies.length - precServies) / precServies) * 100) : null,
      },
      recettes: {
        total: recettes,
        ticketMoyen: servies.length ? Math.round(recettes / servies.length) : 0,
      },
      gaspillageEvite: {
        kg: un(gramme / 1000),
        repas: offres.length,
        offres: new Set(offres.map((r) => r.date.toISOString().slice(0, 10))).size,
        parPlat: [...parPlatEvite.values()]
          .sort((a, b) => b.grammes - a.grammes)
          .slice(0, 5)
          .map((l) => ({ plat: l.plat, kg: un(l.grammes / 1000), repas: l.repas })),
      },
      satisfaction: {
        moyenne: un(notesPeriode._avg.etoiles ?? 0),
        avis: notesPeriode._count._all,
      },
      frequentation,
      recharges: { total: totalRecharges, parMoyen },
      ventes,
      offresFinService: { ventes: offres.length, montant: offres.reduce((s, r) => s + r.prix, 0) },
      notesPlats,
    };
  }
}
