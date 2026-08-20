import { Module } from '@nestjs/common';
import { VacationsController } from './vacations.controller';
import { VacationsService } from './vacations.service';
import { ComplianceEngineModule } from '../../compliance-engine/compliance-engine.module';

@Module({
  imports: [ComplianceEngineModule],
  controllers: [VacationsController],
  providers: [VacationsService],
  exports: [VacationsService],
})
export class VacationsModule {}
