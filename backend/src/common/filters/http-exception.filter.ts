import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ERROR_REASON, ErrorReason } from '../errors/error-reason';

interface ErrorBody {
  success: false;
  error: {
    code: number;
    message: string;
    /** Code métier stable, sur lequel le client peut brancher son affichage. */
    reason?: ErrorReason | string;
    details?: unknown;
  };
  timestamp: string;
}

interface NormalizedError {
  status: number;
  message: string;
  reason?: ErrorReason | string;
  details?: unknown;
  /** Détail conservé pour les journaux, jamais renvoyé au client. */
  logDetail?: string;
}

/**
 * Filtre attrape-tout : sans `@Catch()` vide, une erreur qui n'est pas une `HttpException`
 * — typiquement une erreur Prisma — échappait au filtre et Nest répondait son format par
 * défaut `{ statusCode, message }`, hors de l'enveloppe maison. Le client devait alors
 * gérer deux formes de réponse d'erreur.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    this.logger.error(
      `[${request.method}] ${request.url} → ${normalized.status} ${normalized.message}` +
        (normalized.logDetail ? ` | ${normalized.logDetail}` : ''),
    );

    const body: ErrorBody = {
      success: false,
      error: {
        code: normalized.status,
        message: normalized.message,
        ...(normalized.reason !== undefined ? { reason: normalized.reason } : {}),
        ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      },
      timestamp: new Date().toISOString(),
    };

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    // Cas non identifié : on journalise tout, on n'expose rien. Le détail d'une erreur
    // interne peut révéler la structure de la base ou des données d'autres utilisateurs.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      reason: ERROR_REASON.INTERNAL_ERROR,
      logDetail: exception instanceof Error ? exception.stack : String(exception),
    };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { status, message: payload };
    }

    const asObject = payload as { message?: unknown; reason?: unknown };
    const rawMessage = asObject.message ?? exception.message;

    return {
      status,
      message: Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage),
      reason: typeof asObject.reason === 'string' ? asObject.reason : undefined,
      // Les erreurs de validation arrivent sous forme de tableau : on le conserve tel quel
      // pour que le client puisse cibler les champs fautifs.
      details: Array.isArray(rawMessage) ? rawMessage : undefined,
    };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): NormalizedError {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'This resource already exists',
          reason: ERROR_REASON.UNIQUE_CONSTRAINT,
          logDetail: `Prisma P2002 on ${JSON.stringify(exception.meta?.target)}`,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          reason: ERROR_REASON.RECORD_NOT_FOUND,
          logDetail: `Prisma P2025: ${exception.message}`,
        };
      /**
       * Clé étrangère non satisfaite : la requête désigne une ressource qui
       * n'existe pas, ou en supprime une dont d'autres dépendent encore.
       *
       * Faute de ce cas, une référence inconnue dans le corps d'une requête rendait un
       * 500 — le client lisait « erreur interne » là où c'est sa charge utile
       * qu'il devait corriger. 400 plutôt que 404 : ce n'est pas la ressource
       * visée par la route qui manque, c'est ce que la requête référence.
       */
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'A referenced resource does not exist, or is still in use',
          reason: ERROR_REASON.INVALID_REFERENCE,
          logDetail: `Prisma P2003 on ${JSON.stringify(exception.meta?.field_name)}`,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          reason: ERROR_REASON.INTERNAL_ERROR,
          logDetail: `Prisma ${exception.code}: ${exception.message}`,
        };
    }
  }
}
