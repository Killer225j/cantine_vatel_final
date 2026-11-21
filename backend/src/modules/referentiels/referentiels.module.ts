import { Module } from '@nestjs/common';
import { ReferentielsController } from './referentiels.controller';

@Module({ controllers: [ReferentielsController] })
export class ReferentielsModule {}
