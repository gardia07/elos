import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { FeriasModule } from '../ferias/ferias.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [DocumentsModule, FeriasModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
