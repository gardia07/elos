import { Module } from '@nestjs/common';
import { ComplianceEngineController } from './compliance-engine.controller';
import { ComplianceEngineService } from './compliance-engine.service';
import { ComplianceEngineCronService } from './compliance-engine-cron.service';

@Module({
  controllers: [ComplianceEngineController],
  providers: [ComplianceEngineService, ComplianceEngineCronService],
  exports: [ComplianceEngineService],
})
export class ComplianceEngineModule {}
