import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { DocumentsModule } from '../rh/documents/documents.module';
import { FeriasModule } from '../rh/ferias/ferias.module';
import { ComplianceEngineModule } from '../compliance-engine/compliance-engine.module';

@Module({
  imports: [DocumentsModule, FeriasModule, ComplianceEngineModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
