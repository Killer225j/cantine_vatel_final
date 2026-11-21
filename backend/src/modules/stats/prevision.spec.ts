import { absentsPrevus, portionsAPreparer, tauxAbsence } from './prevision';

describe('prévision anti-gaspi', () => {
  it('retrouve le chiffre de la maquette : 156 réservés, 6 % d’absence → 154 portions', () => {
    expect(portionsAPreparer(156, 0.06)).toBe(154);
  });

  it('prépare tout ce qui est réservé, plus la marge, sans historique', () => {
    expect(tauxAbsence(0, 0)).toBe(0);
    expect(portionsAPreparer(40, 0)).toBe(42);
  });

  it('ne prévoit rien sans réservation', () => {
    expect(portionsAPreparer(0, 0.1)).toBe(0);
  });

  it('calcule le taux sur les seules réservations allées au bout', () => {
    expect(tauxAbsence(94, 6)).toBeCloseTo(0.06);
    expect(absentsPrevus(63, 0.06)).toBe(4);
  });
});
