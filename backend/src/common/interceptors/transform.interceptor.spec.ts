import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { paginate } from '../dto/pagination.dto';
import { ApiResponse, TransformInterceptor } from './transform.interceptor';

/**
 * Toutes les réponses sortent sous la même enveloppe. Le cas délicat est la pagination :
 * la liste doit remonter à plat dans `data`, sinon le client cherche un `data.data`.
 */
describe('TransformInterceptor', () => {
  const context = {} as ExecutionContext;

  const intercepter = async (payload: unknown): Promise<ApiResponse<unknown>> => {
    const interceptor = new TransformInterceptor<unknown>();
    const next: CallHandler = { handle: () => of(payload) };
    return firstValueFrom(interceptor.intercept(context, next));
  };

  it('enveloppe une charge utile simple', async () => {
    const response = await intercepter({ id: 'reservation-1' });

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: 'reservation-1' });
    expect(response.meta).toBeUndefined();
  });

  it('aplatit un résultat paginé : la liste dans `data`, les compteurs dans `meta`', async () => {
    const response = await intercepter(paginate([{ id: 'a' }, { id: 'b' }], 42, 1, 20));

    expect(response.data).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(response.meta).toEqual({ total: 42, page: 1, limit: 20, totalPages: 3 });
  });

  it('horodate la réponse en ISO', async () => {
    const response = await intercepter(null);

    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it('laisse passer une charge utile nulle sans la confondre avec une pagination', async () => {
    const response = await intercepter(null);

    expect(response.data).toBeNull();
    expect(response.meta).toBeUndefined();
  });
});
