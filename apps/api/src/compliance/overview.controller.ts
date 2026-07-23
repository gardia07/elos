import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ComplianceOverviewService } from './overview.service';

@UseGuards(AuthGuard)
@Controller('compliance/overview')
export class ComplianceOverviewController {
  constructor(private readonly service: ComplianceOverviewService) {}

  @Get()
  get() {
    return this.service.get();
  }
}
