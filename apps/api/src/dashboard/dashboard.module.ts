import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ComplianceModule } from '../compliance/compliance.module';
import { DocumentsModule } from '../rh/documents/documents.module';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [ComplianceModule, DocumentsModule, LicenseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
