import { PrismaService } from './prisma.service';

/**
 * Le service Prisma tient la connexion au cycle de vie du module : sans ces deux crochets,
 * la connexion s'ouvrirait à la première requête et ne se fermerait jamais proprement.
 */
describe('PrismaService', () => {
  let service: PrismaService;
  let connect: jest.SpyInstance;
  let disconnect: jest.SpyInstance;

  beforeEach(() => {
    service = new PrismaService();
    connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ouvre la connexion au démarrage du module', async () => {
    await service.onModuleInit();

    expect(connect).toHaveBeenCalled();
  });

  it('la referme à l’arrêt', async () => {
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
  });
});
