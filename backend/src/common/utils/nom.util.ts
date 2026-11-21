/**
 * Le nom d'une personne, quand il peut manquer.
 *
 * Depuis que l'identité vit sur `User` (voir `docs/adr/0001-nom-sur-user.md`), `firstName` et
 * `lastName` sont nullables : un compte créé par un tiers — gestionnaire nommé par l'opérateur,
 * officine, laboratoire — n'a d'abord qu'une adresse électronique. Tout affichage doit donc
 * prévoir l'absence, et une seule fois plutôt qu'à chaque appel.
 */

/** Ce dont on a besoin pour nommer quelqu'un : rien de plus que les deux champs. */
export interface Nommable {
  firstName: string | null;
  lastName: string | null;
}

/**
 * « Koffi Yao », « Yao » si le prénom manque, `null` si rien n'est connu.
 *
 * Rend `null` plutôt qu'une chaîne vide : l'appelant décide alors quoi montrer à la place —
 * le libellé du rôle, l'adresse électronique — au lieu d'afficher un blanc que rien n'explique.
 */
export function nomComplet(personne: Nommable | null | undefined): string | null {
  if (!personne) return null;
  const morceaux = [personne.firstName, personne.lastName].filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0,
  );
  return morceaux.length > 0 ? morceaux.join(' ') : null;
}

/**
 * Le nom, ou un repli imposé par l'appelant.
 *
 * Utile là où un texte est produit pour un tiers — un reçu, un rapport — et où
 * l'absence de nom ne doit pas laisser un trou dans le document.
 */
export function nomCompletOu(personne: Nommable | null | undefined, repli: string): string {
  return nomComplet(personne) ?? repli;
}
