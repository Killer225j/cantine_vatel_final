import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { MoyenPaiement, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { pagePaiement } from './page-paiement';
import { RechargesService } from './recharges.service';

export class CreerRechargeDto {
  @ApiProperty({ example: 5000, description: 'Montant en FCFA (500 à 100 000).' })
  @IsInt()
  @Min(500, { message: 'Le montant minimum est de 500 FCFA.' })
  @Max(100000, { message: 'Le montant maximum est de 100 000 FCFA.' })
  montant!: number;

  @ApiProperty({ enum: MoyenPaiement, example: MoyenPaiement.WAVE })
  @IsEnum(MoyenPaiement, { message: 'Moyen de paiement inconnu.' })
  moyen!: MoyenPaiement;

  @ApiPropertyOptional({ description: 'Pour un parent : l’enfant à recharger.' })
  @IsOptional()
  @IsString()
  enfantId?: string;
}

export class PaiementDto {
  @ApiProperty({ enum: ['succes', 'echec'] })
  @IsIn(['succes', 'echec'])
  issue!: 'succes' | 'echec';
}

/** Adresse publique de l'API, derrière le proxy de Render (HTTPS) comme en local. */
function baseUrl(req: Request): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

@ApiTags('Recharges')
@Controller('recharges')
export class RechargesController {
  constructor(private readonly recharges: RechargesService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(Role.PARENT, Role.ELEVE)
  @ApiOperation({
    summary: 'Démarrer une recharge',
    description:
      'Crée une recharge en attente et renvoie `urlPaiement` : la page de paiement simulée (Wave, Orange Money, MTN, Moov) à ouvrir dans le navigateur du téléphone.',
  })
  creer(@CurrentUser() user: JwtPayload, @Body() dto: CreerRechargeDto, @Req() req: Request) {
    return this.recharges.creer(user, dto, baseUrl(req));
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @Roles(Role.PARENT, Role.ELEVE)
  @ApiOperation({ summary: 'Statut d’une recharge et reçu' })
  lire(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.recharges.lire(user.sub, id);
  }

  @Public()
  @Get(':id/paiement')
  @ApiOperation({ summary: 'Page de paiement simulée (HTML)' })
  async page(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const t = await this.recharges.pourPaiement(id);
    res
      .type('html')
      .send(
        pagePaiement({ ...this.recharges.vue(t), moyen: t.moyen }, req.originalUrl.split('?')[0]),
      );
  }

  @Public()
  @Post(':id/paiement')
  @ApiOperation({ summary: 'Valider ou faire échouer le paiement simulé' })
  async payer(
    @Param('id') id: string,
    @Body() dto: PaiementDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const t = await this.recharges.terminer(id, dto.issue === 'succes');
    res
      .type('html')
      .send(
        pagePaiement({ ...this.recharges.vue(t), moyen: t.moyen }, req.originalUrl.split('?')[0]),
      );
  }
}
