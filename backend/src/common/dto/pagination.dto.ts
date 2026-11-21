import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Marqueur permettant au TransformInterceptor de reconnaître un résultat paginé sans
 * se fier à la forme de l'objet. Les clés de type symbole ne sont pas sérialisées en
 * JSON : le marqueur n'apparaît donc jamais dans la réponse HTTP.
 */
export const PAGINATED_RESULT = Symbol('paginatedResult');

export class PaginationMeta {
  @ApiProperty({ description: "Nombre total d'éléments, toutes pages confondues", example: 42 })
  total!: number;

  @ApiProperty({ description: 'Page courante, à partir de 1', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Taille de page demandée', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Nombre total de pages', example: 3 })
  totalPages!: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
  readonly [PAGINATED_RESULT]: true;
}

export function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return typeof value === 'object' && value !== null && PAGINATED_RESULT in value;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    [PAGINATED_RESULT]: true,
  };
}
