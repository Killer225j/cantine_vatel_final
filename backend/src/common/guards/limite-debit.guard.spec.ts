import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { LimiteDebitGuard, adresseClient } from './limite-debit.guard';

const contexte = (headers: Record<string, string>, ip = '10.0.0.1'): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers, ip }) }),
  }) as unknown as ExecutionContext;

describe('LimiteDebitGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('admet cent essais, refuse le cent unième en 429', () => {
    const guard = new LimiteDebitGuard();
    const ctx = contexte({ 'x-forwarded-for': '196.1.1.1' });

    for (let i = 0; i < 100; i += 1) expect(guard.canActivate(ctx)).toBe(true);

    try {
      guard.canActivate(ctx);
      fail('le 101e essai aurait dû être refusé');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('compte chaque adresse à part', () => {
    const guard = new LimiteDebitGuard();
    for (let i = 0; i < 100; i += 1)
      guard.canActivate(contexte({ 'x-forwarded-for': '196.1.1.1' }));

    expect(guard.canActivate(contexte({ 'x-forwarded-for': '196.2.2.2' }))).toBe(true);
  });

  it('rouvre la porte une fois la fenêtre passée', () => {
    jest.useFakeTimers();
    const guard = new LimiteDebitGuard();
    const ctx = contexte({});
    for (let i = 0; i < 100; i += 1) guard.canActivate(ctx);

    jest.advanceTimersByTime(10 * 60 * 1000);

    expect(guard.canActivate(ctx)).toBe(true);
  });
});

describe('adresseClient', () => {
  it('lit la dernière entrée de X-Forwarded-For, celle que pose Nginx', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 196.1.1.1' }, ip: '172.18.0.1' };

    expect(adresseClient(req as never)).toBe('196.1.1.1');
  });

  it('retombe sur req.ip sans proxy', () => {
    expect(adresseClient({ headers: {}, ip: '127.0.0.1' } as never)).toBe('127.0.0.1');
  });
});
