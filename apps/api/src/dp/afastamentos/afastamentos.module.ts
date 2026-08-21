import { Module } from '@nestjs/common';
import { AfastamentosController } from './afastamentos.controller';
import { AfastamentosService } from './afastamentos.service';
import { ComplianceEngineModule } from '../../compliance-engine/compliance-engine.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [ComplianceEngineModule, AuditModule],
  controllers: [AfastamentosController],
  providers: [AfastamentosService],
  exports: [AfastamentosService],
})
export class AfastamentosModule {}
