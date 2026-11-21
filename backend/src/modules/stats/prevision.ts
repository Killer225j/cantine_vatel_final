/** Marge de sécurité ajoutée à la prévision, pour ne jamais manquer d'une portion. */
export const MARGE_PREVISION = 0.05;

/**
 * Taux d'absence : parmi les réservations passées qui sont allées au bout (servies ou absentes),
 * la part des absents. Sans historique, on suppose 0 (on prépare tout ce qui est réservé).
 */
export function tauxAbsence(servies: number, absents: number): number {
  const total = servies + absents;
  return total === 0 ? 0 : absents / total;
}

/**
 * Portions à préparer = réservations × (1 − taux d'absence) + 5 % de marge, arrondi au-dessus.
 * Exemple de démo : 156 réservés, 6 % d'absence → 154 portions.
 */
export function portionsAPreparer(reserves: number, taux: number, marge = MARGE_PREVISION): number {
  if (reserves <= 0) return 0;
  return Math.ceil(reserves * (1 - taux) * (1 + marge) - 1e-9);
}

/** Absents attendus parmi les réservés, arrondis à l'unité. */
export function absentsPrevus(reserves: number, taux: number): number {
  return Math.round(reserves * taux);
}
