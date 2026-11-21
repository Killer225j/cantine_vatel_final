import { ALPHABET_LISIBLE } from './code-lisible';
import {
  PREFIXE_CODE_RECU,
  genererCodeVerification,
  normaliserCodeVerification,
} from './code-verification';

describe('code de vérification', () => {
  it('a la forme RC-XXXX-XXXX-XXXX, dans l’alphabet lisible', () => {
    const code = genererCodeVerification(PREFIXE_CODE_RECU);

    expect(code).toMatch(/^RC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    for (const c of code.slice(3).replace(/-/g, '')) {
      expect(ALPHABET_LISIBLE).toContain(c);
    }
  });

  it('ne se répète pas', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => genererCodeVerification('RC')));

    expect(codes.size).toBe(2000);
  });

  it.each([
    ['RC-7K2M-4F9Q-XB3T', 'RC-7K2M-4F9Q-XB3T'],
    ['  rc-7k2m-4f9q-xb3t ', 'RC-7K2M-4F9Q-XB3T'],
    ['RC7K2M4F9QXB3T', 'RC-7K2M-4F9Q-XB3T'],
    ['7K2M 4F9Q XB3T', 'RC-7K2M-4F9Q-XB3T'],
  ])('rétablit la saisie « %s »', (saisie, attendu) => {
    expect(normaliserCodeVerification(saisie, 'RC')).toBe(attendu);
  });

  it.each(['', 'RC-7K2M', 'RC-7K2M-4F9Q-XB3O', "RC-7K2M-4F9Q-XB3T'; --", 'x'.repeat(500)])(
    'refuse « %s » sans aller jusqu’à la base',
    (saisie) => {
      expect(normaliserCodeVerification(saisie, 'RC')).toBeNull();
    },
  );
});
