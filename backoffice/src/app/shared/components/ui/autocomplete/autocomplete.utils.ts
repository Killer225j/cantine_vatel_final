export const HAUTEUR_MAX_LISTE = 240;
const ESPACE_MIN_SOUS_CHAMP = 160;
const MARGE_FENETRE = 8;

export interface PlacementListe {
  versLeHaut: boolean;
  maxHeight: number;
}

/** La liste s'ouvre sous le champ, ou au-dessus s'il manque de la place en bas et qu'il y en a plus en haut. */
export function calculerPlacementListe(
  champ: { top: number; bottom: number },
  hauteurFenetre: number,
): PlacementListe {
  const dessous = hauteurFenetre - champ.bottom - MARGE_FENETRE;
  const dessus = champ.top - MARGE_FENETRE;
  const versLeHaut = dessous < ESPACE_MIN_SOUS_CHAMP && dessus > dessous;
  const disponible = versLeHaut ? dessus : dessous;
  return { versLeHaut, maxHeight: Math.max(0, Math.min(HAUTEUR_MAX_LISTE, disponible)) };
}
