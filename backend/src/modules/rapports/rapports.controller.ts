import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsOptional, Matches } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FORMAT_JOUR } from '../../common/utils/dates.util';
import { RapportsService } from './rapports.service';

export class PeriodeDto {
  @ApiPropertyOptional({ example: '2026-11-01', description: 'Défaut : début du mois.' })
  @IsOptional()
  @Matches(FORMAT_JOUR, { message: 'Date attendue au format AAAA-MM-JJ.' })
  debut?: string;

  @ApiPropertyOptional({ example: '2026-11-21', description: 'Défaut : aujourd’hui.' })
  @IsOptional()
  @Matches(FORMAT_JOUR, { message: 'Date attendue au format AAAA-MM-JJ.' })
  fin?: string;
}

@ApiTags('Rapports')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('rapports')
export class RapportsController {
  constructor(private readonly rapports: RapportsService) {}

  @Get('synthese')
  @ApiOperation({
    summary: 'Synthèse d’une période : repas, recettes, gaspillage évité, satisfaction',
    description:
      'Fréquentation par semaine, recharges par moyen, ventes par catégorie, notes des plats.',
  })
  synthese(@Query() dto: PeriodeDto) {
    return this.rapports.synthese(dto.debut, dto.fin);
  }
}
