import { Module } from '@nestjs/common';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';

@Module({
  imports: [DocumentTemplatesModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
})
export class AdmissionsModule {}
