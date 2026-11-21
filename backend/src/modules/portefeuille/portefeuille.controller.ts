import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Portefeuille')
@ApiBearerAuth('access-token')
@Controller('portefeuille')
export class PortefeuilleController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Mon solde et mon seuil d’alerte' })
  async moi(@CurrentUser() user: JwtPayload) {
    const p = await this.prisma.portefeuille.findUnique({ where: { userId: user.sub } });
    if (!p) throw new NotFoundException('Portefeuille introuvable.');
    return { solde: p.solde, seuilAlerte: p.seuilAlerte, soldeBas: p.solde < p.seuilAlerte };
  }

  @Get('me/transactions')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Mon historique : recharges, repas, remboursements' })
  async transactions(@CurrentUser() user: JwtPayload, @Query() dto: PaginationDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = { portefeuille: { userId: user.sub } };
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { creeLe: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          montant: true,
          moyen: true,
          statut: true,
          reference: true,
          creeLe: true,
          reservation: {
            select: {
              code: true,
              date: true,
              menuItem: { select: { plat: { select: { nom: true } } } },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return paginate(
      items.map(({ reservation, ...t }) => ({
        ...t,
        libelle:
          reservation?.menuItem.plat.nom ??
          (t.type === 'RECHARGE'
            ? `Recharge ${t.moyen?.replace('_', ' ').toLowerCase() ?? ''}`.trim()
            : t.type),
        reservationCode: reservation?.code ?? null,
      })),
      total,
      page,
      limit,
    );
  }
}
