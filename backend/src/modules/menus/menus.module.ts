import { Module } from '@nestjs/common';
import { PlatsModule } from '../plats/plats.module';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

@Module({
  imports: [PlatsModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
