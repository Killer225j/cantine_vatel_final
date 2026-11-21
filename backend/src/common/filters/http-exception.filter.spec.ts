import { ArgumentsHost, BadRequestException, ConflictException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_REASON } from '../errors/error-reason';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/api/v1/appointments' }),
      }),
    } as unknown as ArgumentsHost;

    // Le filtre journalise chaque erreur : on coupe le bruit dans la sortie de test.
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const body = () =>
    json.mock.calls[0][0] as {
      success: false;
      error: { code: number; message: string; reason?: string; details?: unknown };
    };

  it('enveloppe une HttpException dans le format maison', () => {
    filter.catch(new ConflictException('This slot is already booked'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(body()).toMatchObject({
      success: false,
      error: { code: 409, message: 'This slot is already booked' },
    });
  });

  it('remonte le code métier quand la levée en fournit un', () => {
    filter.catch(
      new ConflictException({
        message: 'This slot is already booked',
        reason: ERROR_REASON.RATE_LIMITED,
      }),
      host,
    );

    expect(body().error.reason).toBe('RATE_LIMITED');
  });

  it('conserve le détail des erreurs de validation, champ par champ', () => {
    filter.catch(new BadRequestException(['slotId must be a string']), host);

    expect(body()).toMatchObject({
      error: {
        code: 400,
        message: 'slotId must be a string',
        details: ['slotId must be a string'],
      },
    });
  });

  it("traduit une violation d'unicité Prisma en 409, au lieu de laisser passer un 500", () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['slotId'] },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(body().error.reason).toBe(ERROR_REASON.UNIQUE_CONSTRAINT);
  });

  it('traduit un enregistrement introuvable Prisma en 404', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record to update not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(body().error.reason).toBe(ERROR_REASON.RECORD_NOT_FOUND);
  });

  /**
   * Trouvé par `yarn verifier` : `POST /pharmacy` avec un `managerId` inconnu
   * rendait un 500. Le client lisait « erreur interne » là où c'est sa charge
   * utile qu'il devait corriger.
   */
  it('traduit une clé étrangère non satisfaite en 400, au lieu d’un 500', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '5.0.0',
      meta: { field_name: 'pharmacies_managerId_fkey (index)' },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body().error.reason).toBe(ERROR_REASON.INVALID_REFERENCE);
  });

  /** Le champ fautif reste au journal : il nomme la table, donc le schéma. */
  it('ne dit pas au client quelle contrainte a cédé', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '5.0.0',
      meta: { field_name: 'pharmacies_managerId_fkey (index)' },
    });

    filter.catch(prismaError, host);

    expect(JSON.stringify(body())).not.toContain('managerId_fkey');
  });

  it('enveloppe aussi les erreurs inattendues, sans exposer leur détail', () => {
    filter.catch(new Error('connect ECONNREFUSED 10.0.0.1:5432'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const payload = body();
    expect(payload.success).toBe(false);
    expect(payload.error.message).toBe('Internal server error');
    expect(payload.error.reason).toBe(ERROR_REASON.INTERNAL_ERROR);
    expect(JSON.stringify(payload)).not.toContain('ECONNREFUSED');
  });
});
