import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListerReservationsDto, ReserverDto, ScannerDto, ServirDto } from './reservations.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Réservations')
@ApiBearerAuth('access-token')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @Roles(Role.ELEVE)
  @ApiOperation({
    summary: 'Réserver un plat sur un créneau (débit immédiat, code RV-…)',
    description:
      'Erreurs : 400 MENU_NON_PUBLIE, DATE_PASSEE, SOLDE_INSUFFISANT ; 409 CRENEAU_COMPLET, DEJA_RESERVE.',
  })
  reserver(@CurrentUser() user: JwtPayload, @Body() dto: ReserverDto) {
    return this.reservations.reserver(user.sub, dto);
  }

  @Get('me')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Mes réservations : à venir (avec QR) et historique' })
  miennes(@CurrentUser() user: JwtPayload) {
    return this.reservations.miennes(user.sub);
  }

  @Get('me/:id')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Une de mes réservations' })
  uneDeMoi(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.reservations.uneDeMoi(user.sub, id);
  }

  @Delete(':id')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Annuler avant 10h le jour du repas (remboursement immédiat)' })
  annuler(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.reservations.annuler(user.sub, id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({
    summary: 'Commandes du jour : compteurs, filtres créneau / statut, alertes allergie',
  })
  lister(@Query() dto: ListerReservationsDto) {
    return this.reservations.lister(dto);
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({
    summary: 'Lire un code au comptoir (ne sert pas)',
    description:
      'Renvoie élève, plat, créneau et `alertesAllergie`. 404 CODE_INCONNU, 409 DEJA_SERVIE, 400 PAS_AUJOURDHUI.',
  })
  scanner(@Body() dto: ScannerDto) {
    return this.reservations.scanner(dto.code);
  }

  @Post(':id/servir')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({
    summary: 'Marquer servie',
    description:
      'Si le plat contient un allergène de l’élève : `controleAllergie: true` obligatoire (sinon 400 CONTROLE_ALLERGIE_REQUIS).',
  })
  servir(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ServirDto) {
    return this.reservations.servir(id, user.sub, dto.controleAllergie);
  }
}
