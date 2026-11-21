import { Role } from '@prisma/client';

/**
 * Ce que chaque rôle voit dans la barre latérale du back-office.
 *
 * Le serveur dit **quoi**, jamais **où** : chaque entrée porte un `slug` stable, et le client
 * tient sa propre table slug → route. Un slug inconnu du client est un écran qu'il n'a pas :
 * il l'ignore sans casser le reste.
 *
 * **Ce menu n'autorise rien** : ce sont les `@Roles` de chaque route qui tranchent.
 */
export const ICONES = [
  'tableau',
  'menus',
  'commandes',
  'comptoir',
  'stock',
  'creneaux',
  'comptes',
  'rapports',
] as const;

export type IconeNavigation = (typeof ICONES)[number];

export interface EntreeNavigation {
  titre: string;
  /** Unique sur toute l'application : c'est la clé de la table de routes du client. */
  slug: string;
  icon: IconeNavigation | null;
  /** Les entrées regroupées. Vide pour une entrée qui mène quelque part. */
  options: EntreeNavigation[];
}

const feuille = (titre: string, slug: string, icon: IconeNavigation): EntreeNavigation => ({
  titre,
  slug,
  icon,
  options: [],
});

const groupe = (titre: string, slug: string, options: EntreeNavigation[]): EntreeNavigation => ({
  titre,
  slug,
  icon: null,
  options,
});

/** Les rôles du back-office. ELEVE et PARENT naviguent dans l'appli mobile. */
export const NAVIGATIONS: Partial<Record<Role, EntreeNavigation[]>> = {
  [Role.ADMIN]: [
    groupe('Pilotage', 'admin.pilotage', [
      feuille('Tableau de bord', 'admin.tableau-de-bord', 'tableau'),
    ]),
  ],
  [Role.CUISINE]: [
    groupe('Service', 'cuisine.service', [
      feuille('Tableau de bord', 'cuisine.tableau-de-bord', 'tableau'),
    ]),
  ],
};

/** L'écran d'arrivée d'un rôle : la première entrée qui mène quelque part. */
export function accueil(navigation: EntreeNavigation[]): string | null {
  for (const entree of navigation) {
    if (entree.options.length === 0) return entree.slug;
    const dedans = accueil(entree.options);
    if (dedans) return dedans;
  }
  return null;
}
