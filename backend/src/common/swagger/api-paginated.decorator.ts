import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { ApiPaginatedResponseDto } from '../dto/api-response.dto';

/**
 * Déclare la réponse d'une route paginée : la liste dans `data`, les compteurs dans `meta`.
 *
 * À utiliser partout où le service retourne `paginate(...)`, faute de quoi la documentation
 * décrit la charge utile sans son enveloppe et le client cherche un `data.data` qui n'existe
 * pas.
 */
export function ApiPaginatedOk(description: string): MethodDecorator {
  return applyDecorators(ApiOkResponse({ description, type: ApiPaginatedResponseDto }));
}
