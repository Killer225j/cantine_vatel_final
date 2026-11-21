import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, StatutReservation } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { AllergeneVue, conflitsAllergie } from '../../common/utils/allergies.util';
import {
  ajouterJours,
  aujourdhui,
  joursOuvres,
  lundiDe,
  versDate,
  versJour,
} from '../../common/utils/dates.util';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PlatsService } from '../plats/plats.service';
import { ComposerMenuDto, CRENEAUX_PAR_DEFAUT, DefinirCreneauxDto } from './menus.dto';

/** Statuts qui occupent une place dans un créneau. */
export const STATUTS_OCCUPANT: StatutReservation[] = [
  StatutReservation.CONFIRMEE,
  StatutReservation.SERVIE,
];

const INCLUSION_MENU = {
  items: {
    include: { plat: { include: { allergenes: { select: { code: true, nom: true } } } } },
    orderBy: { plat: { categorie: 'asc' } },
  },
  creneaux: { orderBy: { heureDebut: 'asc' } },
} as const;

const estVisiteur = (user: JwtPayload) => user.role === Role.ELEVE || user.role === Role.PARENT;

type ItemMenu = Prisma.MenuItemGetPayload<{ include: typeof INCLUSION_MENU.items.include }>;
type Notes = Map<string, { noteMoyenne: number | null; nbAvis: number }>;

