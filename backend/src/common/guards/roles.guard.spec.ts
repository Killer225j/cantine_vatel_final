import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * Le garde ne connaît que deux choses : ce que la route exige, et le rôle porté par le
 * jeton. Une route sans exigence reste ouverte — c'est `JwtAuthGuard` qui décide de
 * l'authentification, pas celui-ci.
 */
describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const handler = function routeHandler() {};
  class ControllerFictif {}

  const contextAvecUtilisateur = (user: unknown): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => ControllerFictif,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('laisse passer quand la route n’exige aucun rôle', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextAvecUtilisateur(undefined))).toBe(true);
  });

  it('laisse passer quand la liste de rôles exigés est vide', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(contextAvecUtilisateur({ role: Role.ELEVE }))).toBe(true);
  });

  it('accepte l’appelant dont le rôle figure parmi ceux exigés', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CUISINE, Role.ADMIN]);

    expect(guard.canActivate(contextAvecUtilisateur({ role: Role.ADMIN }))).toBe(true);
  });

  it('refuse l’appelant dont le rôle n’est pas exigé', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CUISINE]);

    expect(guard.canActivate(contextAvecUtilisateur({ role: Role.ELEVE }))).toBe(false);
  });

  it('refuse une requête sans utilisateur plutôt que de lever', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CUISINE]);

    expect(guard.canActivate(contextAvecUtilisateur(undefined))).toBe(false);
  });

  it('interroge le handler puis la classe, dans cet ordre', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.CUISINE]);

    guard.canActivate(contextAvecUtilisateur({ role: Role.CUISINE }));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      ControllerFictif,
    ]);
  });
});
