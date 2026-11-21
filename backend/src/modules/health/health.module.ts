import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** `PrismaModule` étant global, la sonde obtient `PrismaService` sans import explicite. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
