import { ConflictException } from '@nestjs/common';
import { ERROR_REASON } from './error-reason';
import { toUniqueConflict } from './unique-conflict';

/**
 * Nommer le mauvais champ envoie le client corriger la mauvaise donnée : on lit
 * `meta.target` plutôt que de supposer.
 */
describe('toUniqueConflict', () => {
  const violation = (target: unknown) => ({ code: 'P2002', meta: { target } });

  it('ignore ce qui n’est pas une erreur Prisma', () => {
    expect(toUniqueConflict(null)).toBeNull();
    expect(toUniqueConflict(undefined)).toBeNull();
    expect(toUniqueConflict('boom')).toBeNull();
    expect(toUniqueConflict(new Error('boom'))).toBeNull();
  });

  it('ignore une erreur Prisma d’un autre code', () => {
    expect(toUniqueConflict({ code: 'P2025' })).toBeNull();
  });

  it('nomme l’email quand c’est lui qui est en conflit', () => {
    const conflit = toUniqueConflict(violation(['email']));

    expect(conflit).toBeInstanceOf(ConflictException);
    expect(conflit?.getResponse()).toMatchObject({
      message: 'A user with this email already exists',
      reason: ERROR_REASON.UNIQUE_CONSTRAINT,
      details: ['email'],
    });
  });

  it('nomme le téléphone quand la contrainte porte sur lui', () => {
    expect(toUniqueConflict(violation(['phone']))?.getResponse()).toMatchObject({
      message: 'A user with this phone number already exists',
      details: ['phone'],
    });
  });

  it('accepte une cible fournie sous forme de chaîne', () => {
    expect(toUniqueConflict(violation('email'))?.getResponse()).toMatchObject({
      details: ['email'],
    });
  });

  it('reste générique sur un champ inconnu, et n’invente pas de détail', () => {
    const reponse = toUniqueConflict(violation(['cmuNumber']))?.getResponse() as Record<
      string,
      unknown
    >;

    expect(reponse.message).toBe('This resource already exists');
    expect(reponse.details).toBeUndefined();
  });

  it('reste générique quand Prisma ne dit pas quelle colonne est en cause', () => {
    expect(
      (toUniqueConflict({ code: 'P2002' })?.getResponse() as { message: string }).message,
    ).toBe('This resource already exists');
  });
});
