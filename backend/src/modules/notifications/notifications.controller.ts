import { Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mes notifications, non lues d’abord' })
  async moi(@CurrentUser() user: JwtPayload) {
    const items = await this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: [{ lue: 'asc' }, { creeLe: 'desc' }],
      take: 50,
    });
    return { nonLues: items.filter((n) => !n.lue).length, notifications: items };
  }

  @Patch(':id/lue')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async lue(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const r = await this.prisma.notification.updateMany({
      where: { id, userId: user.sub },
      data: { lue: true },
    });
    if (r.count === 0) throw new NotFoundException('Notification introuvable.');
    return { id, lue: true };
  }

  @Post('me/tout-lire')
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  async toutLire(@CurrentUser() user: JwtPayload) {
    const r = await this.prisma.notification.updateMany({
      where: { userId: user.sub, lue: false },
      data: { lue: true },
    });
    return { marquees: r.count };
  }
}
