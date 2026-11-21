import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Filtre booléen porté par la chaîne de requête.
 *
 * Une query string ne transporte que du texte, et `Boolean('false')` vaut `true` : un
 * `@Type(() => Boolean)` faisait donc répondre la même chose à `?isActive=true` et à
 * `?isActive=false`. La conversion implicite du pipe global ayant déjà eu lieu quand le
 * `@Transform` s'exécute, on relit la valeur **brute** dans l'objet d'origine plutôt que
 * celle, déjà abîmée, que reçoit le transformateur.
 *
 * Un filtre absent reste absent : `undefined` ne vaut pas `false`.
 */
export function IsBooleanQuery(): PropertyDecorator {
  return applyDecorators(
    IsOptional(),
    Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
      const brut = obj?.[key];
      if (typeof brut === 'boolean') return brut;
      if (brut === 'true') return true;
      if (brut === 'false') return false;
      return brut;
    }),
    IsBoolean(),
  );
}
