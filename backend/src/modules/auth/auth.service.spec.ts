import { createHash } from 'crypto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

const JWT = {
  secret: 'secret-acces-de-test-suffisamment-long',
  expiresIn: '15m',
  refreshSecret: 'secret-refresh-de-test-suffisamment-long',
  refreshExpiresIn: '7d',
};

function utilisateur(surcharges: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'eleve@vatel.ci',
    phone: null,
    passwordHash: bcrypt.hashSync('Cantine2026!', 4),
    firstName: 'Koffi',
    lastName: 'Koffi',
    role: Role.ELEVE,
    isActive: true,
    refreshToken: null,
    classe: null,
    codeLiaison: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...surcharges,
  };
}

describe('AuthService', () => {
  let repo: jest.Mocked<AuthRepository>;
  let service: AuthService;
  const jwt = new JwtService();

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateIdentity: jest.fn(),
      updateRefreshToken: jest.fn(),
      updatePasswordHash: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;
    const config = { get: () => JWT } as unknown as ConfigService;
    service = new AuthService(repo, jwt, config as never);
  });

  it('refuse une inscription sur un email déjà pris', async () => {
    repo.findByEmail.mockResolvedValue(utilisateur());
    await expect(
      service.register({
        email: 'eleve@vatel.ci',
        password: 'Cantine2026!',
        role: Role.ELEVE,
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('inscrit un parent et ne stocke que le condensat du mot de passe', async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockImplementation(async (data) =>
      utilisateur({ ...(data as Partial<User>), id: 'u2' }),
    );

    const jetons = await service.register({
      email: 'parent@exemple.ci',
      password: 'Cantine2026!',
      role: Role.PARENT,
      firstName: 'Aya',
      lastName: 'Koffi',
    });

    const cree = repo.create.mock.calls[0][0] as { passwordHash: string; role: Role };
    expect(cree.role).toBe(Role.PARENT);
    expect(cree.passwordHash).not.toBe('Cantine2026!');
    expect(jwt.verify(jetons.accessToken, { secret: JWT.secret }).role).toBe(Role.PARENT);
  });

  it('répond pareil à un compte inconnu et à un mauvais mot de passe', async () => {
    const message = (e: unknown) => (e as UnauthorizedException).getResponse();

    repo.findByEmail.mockResolvedValueOnce(null);
    const inconnu = await service
      .login({ email: 'x@y.ci', password: 'Cantine2026!' })
      .catch((e) => e);

    repo.findByEmail.mockResolvedValueOnce(utilisateur());
    const mauvais = await service
      .login({ email: 'eleve@vatel.ci', password: 'Faux1234!' })
      .catch((e) => e);

    expect(inconnu).toBeInstanceOf(UnauthorizedException);
    expect(mauvais).toBeInstanceOf(UnauthorizedException);
    expect(message(inconnu)).toEqual(message(mauvais));
  });

  it('refuse un refresh token qui ne correspond plus à l’empreinte enregistrée', async () => {
    const ancien = jwt.sign({ sub: 'u1' }, { secret: JWT.refreshSecret, expiresIn: '7d' });
    repo.findById.mockResolvedValue(
      utilisateur({ refreshToken: createHash('sha256').update('un-autre-jeton').digest('hex') }),
    );
    await expect(service.refresh({ refreshToken: ancien })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('renouvelle la paire quand le refresh token est le bon', async () => {
    const actuel = jwt.sign({ sub: 'u1' }, { secret: JWT.refreshSecret, expiresIn: '7d' });
    repo.findById.mockResolvedValue(
      utilisateur({ refreshToken: createHash('sha256').update(actuel).digest('hex') }),
    );

    const jetons = await service.refresh({ refreshToken: actuel });

    expect(jetons.accessToken).toBeDefined();
    expect(repo.updateRefreshToken).toHaveBeenCalledWith('u1', expect.any(String));
  });

  it('n’accepte un refresh token qu’une seule fois, même rejoué dans la seconde', async () => {
    // Le dépôt garde le dernier condensat enregistré, comme la base.
    let condensat: string | null = null;
    repo.updateRefreshToken.mockImplementation(async (_id, valeur) => {
      condensat = valeur;
    });
    repo.findById.mockImplementation(async () => utilisateur({ refreshToken: condensat }));
    repo.findByEmail.mockResolvedValue(utilisateur());

    const premiers = await service.login({
      email: 'eleve@vatel.ci',
      password: 'Cantine2026!',
    });
    const seconds = await service.refresh({ refreshToken: premiers.refreshToken });

    expect(seconds.refreshToken).not.toBe(premiers.refreshToken);
    await expect(service.refresh({ refreshToken: premiers.refreshToken })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
