import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "État de l'API et de la base",
    description:
      "`200` quand l'API répond et que PostgreSQL répond, `503` sinon. Ne lit aucune table : " +
      "aucune migration ne peut la casser. À appeler avant une démo pour réveiller l'instance Render.",
  })
  @ApiOkResponse({ description: 'API et base disponibles' })
  @ApiServiceUnavailableResponse({ description: 'Base injoignable' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de données injoignable');
    }
    return { status: 'ok', database: 'up' };
  }
}
