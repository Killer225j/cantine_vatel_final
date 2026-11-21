import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { normalizePhone } from '../utils/phone.util';

/** Forme canonique acceptée en base : indicatif ivoirien suivi de 8 à 10 chiffres. */
const CANONICAL = /^\+225\d{8,10}$/;

/**
 * Accepte un numéro ivoirien sous n'importe quelle écriture et le ramène à sa forme
 * canonique **avant** validation.
 *
 * L'ordre compte : normaliser d'abord, valider ensuite. Valider la saisie brute rejetterait
 * `07 11 22 33 44`, pourtant parfaitement valide, et la normalisation faite plus loin dans
 * le service ne serait jamais atteinte.
 *
 * Une saisie non normalisable est laissée telle quelle, donc rejetée par la validation avec
 * un message explicite.
 */
export function IsIvorianPhone(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizePhone(value) ?? value) : value,
    ),
    Matches(CANONICAL, {
      message:
        'phone must be a valid Ivorian number — accepted forms: +2250700000010, 0700000010, +225 07 00 00 00 10',
    }),
  );
}
