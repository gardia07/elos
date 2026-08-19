import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { DocumentsModule } from '../rh/documents/documents.module';
import { FeriasModule } from '../rh/ferias/ferias.module';

@Module({
  imports: [DocumentsModule, FeriasModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
