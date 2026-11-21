import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ParentsService } from './parents.service';

export class LierEnfantDto {
  @ApiProperty({
    example: 'KOF-4821',
    description: 'Code de liaison affiché dans le profil de l’élève.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code de liaison est obligatoire.' })
  @MaxLength(20)
  codeLiaison!: string;
}

export class ReglagesEnfantDto {
  @ApiProperty({ example: 2000, description: 'Solde (FCFA) sous lequel une alerte est envoyée.' })
  @IsInt()
  @Min(0)
  @Max(50000)
  seuilAlerte!: number;
}

@ApiTags('Parents')
@ApiBearerAuth('access-token')
@Roles(Role.PARENT)
@Controller('parents/me/enfants')
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Post()
  @ApiOperation({ summary: 'Lier un enfant grâce à son code de liaison' })
  lier(@CurrentUser() user: JwtPayload, @Body() dto: LierEnfantDto) {
    return this.parents.lier(user.sub, dto.codeLiaison);
  }

  @Get()
  @ApiOperation({ summary: 'Mes enfants : solde, alerte de solde bas, repas du jour' })
  enfants(@CurrentUser() user: JwtPayload) {
    return this.parents.enfants(user.sub);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Historique d’un enfant : recharges, repas, remboursements' })
  transactions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() dto: PaginationDto,
  ) {
    return this.parents.transactions(user.sub, id, dto.page ?? 1, dto.limit ?? 20);
  }

  @Patch(':id/reglages')
  @ApiOperation({ summary: 'Régler le seuil d’alerte de solde bas d’un enfant' })
  reglages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReglagesEnfantDto,
  ) {
    return this.parents.reglages(user.sub, id, dto.seuilAlerte);
  }
}
