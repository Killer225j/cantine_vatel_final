import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

/**
 * Base des listes interrogeables : un seul terme de recherche, `q`.
 *
 * Le client n'indique jamais **sur quel champ** chercher. C'est le repository qui décide,
 * à partir d'une liste blanche qu'il maîtrise et de la forme de la valeur reçue. Laisser le
 * client nommer le champ reviendrait à exposer le schéma de la base, à ouvrir la porte aux
 * champs non indexés, et à rendre toute liste blanche oubliée exploitable.
 */
export class SearchableDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Terme de recherche unique. Le serveur choisit la stratégie selon la forme reçue : une saisie qui ressemble à un numéro de téléphone déclenche une recherche par égalité, sinon la recherche porte sur le nom.',
    example: 'yao',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  q?: string;
}
