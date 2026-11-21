import { Module } from '@nestjs/common';
import { AntiGaspiController } from './anti-gaspi.controller';
import { AntiGaspiService } from './anti-gaspi.service';

@Module({ controllers: [AntiGaspiController], providers: [AntiGaspiService] })
export class AntiGaspiModule {}
