/** Date courte "DD/MM/YYYY" ; « — » si absente. Format numérique standard utilisé par la
 *  majorité des écrans. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
