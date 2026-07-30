import { Module } from '@nestjs/common';
import { TerminationsController } from './terminations.controller';
import { TerminationsService } from './terminations.service';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';

@Module({
  imports: [DocumentTemplatesModule],
  controllers: [TerminationsController],
  providers: [TerminationsService],
})
export class TerminationsModule {}
