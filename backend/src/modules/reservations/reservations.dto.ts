import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutReservation } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
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

export const ETIQUETTES_AVIS = [
  'Bon goût',
  'Servi chaud',
  'Portion généreuse',
  'Trop salé',
  'Trop pimenté',
  'Service rapide',
  'Décevant',
] as const;

export class NoterDto {
  @ApiProperty({ example: 4, description: 'De 1 à 5 étoiles.' })
  @IsInt()
  @Min(1, { message: 'La note va de 1 à 5.' })
  @Max(5, { message: 'La note va de 1 à 5.' })
  etoiles!: number;

  @ApiPropertyOptional({ example: ['Bon goût', 'Servi chaud'], description: 'Étiquettes rapides.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsString({ each: true })
  etiquettes?: string[];

  @ApiPropertyOptional({ example: 'Très bon garba, un peu de piment en plus.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  commentaire?: string;
}
