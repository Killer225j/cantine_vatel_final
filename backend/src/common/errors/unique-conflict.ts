import { ConflictException } from '@nestjs/common';
import { ERROR_REASON } from './error-reason';

/** Champs uniques susceptibles d'être en cause, et le message correspondant. */
const FIELD_MESSAGES: Record<string, string> = {
  email: 'A user with this email already exists',
  phone: 'A user with this phone number already exists',
};

/**
 * Traduit une violation d'unicité Prisma en conflit lisible, **en nommant le bon champ**.
 *
 * Un `catch` qui suppose le champ fautif — « cet email existe déjà » — envoie le client
 * corriger la mauvaise donnée dès qu'une seconde contrainte apparaît sur la table. Prisma
 * indique la colonne en cause dans `meta.target` : on s'en sert.
 *
 * @returns le conflit à lever, ou `null` si l'erreur n'est pas une violation d'unicité —
 * à l'appelant de relancer l'erreur d'origine dans ce cas.
 */
export function toUniqueConflict(err: unknown): ConflictException | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return null;
  }
  if ((err as { code: unknown }).code !== 'P2002') {
    return null;
  }

  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  const known = fields.find((field) => field in FIELD_MESSAGES);

  return new ConflictException({
    message: known ? FIELD_MESSAGES[known] : 'This resource already exists',
    reason: ERROR_REASON.UNIQUE_CONSTRAINT,
    ...(known ? { details: [known] } : {}),
  });
}
