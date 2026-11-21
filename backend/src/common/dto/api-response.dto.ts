import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMeta } from './pagination.dto';

/**
 * Enveloppes de réponse, déclarées pour Swagger.
 *
 * Le `TransformInterceptor` et le `HttpExceptionFilter` enveloppent toutes les réponses,
 * mais rien ne le disait dans la documentation : le client lisait des schémas décrivant la
 * charge utile seule, sans `success`, sans `meta`, sans `reason`.
 */

export class ApiErrorBody {
  @ApiProperty({ description: 'Statut HTTP', example: 409 })
  code!: number;

  @ApiProperty({
    description:
      'Texte destiné aux développeurs et aux journaux. **Jamais affiché tel quel** : il est en anglais et peut changer sans préavis.',
    example: 'This slot is already booked',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      "Code métier stable, indépendant de la langue. C'est sur lui que le client branche son message traduit. Absent quand la levée n'en fournit pas.",
    example: 'SLOT_ALREADY_BOOKED',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Erreurs de validation, champ par champ. Absent sinon.',
    example: ['slotId should not be empty', 'slotId must be a string'],
    type: [String],
  })
  details?: string[];
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorBody })
  error!: ApiErrorBody;

  @ApiProperty({ format: 'date-time', example: '2026-08-12T10:00:00.000Z' })
  timestamp!: string;
}

/**
 * Réponse d'une route paginée. `data` porte la liste, `meta` les compteurs — jamais de
 * `data.data` imbriqué.
 */
export class ApiPaginatedResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ description: 'La page demandée', type: [Object] })
  data!: unknown[];

  @ApiProperty({ type: PaginationMeta })
  meta!: PaginationMeta;

  @ApiProperty({ format: 'date-time', example: '2026-08-12T10:00:00.000Z' })
  timestamp!: string;
}
