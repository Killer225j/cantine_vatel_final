import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { jourValide } from '../menus/menus.controller';
import { AntiGaspiService } from './anti-gaspi.service';

export const DESTINATAIRES = ['PRESENTS', 'ELEVES', 'ELEVES_ET_PARENTS'] as const;
export type Destinataires = (typeof DESTINATAIRES)[number];

export class OuvrirOffreDto {
  @ApiPropertyOptional({ example: 50, description: 'Réduction en % (10 à 80). Défaut 50.' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(80)
  reduction?: number;

  @ApiPropertyOptional({
    example: 45,
    enum: [30, 45, 60],
    description: 'Durée de l’offre en minutes.',
  })
  @IsOptional()
  @IsInt()
  @IsIn([30, 45, 60], { message: 'La durée est de 30, 45 ou 60 minutes.' })
  dureeMinutes?: number;

  @ApiPropertyOptional({
    enum: DESTINATAIRES,
    description:
      'Qui est prévenu : PRESENTS (élèves ayant réservé aujourd’hui, défaut), ELEVES (tous les élèves) ou ELEVES_ET_PARENTS.',
  })
  @IsOptional()
  @IsIn(DESTINATAIRES as unknown as string[])
  destinataires?: Destinataires;

  @ApiPropertyOptional({ description: 'Plats concernés (défaut : tous les plats du jour).' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  menuItemIds?: string[];
}

@ApiTags('Anti-gaspi')
@ApiBearerAuth('access-token')
@Controller()
export class AntiGaspiController {
  constructor(private readonly antiGaspi: AntiGaspiService) {}

  @Post('menus/:date/anti-gaspi')
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({
    summary: 'Lancer l’offre de fin de service (prix réduit) et notifier les élèves',
  })
  ouvrir(@Param('date') date: string, @Body() dto: OuvrirOffreDto) {
    return this.antiGaspi.ouvrir(jourValide(date), dto);
  }

  @Delete('menus/:date/anti-gaspi')
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({ summary: 'Clore l’offre anti-gaspi du jour' })
  clore(@Param('date') date: string) {
    return this.antiGaspi.clore(jourValide(date));
  }

  @Get('anti-gaspi/offres')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Offres anti-gaspi en cours aujourd’hui' })
  offres() {
    return this.antiGaspi.offres();
  }
}
