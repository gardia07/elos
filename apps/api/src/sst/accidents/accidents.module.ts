import { Module } from '@nestjs/common';
import { AccidentsController } from './accidents.controller';
import { AccidentsService } from './accidents.service';
import { ComplianceEngineModule } from '../../compliance-engine/compliance-engine.module';

@Module({
  imports: [ComplianceEngineModule],
  controllers: [AccidentsController],
  providers: [AccidentsService],
})
export class AccidentsModule {}
