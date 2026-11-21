import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration, { validationSchema } from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { NavigationModule } from './modules/navigation/navigation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    // Événements métier (réservation créée → écran cuisine, notifications…).
    EventEmitterModule.forRoot(),
    PrismaModule,

    AuthModule,
    HealthModule,
    NavigationModule,
  ],
  providers: [
    // Toute route exige un JWT, sauf celles marquées @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // @Roles(...) restreint une route à certains rôles.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
