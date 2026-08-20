import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskEngineService } from './risk-engine.service';
import { DocumentsModule } from '../rh/documents/documents.module';
import { FeriasModule } from '../rh/ferias/ferias.module';

@Module({
  imports: [DocumentsModule, FeriasModule],
  controllers: [RiskController],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskModule {}
