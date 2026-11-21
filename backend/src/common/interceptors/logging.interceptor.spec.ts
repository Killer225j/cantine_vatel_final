import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let log: jest.SpyInstance;

  const context = {
    switchToHttp: () => ({ getRequest: () => ({ method: 'GET', url: '/api/patients' }) }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('journalise la méthode, l’URL et la durée une fois la réponse produite', async () => {
    const next: CallHandler = { handle: () => of('ok') };

    await expect(firstValueFrom(interceptor.intercept(context, next))).resolves.toBe('ok');
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\[GET\] \/api\/patients — \d+ms$/));
  });

  it('ne journalise rien quand la route échoue — le filtre d’exception s’en charge', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('boom');
    expect(log).not.toHaveBeenCalled();
  });
});
