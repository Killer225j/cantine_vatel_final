import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { toUniqueConflict } from '../../common/errors/unique-conflict';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreerPlatDto, ListerPlatsDto, ModifierPlatDto } from './plats.dto';

const AVEC_ALLERGENES = { allergenes: { select: { code: true, nom: true } } } as const;

/** « Attiéké poisson braisé » → « attieke-poisson-braise ». */
export function slugifier(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class PlatsService {
  constructor(private readonly prisma: PrismaService) {}

  async lister(dto: ListerPlatsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where: Prisma.PlatWhereInput = {
      ...(dto.inclureArchives ? {} : { actif: true }),
      ...(dto.categorie ? { categorie: dto.categorie } : {}),
      ...(dto.q ? { nom: { contains: dto.q, mode: 'insensitive' } } : {}),
      ...(dto.allergene ? { allergenes: { some: { code: dto.allergene } } } : {}),
    };
    const [plats, total] = await Promise.all([
      this.prisma.plat.findMany({
        where,
        include: AVEC_ALLERGENES,
        orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.plat.count({ where }),
    ]);
    const [notes, servis] = await Promise.all([
      this.notesMoyennes(plats.map((p) => p.id)),
      this.servisDuMois(plats.map((p) => p.id)),
    ]);
    return paginate(
      plats.map((p) => ({
        ...p,
        ...(notes.get(p.id) ?? { noteMoyenne: null, nbAvis: 0 }),
        servisMois: servis.get(p.id) ?? 0,
      })),
      total,
      page,
      limit,
    );
  }

  /** Nombre de repas servis depuis le début du mois, par plat. */
  async servisDuMois(ids: string[], maintenant = new Date()): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const debutMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
    const groupes = await this.prisma.reservation.groupBy({
      by: ['menuItemId'],
      where: { statut: 'SERVIE', date: { gte: debutMois }, menuItem: { platId: { in: ids } } },
      _count: { _all: true },
    });
    const items = await this.prisma.menuItem.findMany({
      where: { id: { in: groupes.map((g) => g.menuItemId) } },
      select: { id: true, platId: true },
    });
    const platDe = new Map(items.map((i) => [i.id, i.platId]));
    const total = new Map<string, number>();
    for (const g of groupes) {
      const platId = platDe.get(g.menuItemId);
      if (platId) total.set(platId, (total.get(platId) ?? 0) + g._count._all);
    }
    return total;
  }

  async detail(id: string) {
    const plat = await this.prisma.plat.findUnique({ where: { id }, include: AVEC_ALLERGENES });
    if (!plat) throw new NotFoundException('Plat introuvable.');
    const [notes, avis] = await Promise.all([
      this.notesMoyennes([id]),
      this.prisma.note.findMany({
        where: { platId: id },
        orderBy: { creeLe: 'desc' },
        take: 5,
        select: {
          etoiles: true,
          commentaire: true,
          creeLe: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    return {
      ...plat,
      ...(notes.get(id) ?? { noteMoyenne: null, nbAvis: 0 }),
      // Avis anonymisés pour les autres élèves : prénom + initiale.
      derniersAvis: avis.map((a) => ({
        auteur: `${a.user.firstName ?? 'Élève'} ${a.user.lastName?.charAt(0) ?? ''}.`.trim(),
        etoiles: a.etoiles,
        commentaire: a.commentaire,
        creeLe: a.creeLe,
      })),
    };
  }

  async creer(dto: CreerPlatDto) {
    const { allergenes, slug, ...donnees } = dto;
    try {
      return await this.prisma.plat.create({
        data: {
          ...donnees,
          slug: slug ?? slugifier(dto.nom),
          allergenes: { connect: await this.idsAllergenes(allergenes ?? []) },
        },
        include: AVEC_ALLERGENES,
      });
    } catch (err) {
      throw toUniqueConflict(err) ?? err;
    }
  }

  async modifier(id: string, dto: ModifierPlatDto) {
    await this.existe(id);
    const { allergenes, ...donnees } = dto;
    try {
      return await this.prisma.plat.update({
        where: { id },
        data: {
          ...donnees,
          ...(allergenes ? { allergenes: { set: await this.idsAllergenes(allergenes) } } : {}),
        },
        include: AVEC_ALLERGENES,
      });
    } catch (err) {
      throw toUniqueConflict(err) ?? err;
    }
  }

  /** Archive (actif = false) : les menus et réservations passés gardent leur plat. */
  async archiver(id: string) {
    await this.existe(id);
    return this.prisma.plat.update({
      where: { id },
      data: { actif: false },
      include: AVEC_ALLERGENES,
    });
  }

  /** Note moyenne (une décimale) et nombre d'avis, par plat. */
  async notesMoyennes(
    ids: string[],
  ): Promise<Map<string, { noteMoyenne: number | null; nbAvis: number }>> {
    if (!ids.length) return new Map();
    const groupes = await this.prisma.note.groupBy({
      by: ['platId'],
      where: { platId: { in: ids } },
      _avg: { etoiles: true },
      _count: { _all: true },
    });
    return new Map(
      groupes.map((g) => [
        g.platId,
        {
          noteMoyenne: g._avg.etoiles === null ? null : Math.round(g._avg.etoiles * 10) / 10,
          nbAvis: g._count._all,
        },
      ]),
    );
  }

  private async existe(id: string) {
    const plat = await this.prisma.plat.findUnique({ where: { id }, select: { id: true } });
    if (!plat) throw new NotFoundException('Plat introuvable.');
  }

  private async idsAllergenes(codes: string[]) {
    if (!codes.length) return [];
    const trouves = await this.prisma.allergene.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const inconnus = codes.filter((c) => !trouves.some((a) => a.code === c));
    if (inconnus.length) throw new NotFoundException(`Allergène inconnu : ${inconnus.join(', ')}`);
    return trouves.map((a) => ({ id: a.id }));
  }
}
