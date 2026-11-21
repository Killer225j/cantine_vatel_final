import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreerPlatDto, ListerPlatsDto, ModifierPlatDto } from './plats.dto';
import { PlatsService } from './plats.service';

@ApiTags('Plats')
@ApiBearerAuth('access-token')
@Controller('plats')
export class PlatsController {
  constructor(private readonly plats: PlatsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CUISINE)
  @ApiOperation({ summary: 'Catalogue : recherche, catégorie, allergène, pagination' })
  lister(@Query() dto: ListerPlatsDto) {
    return this.plats.lister(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un plat : allergènes, note moyenne, derniers avis" })
  detail(@Param('id') id: string) {
    return this.plats.detail(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Créer un plat' })
  creer(@Body() dto: CreerPlatDto) {
    return this.plats.creer(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifier un plat (prix, allergènes, photo…)' })
  modifier(@Param('id') id: string, @Body() dto: ModifierPlatDto) {
    return this.plats.modifier(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archiver un plat (il ne sera plus proposé dans les menus)' })
  archiver(@Param('id') id: string) {
    return this.plats.archiver(id);
  }
}
