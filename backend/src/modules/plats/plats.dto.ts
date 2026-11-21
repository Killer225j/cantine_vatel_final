import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CategoriePlat } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreerPlatDto {
  @ApiProperty({ example: 'Attiéké poisson braisé' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Le nom du plat est obligatoire.' })
  @MaxLength(80)
  nom!: string;

  @ApiPropertyOptional({
    example: 'attieke-poisson-braise',
    description: 'Déduit du nom si absent',
  })
  @IsOptional()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Le slug ne contient que minuscules, chiffres et tirets.',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Capitaine braisé, attiéké frais, oignons, tomates.' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiProperty({ enum: CategoriePlat, enumName: 'CategoriePlat', example: CategoriePlat.PLAT })
  @IsEnum(CategoriePlat)
  categorie!: CategoriePlat;

  @ApiProperty({ example: 1500, description: 'Prix en FCFA' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  prix!: number;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  poidsPortionG?: number;

  @ApiPropertyOptional({
    example: 'https://cantine-vatel-backoffice.vercel.app/plats/attieke-poisson-braise.jpg',
  })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'La photo doit être une URL.' })
  photoUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  vegetarien?: boolean;

  @ApiPropertyOptional({ example: ['POISSONS'], description: 'Codes des allergènes présents' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  allergenes?: string[];
}

export class ModifierPlatDto extends PartialType(CreerPlatDto) {
  @ApiPropertyOptional({ description: 'Réactiver un plat archivé' })
  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class ListerPlatsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'attiéké' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: CategoriePlat, enumName: 'CategoriePlat' })
  @IsOptional()
  @IsEnum(CategoriePlat)
  categorie?: CategoriePlat;

  @ApiPropertyOptional({
    example: 'ARACHIDES',
    description: 'Seulement les plats contenant cet allergène',
  })
  @IsOptional()
  @IsString()
  allergene?: string;

  @ApiPropertyOptional({ description: 'Inclure les plats archivés' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  inclureArchives?: boolean;
}
