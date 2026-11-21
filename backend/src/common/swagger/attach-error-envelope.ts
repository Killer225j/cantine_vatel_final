import { OpenAPIObject } from '@nestjs/swagger';

const ERROR_SCHEMA = { $ref: '#/components/schemas/ApiErrorResponseDto' };

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

/** Réponses d'erreur déjà déclarées route par route, à enrichir plutôt qu'à écraser. */
const KNOWN_ERROR_STATUSES = /^[45]\d\d$/;

interface OperationLike {
  responses?: Record<string, { description?: string; content?: unknown }>;
}

/**
 * Rattache l'enveloppe d'erreur maison à chaque opération du document OpenAPI.
 *
 * Les `@ApiNotFoundResponse` et consorts déclarés dans les controllers portent une
 * description mais aucun schéma : Swagger affichait donc « no content » pour toutes les
 * erreurs, alors que la réponse a une forme stable et documentable. On complète ici, sans
 * toucher aux descriptions déjà écrites, et on ajoute une réponse par défaut là où la route
 * n'annonce aucune erreur.
 */
export function attachErrorEnvelope(document: OpenAPIObject): void {
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, OperationLike | undefined>)[method];
      if (!operation?.responses) {
        continue;
      }

      let hasErrorResponse = false;

      for (const [status, response] of Object.entries(operation.responses)) {
        if (!KNOWN_ERROR_STATUSES.test(status)) {
          continue;
        }
        hasErrorResponse = true;
        // La description vient du controller, le schéma est commun à toutes les erreurs.
        response.content ??= { 'application/json': { schema: ERROR_SCHEMA } };
      }

      if (!hasErrorResponse) {
        operation.responses.default = {
          description: 'Erreur — enveloppe commune, voir le champ `error.reason`',
          content: { 'application/json': { schema: ERROR_SCHEMA } },
        };
      }
    }
  }
}
