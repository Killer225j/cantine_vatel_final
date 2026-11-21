import { csvCell, toCsv } from './csv.util';

describe('csvCell', () => {
  it('laisse une cellule ordinaire telle quelle', () => {
    expect(csvCell('Consultation')).toBe('Consultation');
  });

  it('neutralise une formule', () => {
    expect(csvCell('=SOMME(A1:A9)')).toBe("'=SOMME(A1:A9)");
    expect(csvCell('+33612345678')).toBe("'+33612345678");
    expect(csvCell('-1+2')).toBe("'-1+2");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('laisse un nombre négatif tel quel : c’est une valeur, pas une formule', () => {
    expect(csvCell('-15')).toBe('-15');
    expect(csvCell('-37.5')).toBe('-37.5');
    expect(csvCell('-2,5')).toBe('-2,5');
  });

  it('met entre guillemets une cellule qui contient le séparateur, un guillemet ou un saut de ligne', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('il a dit "oui"')).toBe('"il a dit ""oui"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
});

describe('toCsv', () => {
  it('écrit un BOM, l’en-tête et les lignes, fins de ligne Windows', () => {
    const csv = toCsv(
      ['Numéro', 'Montant'],
      [
        ['FA-1', '1000'],
        ['FA-2', '=1+1'],
      ],
    );

    expect(csv).toBe("﻿Numéro;Montant\r\nFA-1;1000\r\nFA-2;'=1+1\r\n");
  });

  it('écrit l’en-tête seul quand il n’y a aucune ligne', () => {
    expect(toCsv(['A'], [])).toBe('﻿A\r\n');
  });
});
