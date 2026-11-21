import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StocksService } from './stocks.service';

export class MouvementStockDto {
  @ApiProperty({ enum: ['ENTREE', 'SORTIE'] })
  @IsIn(['ENTREE', 'SORTIE'], { message: 'Le type est ENTREE ou SORTIE.' })
  type!: 'ENTREE' | 'SORTIE';

  @ApiProperty({
    example: 12.5,
    description: 'Quantité (dans l’unité de l’article), strictement positive.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'La quantité doit être positive.' })
  @Max(100000)
  quantite!: number;

  @ApiProperty({ example: 'Livraison fournisseur' })
  @IsString()
  @IsNotEmpty({ message: 'Le motif est obligatoire.' })
  @MaxLength(80)
  motif!: string;

  @ApiPropertyOptional({ example: 'Bon de livraison n° 214' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

@ApiTags('Stocks')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.CUISINE)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

  @Get()
  @ApiOperation({
    summary: 'Articles suivis (OK / Bas / Rupture), compteurs et derniers mouvements',
  })
  lister() {
    return this.stocks.lister();
  }

  @Post(':id/mouvements')
  @ApiOperation({
    summary: 'Enregistrer une entrée ou une sortie de stock',
    description: 'Erreur : 400 STOCK_INSUFFISANT si la sortie dépasse la quantité disponible.',
  })
  mouvement(@Param('id') id: string, @Body() dto: MouvementStockDto) {
    return this.stocks.mouvement(id, dto);
  }
}
