/**
 * Données de démonstration de la Cantine Vatel. Idempotent : peut être rejoué sans doublon.
 *
 *   En local  : yarn seed
 *   Sur Render: DATABASE_URL="<External Database URL>?sslmode=require" yarn seed  (depuis le poste)
 *
 * Contenu (prisma/donnees-demo.json) : allergènes, plats, menus de la semaine en cours et de la
 * suivante (+ un menu « du jour » le week-end, pour que la démo marche tous les jours), créneaux,
 * comptes de démo, ~140 élèves figurants, 4 semaines d'historique (absence ≈ 6 %, offres
 * anti-gaspi, notes, recharges) et les réservations du jour. Le compte eleve@vatel.ci reste
 * sans réservation du jour : c'est lui qui réserve en démo.
 */
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  CategoriePlat,
  MoyenPaiement,
  Prisma,
  PrismaClient,
  Role,
  StatutReservation,
  TypeTransaction,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MOT_DE_PASSE_DEMO } from '../src/common/swagger/examples';
import {
  ajouterJours,
  aujourdhui,
  joursOuvres,
  lundiDe,
  versDate,
} from '../src/common/utils/dates.util';
import {
  PREFIXE_CODE_RESERVATION,
  genererCodeVerification,
} from '../src/shared/codes/code-verification';

const prisma = new PrismaClient();
const BASE_PHOTOS = (
  process.env.PHOTOS_BASE_URL ?? 'https://cantine-vatel-backoffice.vercel.app/plats'
).replace(/\/+$/, '');
const NB_FIGURANTS = 140;

interface Donnees {
  allergenes: { code: string; nom: string }[];
  plats: {
    slug: string;
    nom: string;
    categorie: CategoriePlat;
    prix: number;
    poidsPortionG: number;
    allergenes: string[];
    vegetarien: boolean;
    photo: string;
    description: string;
  }[];
  menus: Record<string, { publie: boolean; plats: [string, number][] }> & {
    boissonsChaqueJour: string[];
  };
  creneaux: { heureDebut: string; heureFin: string; capacite: number }[];
  comptes: {
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
    phone?: string;
    classe?: string;
    allergenes?: string[];
    solde?: number;
    codeLiaison?: string;
    enfants?: string[];
  }[];
  stocks: { nom: string; unite: string; quantite: number; seuilAlerte: number }[];
}

const D: Donnees = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees-demo.json'), 'utf8'));
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

