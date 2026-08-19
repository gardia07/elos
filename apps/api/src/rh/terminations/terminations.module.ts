import { Module } from '@nestjs/common';
import { TerminationsController } from './terminations.controller';
import { TerminationsService } from './terminations.service';
import { DocumentTemplatesModule } from '../document-templates/document-templates.module';
import { FeriasModule } from '../ferias/ferias.module';

@Module({
  imports: [DocumentTemplatesModule, FeriasModule],
  controllers: [TerminationsController],
  providers: [TerminationsService],
})
export class TerminationsModule {}
