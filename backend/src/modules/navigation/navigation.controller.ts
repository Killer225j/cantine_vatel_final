import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { NavigationDto } from './dto/navigation.dto';
import { NAVIGATIONS, accueil } from './navigation.definition';

@ApiTags('Navigation')
@ApiBearerAuth('access-token')
@Controller('navigation')
export class NavigationController {
  @Get()
  @ApiOperation({
    summary: 'La navigation du back-office pour le rôle connecté',
    description: 'Un rôle sans écran de back-office (ELEVE, PARENT) reçoit un menu vide.',
  })
  @ApiOkResponse({ type: NavigationDto })
  lire(@CurrentUser() user: JwtPayload): NavigationDto {
    const role = user.role as Role;
    const menu = NAVIGATIONS[role] ?? [];
    return { role, menu, accueil: accueil(menu) };
  }
}
