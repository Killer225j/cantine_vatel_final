import { calculerPlacementListe, HAUTEUR_MAX_LISTE } from './autocomplete.utils';

describe('calculerPlacementListe', () => {
  it('ouvre sous le champ quand la place suffit, plafonnée à la hauteur maximale', () => {
    const p = calculerPlacementListe({ top: 100, bottom: 136 }, 800);
    expect(p.versLeHaut).toBeFalse();
    expect(p.maxHeight).toBe(HAUTEUR_MAX_LISTE);
  });

  it('se limite à la place restante sous le champ tant qu\'elle suffit à afficher quelques options', () => {
    const p = calculerPlacementListe({ top: 300, bottom: 336 }, 520);
    expect(p.versLeHaut).toBeFalse();
    expect(p.maxHeight).toBe(176);
  });

  it('s\'ouvre vers le haut quand il manque de la place en bas et qu\'il y en a plus au-dessus', () => {
    const p = calculerPlacementListe({ top: 500, bottom: 536 }, 600);
    expect(p.versLeHaut).toBeTrue();
    expect(p.maxHeight).toBe(HAUTEUR_MAX_LISTE);
  });

  it('reste en bas quand il y a encore moins de place au-dessus', () => {
    const p = calculerPlacementListe({ top: 40, bottom: 76 }, 200);
    expect(p.versLeHaut).toBeFalse();
    expect(p.maxHeight).toBe(116);
  });

  it('ne renvoie jamais une hauteur négative', () => {
    const p = calculerPlacementListe({ top: 0, bottom: 10 }, 12);
    expect(p.maxHeight).toBe(0);
  });
});
