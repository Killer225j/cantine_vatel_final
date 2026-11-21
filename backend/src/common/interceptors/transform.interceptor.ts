import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { PaginationMeta, isPaginatedResult } from '../dto/pagination.dto';

export interface ApiResponse<T> {
  success: true;
  data: T;
  /** Présent uniquement sur les routes paginées. */
  meta?: PaginationMeta;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        const timestamp = new Date().toISOString();

        // Un résultat paginé est remonté à plat : la liste dans `data`, les compteurs
        // dans `meta`. Sans cela, l'enveloppe produirait un `data.data` imbriqué.
        if (isPaginatedResult(payload)) {
          return {
            success: true as const,
            data: payload.items as T,
            meta: payload.meta,
            timestamp,
          };
        }

        return { success: true as const, data: payload, timestamp };
      }),
    );
  }
}
