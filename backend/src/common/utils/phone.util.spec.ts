import { isPhoneLike, normalizePhone } from './phone.util';

describe('normalizePhone', () => {
  it('ramène toutes les écritures du même abonné à une seule forme', () => {
    const attendu = '+2250700000010';

    expect(normalizePhone('+2250700000010')).toBe(attendu);
    expect(normalizePhone('0700000010')).toBe(attendu);
    expect(normalizePhone('2250700000010')).toBe(attendu);
    expect(normalizePhone('002250700000010')).toBe(attendu);
    expect(normalizePhone('+225 07 00 00 00 10')).toBe(attendu);
    expect(normalizePhone('+225-07.00.00.00.10')).toBe(attendu);
    expect(normalizePhone('  0700000010  ')).toBe(attendu);
  });

  it('accepte les anciens numéros à 8 chiffres, encore présents en base', () => {
    expect(normalizePhone('+22522000000')).toBe('+22522000000');
    expect(normalizePhone('22000000')).toBe('+22522000000');
  });

  it('refuse ce qui ne peut pas être un numéro ivoirien', () => {
    expect(normalizePhone('yao')).toBeNull();
    expect(normalizePhone('12345')).toBeNull(); // trop court
    expect(normalizePhone('+225070000001099')).toBeNull(); // trop long
    expect(normalizePhone('+33612345678')).toBeNull(); // indicatif étranger, hors périmètre
    expect(normalizePhone('07000000ab')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it('est idempotente — normaliser deux fois ne change rien', () => {
    const une = normalizePhone('07 00 00 00 10');
    expect(normalizePhone(une)).toBe(une);
  });
});

describe('isPhoneLike', () => {
  it('reconnaît une saisie de numéro', () => {
    expect(isPhoneLike('0700000010')).toBe(true);
    expect(isPhoneLike('+225 07 00 00 00 10')).toBe(true);
    expect(isPhoneLike('22000000')).toBe(true);
  });

  it('ne confond pas un nom avec un numéro', () => {
    expect(isPhoneLike('yao')).toBe(false);
    expect(isPhoneLike('Jean-Baptiste')).toBe(false);
    expect(isPhoneLike('')).toBe(false);
  });

  it('reste vrai sur un numéro mal formé, pour éviter de le chercher comme un nom', () => {
    // 11 chiffres : ce n'est pas un numéro valide, mais ce n'est pas un nom non plus.
    // La recherche doit conclure « introuvable », pas partir chercher un patronyme.
    expect(isPhoneLike('07000000109')).toBe(true);
    expect(normalizePhone('07000000109')).toBeNull();
  });
});
