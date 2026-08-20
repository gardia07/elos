import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { FeriasModule } from '../ferias/ferias.module';
import { ComplianceEngineModule } from '../../compliance-engine/compliance-engine.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [DocumentsModule, FeriasModule, ComplianceEngineModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
