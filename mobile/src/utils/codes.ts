/**
 * Met en forme un code de réservation pendant la saisie : « rvab12 » devient « RV-AB12 », et le tiret
 * suivant arrive tout seul quand un groupe de 4 est complet (RV-XXXX-XXXX-XXXX).
 * `precedent` sert à ne pas remettre un tiret que l'utilisateur vient d'effacer.
 */
export function formaterCodeReservation(saisie: string, precedent = ''): string {
  const brut = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!brut.startsWith('RV')) return saisie.toUpperCase();
  const groupes = brut.slice(2, 14).match(/.{1,4}/g) ?? [];
  let code = ['RV', ...groupes].join('-');
  const ajout = saisie.length > precedent.length;
  const complet = groupes.length === 0 || (groupes[groupes.length - 1].length === 4 && groupes.length < 3);
  if (ajout && complet) code += '-';
  return code;
}
