import { Module } from '@nestjs/common';
import { MenusModule } from '../menus/menus.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({ imports: [MenusModule], controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}
