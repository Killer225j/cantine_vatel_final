import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration, { validationSchema } from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { ReferentielsModule } from './modules/referentiels/referentiels.module';
import { PlatsModule } from './modules/plats/plats.module';
import { MenusModule } from './modules/menus/menus.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PortefeuilleModule } from './modules/portefeuille/portefeuille.module';
import { StatsModule } from './modules/stats/stats.module';
import { ParentsModule } from './modules/parents/parents.module';
import { RechargesModule } from './modules/recharges/recharges.module';
import { AntiGaspiModule } from './modules/anti-gaspi/anti-gaspi.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { ComptesModule } from './modules/comptes/comptes.module';
import { RapportsModule } from './modules/rapports/rapports.module';

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
    // Limite de débit : 300 requêtes par minute et par adresse (30 par minute sur la connexion).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    NavigationModule,
    ReferentielsModule,
    PlatsModule,
    MenusModule,
    ReservationsModule,
    PortefeuilleModule,
    StatsModule,
    ParentsModule,
    RechargesModule,
    AntiGaspiModule,
    NotificationsModule,
    StocksModule,
    ComptesModule,
    RapportsModule,
  ],
  providers: [
    // Toute route exige un JWT, sauf celles marquées @Public().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // @Roles(...) restreint une route à certains rôles.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
