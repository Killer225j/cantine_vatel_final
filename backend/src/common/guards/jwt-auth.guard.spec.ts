import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Le garde est appliqué globalement : c'est le décorateur `@Public()` qui ouvre les rares
 * routes ouvertes (connexion, inscription, webhook). Sans ce court-circuit, Passport
 * refuserait la connexion elle-même.
 */
describe('JwtAuthGuard', () => {
  const handler = function routeHandler() {};
  class ControllerFictif {}

  const context = {
    getHandler: () => handler,
    getClass: () => ControllerFictif,
  } as unknown as ExecutionContext;

  it('court-circuite Passport sur une route marquée publique', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);
    const passport = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      ControllerFictif,
    ]);
    expect(passport).not.toHaveBeenCalled();

    passport.mockRestore();
  });

  it('délègue à Passport sur une route protégée', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);
    const passport = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(passport).toHaveBeenCalledWith(context);

    passport.mockRestore();
  });
});
