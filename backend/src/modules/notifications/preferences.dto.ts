import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export const PREFERENCES_PAR_DEFAUT = {
  alerteSoldeBas: true,
  recapQuotidien: true,
  alerteAllergie: true,
};
export type Preferences = typeof PREFERENCES_PAR_DEFAUT;

export class ModifierPreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() alerteSoldeBas?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() recapQuotidien?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() alerteAllergie?: boolean;
}

/** Fusionne la valeur stockée (éventuellement absente ou partielle) avec les valeurs par défaut. */
export function lirePreferences(brut: unknown): Preferences {
  const stocke = brut && typeof brut === 'object' ? (brut as Partial<Preferences>) : {};
  return {
    alerteSoldeBas: stocke.alerteSoldeBas ?? true,
    recapQuotidien: stocke.recapQuotidien ?? true,
    alerteAllergie: stocke.alerteAllergie ?? true,
  };
}
