/** Formats fr-FR mis en cache — Intl.NumberFormat est coûteux à instancier à chaque appel. */
const NF_ENTIER   = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const NF_DECIMAL  = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « Ford · Everest · Blanc » — les infos véhicule renseignées, séparées par un point médian ; « — » si aucune. */
export function libelleVehicule(...parties: Array<string | null | undefined>): string {
  return parties.filter((p) => !!p && p.trim()).join(' · ') || '—';
}

/** Montant en XOF (0 décimale) ou en devise (2 décimales) ; « — » si absent / non numérique. */
export function formatMontant(val: string | number | null | undefined, decimales: 0 | 2 = 2): string {
  if (val === undefined || val === null || val === '') return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!Number.isFinite(n)) return '—';
  return (decimales === 0 ? NF_ENTIER : NF_DECIMAL).format(n);
}

/** Quantité (poids, volume...) : entier sans décimale, sinon jusqu'à 3 décimales ; « — » si absente. */
export function formatQte(val?: number | null): string {
  if (val == null) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return n % 1 === 0 ? n.toLocaleString('fr-FR') : n.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}
