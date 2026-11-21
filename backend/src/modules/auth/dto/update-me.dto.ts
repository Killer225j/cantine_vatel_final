import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsIvorianPhone } from '../../../common/validators/is-ivorian-phone.decorator';

/**
 * Ce qu'une personne corrige elle-même sur son compte, quel que soit son rôle.
 *
 * L'adresse électronique n'y figure pas : c'est l'identifiant de connexion, et la changer
 * sans vérifier la nouvelle boîte permettrait de se verrouiller dehors — ou de détourner un
 * compte depuis une session laissée ouverte. Elle demandera son propre parcours, avec
 * confirmation par courriel.
 *
 * Le rôle non plus : personne ne se promeut soi-même.
 */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiPropertyOptional({
    description: 'Prénom, tel que la personne souhaite être nommée sur la plateforme',
    example: 'Adjoua',
    maxLength: 80,
  })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiPropertyOptional({ description: 'Nom de famille', example: 'Kouassi', maxLength: 80 })
  lastName?: string;

  @IsOptional()
  @IsIvorianPhone()
  @ApiPropertyOptional({
    description:
      'Numéro ivoirien. Toutes les écritures sont acceptées — `+2250700000030`, `0700000030`, ' +
      '`07 00 00 00 30` — et ramenées à la forme canonique `+225XXXXXXXXXX`. Unique sur la ' +
      'plateforme : un numéro déjà pris est refusé en 409.',
    example: '+2250700000005',
  })
  phone?: string;
}
