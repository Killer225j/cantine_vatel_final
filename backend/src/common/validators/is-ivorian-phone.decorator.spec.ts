import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { IsIvorianPhone } from './is-ivorian-phone.decorator';

class Formulaire {
  @IsIvorianPhone()
  phone!: string;
}

/**
 * L'ordre compte : normaliser d'abord, valider ensuite. Valider la saisie brute rejetterait
 * `07 11 22 33 44`, pourtant parfaitement valide.
 */
describe('@IsIvorianPhone', () => {
  const soumettre = (phone: unknown) => {
    const dto = plainToInstance(Formulaire, { phone });
    return { dto, erreurs: validateSync(dto) };
  };

  it.each([
    ['+2250700000010', '+2250700000010'],
    ['0700000010', '+2250700000010'],
    ['+225 07 00 00 00 10', '+2250700000010'],
    ['07 11 22 33 44', '+2250711223344'],
  ])('accepte « %s » et le ramène à %s', (saisie, attendu) => {
    const { dto, erreurs } = soumettre(saisie);

    expect(erreurs).toHaveLength(0);
    expect(dto.phone).toBe(attendu);
  });

  it('laisse la saisie non normalisable telle quelle, et la rejette', () => {
    const { dto, erreurs } = soumettre('pas-un-numero');

    expect(dto.phone).toBe('pas-un-numero');
    expect(erreurs[0].constraints?.matches).toContain('valid Ivorian number');
  });

  it('rejette un indicatif étranger', () => {
    expect(soumettre('+33612345678').erreurs).not.toHaveLength(0);
  });

  it('laisse passer une valeur non textuelle jusqu’à la validation, qui la rejette', () => {
    const { dto, erreurs } = soumettre(42);

    expect(dto.phone).toBe(42 as unknown as string);
    expect(erreurs).not.toHaveLength(0);
  });
});