/** Hasard déterministe (mulberry32) : chaque seed produit les mêmes données. */
function hasard(graine: number) {
  let a = graine;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const alea = hasard(2026);
const choisir = <T>(liste: T[]): T => liste[Math.floor(alea() * liste.length)];

const PRENOMS = [
  'Adjoua',
  'Akissi',
  'Amani',
  'Ange',
  'Aya',
  'Brice',
  'Christelle',
  'Désiré',
  'Emmanuel',
  'Fanta',
  'Fatou',
  'Grâce',
  'Hervé',
  'Ibrahim',
  'Inès',
  'Jean',
  'Josiane',
  'Kevin',
  'Konan',
  'Kouadio',
  'Mariam',
  'Moussa',
  'Nadia',
  'Olivier',
  'Pauline',
  'Salimata',
  'Serge',
  'Seydou',
  'Yasmine',
  'Zié',
];
const NOMS = [
  'Bamba',
  'Coulibaly',
  'Diabaté',
  'Diallo',
  'Gnagne',
  'Kacou',
  'Kassi',
  'Koffi',
  'Konan',
  'Koné',
  'Kouadio',
  'Kouamé',
  'Kouassi',
  'N’Dri',
  'N’Guessan',
  'Ouattara',
  'Touré',
  'Traoré',
  'Yao',
  'Yapi',
];
const CLASSES = ['Bachelor 1', 'Bachelor 2', 'Bachelor 3', 'MBA 1', 'MBA 2'];
const sansAccent = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase();

async function main(): Promise<void> {
  const aujourdHui = aujourdhui();
  const passwordHash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 12);

  // ─── 1. Allergènes ────────────────────────────────────────────────────────
  for (const a of D.allergenes) {
    await prisma.allergene.upsert({ where: { code: a.code }, create: a, update: { nom: a.nom } });
  }
  const allergenes = new Map((await prisma.allergene.findMany()).map((a) => [a.code, a.id]));
  const ids = (codes: string[] = []) => codes.map((c) => ({ id: allergenes.get(c) as string }));

  // ─── 2. Plats ─────────────────────────────────────────────────────────────
  for (const p of D.plats) {
    const donnees = {
      nom: p.nom,
      description: p.description,
      categorie: p.categorie,
      prix: p.prix,
      poidsPortionG: p.poidsPortionG,
      vegetarien: p.vegetarien,
      photoUrl: `${BASE_PHOTOS}/${p.photo}`,
    };
    await prisma.plat.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...donnees, allergenes: { connect: ids(p.allergenes) } },
      update: { ...donnees, allergenes: { set: ids(p.allergenes) } },
    });
  }
  const plats = await prisma.plat.findMany({ include: { allergenes: { select: { code: true } } } });
  const platParSlug = new Map(plats.map((p) => [p.slug, p]));

  // ─── 3. Comptes de démo + figurants ───────────────────────────────────────
  const figurants: Donnees['comptes'] = [];
  for (let i = 1; i <= NB_FIGURANTS; i++) {
    const prenom = choisir(PRENOMS);
    const nom = choisir(NOMS);
    const r = alea();
    figurants.push({
      email: `${sansAccent(prenom)}.${sansAccent(nom)}${i}@vatel.ci`,
      role: Role.ELEVE,
      firstName: prenom,
      lastName: nom,
      classe: choisir(CLASSES),
      // ≈ 8 % allergiques à l'arachide, 4 % au poisson, 3 % au lait.
      allergenes: r < 0.08 ? ['ARACHIDES'] : r < 0.12 ? ['POISSONS'] : r < 0.15 ? ['LAIT'] : [],
      solde: 2000 + Math.round(alea() * 16) * 500,
    });
  }
  const comptes = [...D.comptes, ...figurants];
  for (const c of comptes) {
    const donnees = {
      role: c.role,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone ?? null,
      classe: c.classe ?? null,
      codeLiaison: c.codeLiaison ?? null,
    };
    await prisma.user.upsert({
      where: { email: c.email },
      create: {
        email: c.email,
        passwordHash,
        ...donnees,
        allergenes: { connect: ids(c.allergenes) },
      },
      update: { ...donnees, allergenes: { set: ids(c.allergenes) } },
    });
  }
  const users = new Map(
    (await prisma.user.findMany({ include: { allergenes: { select: { code: true } } } })).map(
      (u) => [u.email, u],
    ),
  );
  for (const c of comptes) {
    for (const enfant of c.enfants ?? []) {
      const parentId = users.get(c.email)!.id;
      const enfantId = users.get(enfant)!.id;
      await prisma.lienParent.upsert({
        where: { parentId_enfantId: { parentId, enfantId } },
        create: { parentId, enfantId },
        update: {},
      });
    }
  }
  const eleves = comptes
    .filter((c) => c.role === Role.ELEVE)
    .map((c) => ({ ...c, user: users.get(c.email)! }));

  // ─── 4. Menus et créneaux ─────────────────────────────────────────────────
  const lundi = lundiDe(aujourdHui);
  const passes = joursOuvres(lundiDe(ajouterJours(aujourdHui, -28)))
    .concat(joursOuvres(lundiDe(ajouterJours(aujourdHui, -21))))
    .concat(joursOuvres(lundiDe(ajouterJours(aujourdHui, -14))))
    .concat(joursOuvres(lundiDe(ajouterJours(aujourdHui, -7))))
    .concat(joursOuvres(lundi))
    .filter((j) => j < aujourdHui);
  const avenir = joursOuvres(lundi)
    .concat(joursOuvres(ajouterJours(lundi, 7)))
    .filter((j) => j >= aujourdHui);
  const weekEnd = !joursOuvres(lundi).includes(aujourdHui);
  // Le week-end (jour du hackathon), un menu « du jour » = celui du lundi, publié, pour la démo.
  const jourDemo = weekEnd ? [aujourdHui] : [];

  const menuDe = (jour: string) => {
    const n = (new Date(`${jour}T00:00:00Z`).getUTCDay() + 6) % 7;
    return D.menus[JOURS[Math.min(n, 4)]];
  };
  async function poserMenu(jour: string, publie: boolean) {
    const def = menuDe(jour);
    const date = versDate(jour);
    const menu = await prisma.menuJour.upsert({
      where: { date },
      create: { date, publie },
      update: { publie },
    });
    const lignes: [string, number][] = [
      ...def.plats,
      ...D.menus.boissonsChaqueJour.map((s) => [s, 80] as [string, number]),
    ];
    for (const [slug, portions] of lignes) {
      const plat = platParSlug.get(slug)!;
      await prisma.menuItem.upsert({
        where: { menuJourId_platId: { menuJourId: menu.id, platId: plat.id } },
        create: { menuJourId: menu.id, platId: plat.id, portionsPrevues: portions },
        update: {},
      });
    }
    for (const c of D.creneaux) {
      await prisma.creneau.upsert({
        where: { menuJourId_heureDebut: { menuJourId: menu.id, heureDebut: c.heureDebut } },
        create: { menuJourId: menu.id, ...c },
        update: {},
      });
    }
    return prisma.menuJour.findUniqueOrThrow({
      where: { id: menu.id },
      include: {
        items: { include: { plat: { include: { allergenes: { select: { code: true } } } } } },
        creneaux: true,
      },
    });
  }
  const menus = new Map<string, Awaited<ReturnType<typeof poserMenu>>>();
  for (const j of passes) menus.set(j, await poserMenu(j, true));
  for (const j of avenir) menus.set(j, await poserMenu(j, menuDe(j).publie));
  for (const j of jourDemo) menus.set(j, await poserMenu(j, true));

  // ─── 5. Portefeuilles ─────────────────────────────────────────────────────
  const portefeuilles = new Map<string, string>();
  for (const e of eleves) {
    const p = await prisma.portefeuille.upsert({
      where: { userId: e.user.id },
      create: { userId: e.user.id, solde: 0 },
      update: {},
    });
    portefeuilles.set(e.user.id, p.id);
  }

  // ─── 6. Historique (une seule fois) ───────────────────────────────────────
  const dejaHistorique = await prisma.reservation.count({
    where: { date: { lt: versDate(aujourdHui) } },
  });
  const moyens: MoyenPaiement[] = [
    MoyenPaiement.WAVE,
    MoyenPaiement.ORANGE_MONEY,
    MoyenPaiement.MTN_MOMO,
  ];
  const moyenAuHasard = () => {
    const r = alea();
    return r < 0.58 ? moyens[0] : r < 0.89 ? moyens[1] : moyens[2];
  };
  const reservations: Prisma.ReservationCreateManyInput[] = [];
  const transactions: Prisma.TransactionCreateManyInput[] = [];
  const notes: Prisma.NoteCreateManyInput[] = [];
  const depenses = new Map<string, number>();
  const cuisinier = users.get('cuisine@vatel.ci')!;
  const kedjenou = platParSlug.get('kedjenou-poulet')!;

  /** Un plat du jour compatible avec l'élève (catégorie PLAT). */
  function platPour(menu: Awaited<ReturnType<typeof poserMenu>>, allergiesEleve: string[]) {
    const ok = menu.items.filter(
      (i) =>
        i.plat.categorie === CategoriePlat.PLAT &&
        !i.plat.allergenes.some((a) => allergiesEleve.includes(a.code)),
    );
    return ok.length ? choisir(ok) : null;
  }

  if (dejaHistorique === 0) {
    for (const jour of passes) {
      const menu = menus.get(jour)!;
      const presents = eleves
        .filter((e) => e.email !== 'eleve@vatel.ci' || alea() < 0.8)
        .filter(() => alea() < 0.85);
      const occupation = new Map<string, number>();
      let antiGaspiDuJour = 0;
      for (const e of presents) {
        const item = platPour(menu, (e.allergenes ?? []) as string[]);
        if (!item) continue;
        const creneau = choisir(
          menu.creneaux.filter((c) => (occupation.get(c.id) ?? 0) < c.capacite),
        );
        if (!creneau) continue;
        occupation.set(creneau.id, (occupation.get(creneau.id) ?? 0) + 1);
        const absent = alea() < 0.06;
        const antiGaspi = !absent && antiGaspiDuJour < 5 && alea() < 0.05;
        if (antiGaspi) antiGaspiDuJour++;
        const prix = antiGaspi ? Math.round(item.plat.prix / 2 / 50) * 50 : item.plat.prix;
        const id = randomUUID();
        const [h, m] = creneau.heureDebut.split(':').map(Number);
        reservations.push({
          id,
          code: genererCodeVerification(PREFIXE_CODE_RESERVATION),
          userId: e.user.id,
          menuItemId: item.id,
          creneauId: creneau.id,
          date: versDate(jour),
          prix,
          antiGaspi,
          statut: absent ? StatutReservation.ABSENT : StatutReservation.SERVIE,
          creeLe: new Date(
            `${ajouterJours(jour, -1)}T18:${String(Math.floor(alea() * 60)).padStart(2, '0')}:00Z`,
          ),
          servieLe: absent
            ? null
            : new Date(
                Date.UTC(
                  +jour.slice(0, 4),
                  +jour.slice(5, 7) - 1,
                  +jour.slice(8, 10),
                  h,
                  m + Math.floor(alea() * 14),
                ),
              ),
          servieParId: absent ? null : cuisinier.id,
        });
        transactions.push({
          portefeuilleId: portefeuilles.get(e.user.id)!,
          type: TypeTransaction.REPAS,
          montant: -prix,
          reservationId: id,
          creeLe: new Date(`${ajouterJours(jour, -1)}T18:00:00Z`),
        });
        depenses.set(e.user.id, (depenses.get(e.user.id) ?? 0) + prix);
        if (!absent && alea() < 0.3) {
          const etoiles = item.plat.id === kedjenou.id ? 5 : 3 + Math.floor(alea() * 3);
          notes.push({ userId: e.user.id, platId: item.plat.id, reservationId: id, etoiles });
        }
      }
    }
  }

  // ─── 7. Réservations du jour (une seule fois) ─────────────────────────────
  const jourCourant = menus.get(aujourdHui);
  const dejaDuJour = await prisma.reservation.count({ where: { date: versDate(aujourdHui) } });
  if (jourCourant?.publie && dejaDuJour === 0) {
    const occupation = new Map<string, number>();
    const pleinCreneau = jourCourant.creneaux.find((c) => c.heureDebut === '12:15');
    const figurantsDuJour = eleves.filter((e) => e.email !== 'eleve@vatel.ci').slice(0, 150);
    for (const e of figurantsDuJour) {
      if (alea() > 0.97) continue;
      // Les élèves allergiques à l'arachide réservent parfois quand même le plat à l'arachide :
      // ce sont les « alertes allergie du jour » du tableau de bord et du comptoir.
      const arachide = jourCourant.items.find((i) =>
        i.plat.allergenes.some((a) => a.code === 'ARACHIDES'),
      );
      const item =
        (e.allergenes ?? []).includes('ARACHIDES') && arachide && alea() < 0.4
          ? arachide
          : platPour(jourCourant, (e.allergenes ?? []) as string[]);
      if (!item) continue;
      const libres = jourCourant.creneaux.filter((c) => (occupation.get(c.id) ?? 0) < c.capacite);
      const creneau =
        pleinCreneau &&
        (occupation.get(pleinCreneau.id) ?? 0) < pleinCreneau.capacite &&
        alea() < 0.4
          ? pleinCreneau
          : choisir(libres);
      if (!creneau) continue;
      occupation.set(creneau.id, (occupation.get(creneau.id) ?? 0) + 1);
      const id = randomUUID();
      reservations.push({
        id,
        code: genererCodeVerification(PREFIXE_CODE_RESERVATION),
        userId: e.user.id,
        menuItemId: item.id,
        creneauId: creneau.id,
        date: versDate(aujourdHui),
        prix: item.plat.prix,
        creeLe: new Date(`${ajouterJours(aujourdHui, -1)}T19:00:00Z`),
      });
      transactions.push({
        portefeuilleId: portefeuilles.get(e.user.id)!,
        type: TypeTransaction.REPAS,
        montant: -item.plat.prix,
        reservationId: id,
        creeLe: new Date(`${ajouterJours(aujourdHui, -1)}T19:00:00Z`),
      });
      depenses.set(e.user.id, (depenses.get(e.user.id) ?? 0) + item.plat.prix);
    }
  }

  // ─── 8. Écriture groupée + soldes cohérents ───────────────────────────────
  // Le solde final de chaque élève = solde voulu ; une recharge initiale couvre l'historique,
  // pour que solde = somme des transactions.
  if (reservations.length) {
    for (let i = 0; i < reservations.length; i += 1000) {
      await prisma.reservation.createMany({ data: reservations.slice(i, i + 1000) });
    }
    for (let i = 0; i < transactions.length; i += 1000) {
      await prisma.transaction.createMany({ data: transactions.slice(i, i + 1000) });
    }
    if (notes.length) await prisma.note.createMany({ data: notes });
  }
  for (const e of eleves) {
    const portefeuilleId = portefeuilles.get(e.user.id)!;
    const rechargees = await prisma.transaction.count({
      where: { portefeuilleId, type: TypeTransaction.RECHARGE },
    });
    if (rechargees > 0) continue;
    const voulu = e.solde ?? 3000;
    const montant = voulu + (depenses.get(e.user.id) ?? 0);
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          portefeuilleId,
          type: TypeTransaction.RECHARGE,
          montant,
          moyen: moyenAuHasard(),
          reference: `RC-${ajouterJours(aujourdHui, -30).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
          payeurId: e.user.id,
          creeLe: new Date(`${ajouterJours(aujourdHui, -30)}T09:00:00Z`),
        },
      }),
      prisma.portefeuille.update({ where: { id: portefeuilleId }, data: { solde: voulu } }),
    ]);
  }

  // ─── 9. Stocks ────────────────────────────────────────────────────────────
  for (const s of D.stocks) {
    await prisma.articleStock.upsert({
      where: { nom: s.nom },
      create: s,
      update: {},
    });
  }

  const [nbUsers, nbResa, nbMenus] = await Promise.all([
    prisma.user.count(),
    prisma.reservation.count(),
    prisma.menuJour.count(),
  ]);
  console.log(
    `Seed : ${nbUsers} comptes, ${plats.length} plats, ${nbMenus} menus, ${nbResa} réservations (mot de passe : ${MOT_DE_PASSE_DEMO})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
