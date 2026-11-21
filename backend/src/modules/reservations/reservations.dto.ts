import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutReservation } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { FORMAT_JOUR } from '../../common/utils/dates.util';

export class ReserverDto {
  @ApiProperty({ description: 'Le plat du menu du jour (MenuItem.id)' })
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiProperty({ description: 'Le créneau de passage (Creneau.id)' })
  @IsString()
  @IsNotEmpty()
  creneauId!: string;

  @ApiPropertyOptional({ description: 'Réserver au prix de l’offre anti-gaspi en cours' })
  @IsOptional()
  @IsBoolean()
  antiGaspi?: boolean;
}

export class ListerReservationsDto {
  @ApiPropertyOptional({ example: '2026-11-23', description: 'Défaut : aujourd’hui' })
  @IsOptional()
  @Matches(FORMAT_JOUR, { message: 'Date attendue au format AAAA-MM-JJ.' })
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creneauId?: string;

  @ApiPropertyOptional({ enum: StatutReservation, enumName: 'StatutReservation' })
  @IsOptional()
  @IsEnum(StatutReservation)
  statut?: StatutReservation;

  @ApiPropertyOptional({ description: 'Recherche sur le nom de l’élève ou le code RV-…' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class ScannerDto {
  @ApiProperty({
    example: 'RV-7K2M-4F9Q-XB3T',
    description: 'Code lu dans le QR ou saisi à la main',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class ServirDto {
  @ApiPropertyOptional({
    description: 'Obligatoire (true) quand le plat contient un allergène déclaré par l’élève',
  })
  @IsOptional()
  @IsBoolean()
  controleAllergie?: boolean;
}
