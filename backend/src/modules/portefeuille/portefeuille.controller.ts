import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { erreurMetier } from '../../common/errors/erreur-metier';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { assurerCompteEleve } from '../../shared/codes/code-liaison';
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
    await assurerCompteEleve(this.prisma, user.sub);
    const p = await this.prisma.portefeuille.findUnique({ where: { userId: user.sub } });
    if (!p) throw new NotFoundException('Portefeuille introuvable.');
    return { solde: p.solde, seuilAlerte: p.seuilAlerte, soldeBas: p.solde < p.seuilAlerte };
  }

  @Post('me/demande-recharge')
  @Roles(Role.ELEVE)
  @ApiOperation({
    summary: 'Demander à mes parents liés de recharger mon portefeuille (notification)',
    description: 'Erreur : 400 AUCUN_PARENT. Une seule demande par heure et par parent.',
  })
  async demanderRecharge(@CurrentUser() user: JwtPayload) {
    const [eleve, liens, portefeuille] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.lienParent.findMany({
        where: { enfantId: user.sub },
        select: { parentId: true },
      }),
      this.prisma.portefeuille.findUnique({ where: { userId: user.sub } }),
    ]);
    if (liens.length === 0) {
      throw erreurMetier(
        BadRequestException,
        ERROR_REASON.AUCUN_PARENT,
        'Aucun parent n’est lié à votre compte : donnez-lui votre code de liaison.',
      );
    }
    const nom = eleve?.firstName ?? 'Votre enfant';
    const titre = `${nom} demande une recharge`;
    const ilYAUneHeure = new Date(Date.now() - 60 * 60 * 1000);
    const dejaPrevenus = new Set(
      (
        await this.prisma.notification.findMany({
          where: {
            type: 'DEMANDE_RECHARGE',
            titre,
            creeLe: { gte: ilYAUneHeure },
            userId: { in: liens.map((l) => l.parentId) },
          },
          select: { userId: true },
        })
      ).map((n) => n.userId),
    );
    const aPrevenir = liens.filter((l) => !dejaPrevenus.has(l.parentId));
    const solde = (portefeuille?.solde ?? 0).toLocaleString('fr-FR');
    await this.prisma.notification.createMany({
      data: aPrevenir.map((l) => ({
        userId: l.parentId,
        type: 'DEMANDE_RECHARGE',
        titre,
        corps: `Le solde de ${nom} est de ${solde} FCFA : il ne peut plus réserver son repas. Rechargez son portefeuille depuis l’onglet Recharge.`,
      })),
    });
    return { parentsPrevenus: liens.length, nouvelles: aPrevenir.length };
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
