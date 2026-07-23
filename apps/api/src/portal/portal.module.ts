import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { DocumentsModule } from '../rh/documents/documents.module';
import { VacationsModule } from '../rh/vacations/vacations.module';

@Module({
  imports: [DocumentsModule, VacationsModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
