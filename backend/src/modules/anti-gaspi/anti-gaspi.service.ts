import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriePlat, StatutReservation } from '@prisma/client';
import { aujourdhui, versDate } from '../../common/utils/dates.util';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { STATUTS_OCCUPANT } from '../menus/menus.service';

@Injectable()
export class AntiGaspiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ouvre l'offre de fin de service : prix réduit sur les plats restants, pendant `dureeMinutes`.
   * Les élèves qui ont réservé ce jour-là sont notifiés (l'offre est faite pour écouler les
   * portions que les absents n'ont pas mangées).
   */
  async ouvrir(
    jour: string,
    dto: { reduction?: number; dureeMinutes?: number; menuItemIds?: string[] },
    maintenant = new Date(),
  ) {
    const reduction = dto.reduction ?? 50;
    const duree = dto.dureeMinutes ?? 45;
    const menu = await this.prisma.menuJour.findUnique({
      where: { date: versDate(jour) },
      include: {
        items: { include: { plat: { select: { prix: true, categorie: true, nom: true } } } },
      },
    });
    if (!menu || !menu.publie) throw new NotFoundException('Aucun menu publié pour ce jour.');

    const cibles = menu.items.filter((i) =>
      dto.menuItemIds?.length
        ? dto.menuItemIds.includes(i.id)
        : i.plat.categorie === CategoriePlat.PLAT,
    );
    if (!cibles.length) throw new BadRequestException('Aucun plat à proposer en offre anti-gaspi.');

    const jusqua = new Date(maintenant.getTime() + duree * 60_000);
    await this.prisma.$transaction([
      ...cibles.map((i) =>
        this.prisma.menuItem.update({
          where: { id: i.id },
          data: {
            prixAntiGaspi: Math.round((i.plat.prix * (100 - reduction)) / 100),
            antiGaspiJusqua: jusqua,
          },
        }),
      ),
    ]);

    const presents = await this.prisma.reservation.findMany({
      where: { date: versDate(jour), statut: { in: STATUTS_OCCUPANT } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const heure = jusqua.toISOString().slice(11, 16).replace(':', 'h');
    await this.prisma.notification.createMany({
      data: presents.map((p) => ({
        userId: p.userId,
        type: 'ANTI_GASPI',
        titre: `Offre −${reduction} % jusqu’à ${heure}`,
        corps: `Il reste des plats à prix réduit : ${cibles.map((c) => c.plat.nom).join(', ')}.`,
      })),
    });
    return {
      date: jour,
      reduction,
      jusqua,
      plats: cibles.length,
      elevesNotifies: presents.length,
    };
  }

  /** Clôt l'offre : elle n'est plus proposée, sans toucher aux réservations déjà faites. */
  async clore(jour: string, maintenant = new Date()) {
    const r = await this.prisma.menuItem.updateMany({
      where: { menuJour: { date: versDate(jour) }, antiGaspiJusqua: { gt: maintenant } },
      data: { antiGaspiJusqua: maintenant },
    });
    return { date: jour, offresClosesCount: r.count };
  }

  /** Offres en cours aujourd'hui, avec les portions qu'il reste à écouler. */
  async offres(maintenant = new Date()) {
    const jour = aujourdhui(maintenant);
    const items = await this.prisma.menuItem.findMany({
      where: {
        menuJour: { date: versDate(jour), publie: true },
        prixAntiGaspi: { not: null },
        antiGaspiJusqua: { gt: maintenant },
      },
      select: {
        id: true,
        portionsPrevues: true,
        prixAntiGaspi: true,
        antiGaspiJusqua: true,
        plat: { select: { id: true, nom: true, photoUrl: true, prix: true } },
        reservations: {
          where: { statut: { not: StatutReservation.ANNULEE } },
          select: { id: true },
        },
      },
    });
    return items.map(({ reservations, plat, ...i }) => ({
      menuItemId: i.id,
      plat,
      prix: plat.prix,
      prixAntiGaspi: i.prixAntiGaspi,
      jusqua: i.antiGaspiJusqua,
      portionsRestantes:
        i.portionsPrevues === null ? null : Math.max(0, i.portionsPrevues - reservations.length),
    }));
  }
}
