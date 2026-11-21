import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';

/** Pas de service ni de repository : la navigation est une donnée de configuration. */
@Module({ controllers: [NavigationController] })
export class NavigationModule {}
