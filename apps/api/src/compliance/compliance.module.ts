import { Module } from '@nestjs/common';
import { EthicsController } from './ethics/ethics.controller';
import { EthicsService } from './ethics/ethics.service';
import { PoliciesController } from './policies/policies.controller';
import { PoliciesService } from './policies/policies.service';
import { ComplianceOverviewController } from './overview.controller';
import { ComplianceOverviewService } from './overview.service';

@Module({
  controllers: [EthicsController, PoliciesController, ComplianceOverviewController],
  providers: [EthicsService, PoliciesService, ComplianceOverviewService],
  exports: [ComplianceOverviewService],
})
export class ComplianceModule {}
