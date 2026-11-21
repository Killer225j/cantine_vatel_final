import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsOptional, Matches } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FORMAT_JOUR } from '../../common/utils/dates.util';
import { StatsService } from './stats.service';

export class JourDto {
  @ApiPropertyOptional({ example: '2026-11-24', description: 'Défaut : aujourd’hui' })
  @IsOptional()
  @Matches(FORMAT_JOUR, { message: 'Date attendue au format AAAA-MM-JJ.' })
  date?: string;
}

@ApiTags('Statistiques')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.CUISINE)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('jour')
  @ApiOperation({
    summary: 'Tableau de bord du jour',
    description:
      'Réservés (et évolution sur 7 jours), servis, absents, taux de présence (4 semaines), portions à préparer, kg sauvés du mois, affluence par créneau, alertes allergie.',
  })
  jour(@Query() dto: JourDto) {
    return this.stats.jour(dto.date);
  }

  @Get('prevision')
  @ApiOperation({ summary: 'Prévision anti-gaspi par plat : réservés × (1 − absence) + 5 %' })
  prevision(@Query() dto: JourDto) {
    return this.stats.prevision(dto.date);
  }
}
