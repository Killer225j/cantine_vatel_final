/**
 * Comptes créés par `prisma/seed.ts`, repris dans les exemples Swagger.
 * Mots de passe de démonstration uniquement : jamais de vrai compte ici.
 */
export const MOT_DE_PASSE_DEMO = 'Cantine2026!';

export const SEED_ACCOUNTS = {
  admin: { email: 'admin@vatel.ci', password: MOT_DE_PASSE_DEMO },
  cuisine: { email: 'cuisine@vatel.ci', password: MOT_DE_PASSE_DEMO },
  parent: { email: 'parent@vatel.ci', password: MOT_DE_PASSE_DEMO },
  eleve: { email: 'eleve@vatel.ci', password: MOT_DE_PASSE_DEMO },
} as const;
