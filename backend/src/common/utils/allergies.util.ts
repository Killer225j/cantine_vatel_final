/** Un allergène tel que renvoyé au client. */
export interface AllergeneVue {
  code: string;
  nom: string;
}

/**
 * Les allergènes du plat que l'élève a déclarés : c'est ce qui déclenche le signalement au menu
 * et l'alerte au comptoir. Vide = rien à signaler.
 */
export function conflitsAllergie(
  allergenesPlat: AllergeneVue[],
  allergenesEleve: { code: string }[],
): AllergeneVue[] {
  const eleve = new Set(allergenesEleve.map((a) => a.code));
  return allergenesPlat.filter((a) => eleve.has(a.code));
}
