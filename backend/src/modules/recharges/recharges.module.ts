import { Module } from '@nestjs/common';
import { ParentsModule } from '../parents/parents.module';
import { RechargesController } from './recharges.controller';
import { RechargesService } from './recharges.service';

@Module({
  imports: [ParentsModule],
  controllers: [RechargesController],
  providers: [RechargesService],
})
export class RechargesModule {}