/** Un plat du menu, vu par l'élève : note moyenne et conflit éventuel avec ses allergies. */
function vueItem(i: ItemMenu, allergies: AllergeneVue[], notes: Notes) {
  const conflits = conflitsAllergie(i.plat.allergenes, allergies);
  return {
    id: i.id,
    portionsPrevues: i.portionsPrevues,
    prixAntiGaspi: i.prixAntiGaspi,
    antiGaspiJusqua: i.antiGaspiJusqua,
    plat: { ...i.plat, ...(notes.get(i.platId) ?? { noteMoyenne: null, nbAvis: 0 }) },
    incompatible: conflits.length > 0,
    conflits,
  };
}

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plats: PlatsService,
  ) {}

  /**
   * Les cinq jours de la semaine (plus le samedi ou le dimanche s'ils ont un menu). Élèves et
   * parents ne voient que les menus publiés, et chaque plat porte `incompatible` + `conflits`
   * selon les allergies de l'élève (ou de l'enfant).
   */
  async semaine(user: JwtPayload, debut?: string, enfantId?: string) {
    const lundi = lundiDe(debut ?? aujourdhui());
    const semaine = [...joursOuvres(lundi), ajouterJours(lundi, 5), ajouterJours(lundi, 6)];
    const visiteur = estVisiteur(user);

    const [menus, allergies] = await Promise.all([
      this.prisma.menuJour.findMany({
        where: { date: { in: semaine.map(versDate) }, ...(visiteur ? { publie: true } : {}) },
        include: INCLUSION_MENU,
      }),
      this.allergiesDe(user, enfantId),
    ]);
    const notes = await this.plats.notesMoyennes(
      menus.flatMap((m) => m.items.map((i) => i.platId)),
    );
    const parJour = new Map(menus.map((m) => [versJour(m.date), m]));
    const jours = semaine.filter((jour, i) => i < 5 || parJour.has(jour));

    return {
      lundi,
      allergies,
      jours: jours.map((jour) => {
        const menu = parJour.get(jour);
        return {
          date: jour,
          publie: menu?.publie ?? false,
          menuId: menu?.id ?? null,
          items: (menu?.items ?? []).map((i) => vueItem(i, allergies, notes)),
        };
      }),
    };
  }

  /** Le menu d'un jour : plats (avec contrôle des allergies) et créneaux avec places restantes. */
  async jour(user: JwtPayload, jour: string, enfantId?: string) {
    const [menu, allergies] = await Promise.all([
      this.prisma.menuJour.findUnique({ where: { date: versDate(jour) }, include: INCLUSION_MENU }),
      this.allergiesDe(user, enfantId),
    ]);
    if (!menu || (estVisiteur(user) && !menu.publie))
      throw new NotFoundException('Aucun menu publié pour ce jour.');
    const notes = await this.plats.notesMoyennes(menu.items.map((i) => i.platId));
    return {
      ...menu,
      date: versJour(menu.date),
      allergies,
      items: menu.items.map((i) => vueItem(i, allergies, notes)),
      creneaux: await this.avecPlaces(menu.creneaux),
    };
  }

  async creneaux(user: JwtPayload, jour: string) {
    const menu = await this.prisma.menuJour.findUnique({
      where: { date: versDate(jour) },
      include: { creneaux: { orderBy: { heureDebut: 'asc' } } },
    });
    if (!menu || (estVisiteur(user) && !menu.publie))
      throw new NotFoundException('Aucun menu publié pour ce jour.');
    return this.avecPlaces(menu.creneaux);
  }

  /** Remplace les plats du jour (crée le menu en brouillon et ses créneaux par défaut s'il n'existe pas). */
  async composer(jour: string, dto: ComposerMenuDto) {
    const ids = dto.items.map((i) => i.platId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Un plat apparaît deux fois dans le menu.');
    const plats = await this.prisma.plat.findMany({
      where: { id: { in: ids }, actif: true },
      select: { id: true },
    });
    if (plats.length !== ids.length)
      throw new NotFoundException('Plat introuvable ou archivé dans la liste.');

    const date = versDate(jour);
    await this.prisma.$transaction(async (tx) => {
      const menu = await tx.menuJour.upsert({
        where: { date },
        create: { date, creneaux: { create: CRENEAUX_PAR_DEFAUT } },
        update: {},
      });
      // Un plat déjà réservé ne peut pas disparaître du menu : on ne retire que les autres.
      await tx.menuItem.deleteMany({
        where: { menuJourId: menu.id, platId: { notIn: ids }, reservations: { none: {} } },
      });
      for (const item of dto.items) {
        await tx.menuItem.upsert({
          where: { menuJourId_platId: { menuJourId: menu.id, platId: item.platId } },
          create: {
            menuJourId: menu.id,
            platId: item.platId,
            portionsPrevues: item.portionsPrevues ?? 0,
          },
          update: {
            ...(item.portionsPrevues !== undefined
              ? { portionsPrevues: item.portionsPrevues }
              : {}),
          },
        });
      }
    });
    return this.jour({ sub: '', email: '', role: Role.ADMIN }, jour);
  }

  async publier(jour: string, publie = true) {
    const menu = await this.prisma.menuJour.findUnique({
      where: { date: versDate(jour) },
      include: { _count: { select: { items: true } } },
    });
    if (!menu) throw new NotFoundException('Aucun menu pour ce jour : composez-le d’abord.');
    if (publie && menu._count.items === 0)
      throw new BadRequestException('Un menu vide ne peut pas être publié.');
    await this.prisma.menuJour.update({ where: { id: menu.id }, data: { publie } });
    return { date: jour, publie };
  }

  /** Remplace les créneaux d'un jour, tant qu'aucun n'a de réservation. */
  async definirCreneaux(jour: string, dto: DefinirCreneauxDto) {
    const menu = await this.prisma.menuJour.findUnique({ where: { date: versDate(jour) } });
    if (!menu) throw new NotFoundException('Aucun menu pour ce jour : composez-le d’abord.');
    const reserves = await this.prisma.reservation.count({
      where: { creneau: { menuJourId: menu.id } },
    });
    if (reserves > 0)
      throw new BadRequestException(
        'Des réservations existent déjà : les créneaux ne peuvent plus changer.',
      );
    await this.prisma.$transaction([
      this.prisma.creneau.deleteMany({ where: { menuJourId: menu.id } }),
      this.prisma.creneau.createMany({
        data: dto.creneaux.map((c) => ({ ...c, menuJourId: menu.id })),
      }),
    ]);
    return this.creneaux({ sub: '', email: '', role: Role.ADMIN }, jour);
  }

  /** Ajoute à chaque créneau : réservés, places restantes, taux de remplissage, complet. */
  async avecPlaces<T extends { id: string; capacite: number }>(creneaux: T[]) {
    const comptes = await this.prisma.reservation.groupBy({
      by: ['creneauId'],
      where: { creneauId: { in: creneaux.map((c) => c.id) }, statut: { in: STATUTS_OCCUPANT } },
      _count: { _all: true },
    });
    const parCreneau = new Map(comptes.map((c) => [c.creneauId, c._count._all]));
    return creneaux.map((c) => {
      const reserves = parCreneau.get(c.id) ?? 0;
      return {
        ...c,
        reserves,
        placesRestantes: Math.max(0, c.capacite - reserves),
        remplissage: c.capacite ? Math.round((reserves / c.capacite) * 100) : 0,
        complet: reserves >= c.capacite,
      };
    });
  }

  /** Allergies à vérifier : celles de l'élève, ou de l'enfant d'un parent. */
  private async allergiesDe(user: JwtPayload, enfantId?: string) {
    let eleveId: string | null = null;
    if (user.role === Role.ELEVE) eleveId = user.sub;
    if (user.role === Role.PARENT && enfantId) {
      const lien = await this.prisma.lienParent.findUnique({
        where: { parentId_enfantId: { parentId: user.sub, enfantId } },
      });
      if (!lien) throw new ForbiddenException('Cet élève n’est pas lié à votre compte.');
      eleveId = enfantId;
    }
    if (!eleveId) return [];
    const eleve = await this.prisma.user.findUnique({
      where: { id: eleveId },
      select: { allergenes: { select: { code: true, nom: true } } },
    });
    return eleve?.allergenes ?? [];
  }
}
