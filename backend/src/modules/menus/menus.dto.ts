import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { FORMAT_JOUR } from '../../common/utils/dates.util';

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SemaineDto {
  @ApiPropertyOptional({
    example: '2026-11-23',
    description: 'Un jour de la semaine voulue (défaut : aujourd’hui)',
  })
  @IsOptional()
  @Matches(FORMAT_JOUR, { message: 'Date attendue au format AAAA-MM-JJ.' })
  debut?: string;

  @ApiPropertyOptional({ description: "Pour un parent : l'enfant dont on vérifie les allergies" })
  @IsOptional()
  @IsString()
  enfantId?: string;
}

export class ItemMenuDto {
  @ApiProperty()
  @IsString()
  platId!: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Portions prévues (0 = à calculer par la prévision)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  portionsPrevues?: number;
}

export class ComposerMenuDto {
  @ApiProperty({ type: [ItemMenuDto], description: 'Remplace la liste des plats du jour' })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ItemMenuDto)
  items!: ItemMenuDto[];
}

export class CreneauDto {
  @ApiProperty({ example: '12:15' })
  @Matches(HEURE, { message: 'Heure attendue au format HH:MM.' })
  heureDebut!: string;

  @ApiProperty({ example: '12:30' })
  @Matches(HEURE, { message: 'Heure attendue au format HH:MM.' })
  heureFin!: string;

  @ApiProperty({ example: 40 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacite!: number;
}

export class DefinirCreneauxDto {
  @ApiProperty({ type: [CreneauDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreneauDto)
  creneaux!: CreneauDto[];
}

/** Les créneaux posés par défaut sur un nouveau menu : 11h45 → 13h00, 40 couverts. */
export const CRENEAUX_PAR_DEFAUT: CreneauDto[] = [
  { heureDebut: '11:45', heureFin: '12:00', capacite: 40 },
  { heureDebut: '12:00', heureFin: '12:15', capacite: 40 },
  { heureDebut: '12:15', heureFin: '12:30', capacite: 40 },
  { heureDebut: '12:30', heureFin: '12:45', capacite: 40 },
  { heureDebut: '12:45', heureFin: '13:00', capacite: 40 },
];
