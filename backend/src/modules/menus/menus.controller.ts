import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { FORMAT_JOUR } from '../../common/utils/dates.util';
import { ComposerMenuDto, DefinirCreneauxDto, SemaineDto } from './menus.dto';
import { MenusService } from './menus.service';

function jourValide(jour: string): string {
  if (!FORMAT_JOUR.test(jour)) throw new BadRequestException('Date attendue au format AAAA-MM-JJ.');
  return jour;
}

@ApiTags('Menus')
@ApiBearerAuth('access-token')
@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get('semaine')
  @ApiOperation({
    summary: 'Menus du lundi au vendredi',
    description:
      'Élèves et parents ne voient que les menus publiés. Chaque plat porte `incompatible` et `conflits` selon les allergies de l’élève (ou de l’enfant, pour un parent avec `enfantId`).',
  })
  semaine(@CurrentUser() user: JwtPayload, @Query() dto: SemaineDto) {
    return this.menus.semaine(user, dto.debut, dto.enfantId);
  }

  @Get(':date')
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({ summary: "Menu d'un jour, ses plats et ses créneaux (places restantes)" })
  jour(@CurrentUser() user: JwtPayload, @Param('date') date: string, @Query() dto: SemaineDto) {
    return this.menus.jour(user, jourValide(date), dto.enfantId);
  }

  @Get(':date/creneaux')
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({ summary: 'Créneaux du jour : réservés, places restantes, complet' })
  creneaux(@CurrentUser() user: JwtPayload, @Param('date') date: string) {
    return this.menus.creneaux(user, jourValide(date));
  }

  @Put(':date')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({
    summary: 'Composer le menu du jour (brouillon, créneaux par défaut à la création)',
  })
  composer(@Param('date') date: string, @Body() dto: ComposerMenuDto) {
    return this.menus.composer(jourValide(date), dto);
  }

  @Post(':date/publier')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({ summary: 'Publier : le menu devient visible et réservable sur le mobile' })
  publier(@Param('date') date: string) {
    return this.menus.publier(jourValide(date), true);
  }

  @Post(':date/depublier')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({ summary: 'Repasser le menu en brouillon' })
  depublier(@Param('date') date: string) {
    return this.menus.publier(jourValide(date), false);
  }

  @Put(':date/creneaux')
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'date', example: '2026-11-23' })
  @ApiOperation({ summary: 'Définir les créneaux et leur capacité (avant toute réservation)' })
  definirCreneaux(@Param('date') date: string, @Body() dto: DefinirCreneauxDto) {
    return this.menus.definirCreneaux(jourValide(date), dto);
  }
}
