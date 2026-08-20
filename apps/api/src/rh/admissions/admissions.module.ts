import { Module } from '@nestjs/common';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';
import { ComplianceEngineModule } from '../../compliance-engine/compliance-engine.module';

@Module({
  imports: [DocumentTemplatesModule, ComplianceEngineModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
})
export class AdmissionsModule {}
