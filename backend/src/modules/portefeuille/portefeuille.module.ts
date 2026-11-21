import { Module } from '@nestjs/common';
import { PortefeuilleController } from './portefeuille.controller';

@Module({ controllers: [PortefeuilleController] })
export class PortefeuilleModule {}
