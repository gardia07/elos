import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { DocumentsModule } from '../rh/documents/documents.module';

@Module({
  imports: [ComplianceModule, DocumentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
