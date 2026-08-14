import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ComplianceOverviewService } from './overview.service';

@Roles('ADMIN', 'COMPLIANCE', 'COMITE_ETICA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('compliance/overview')
export class ComplianceOverviewController {
  constructor(private readonly service: ComplianceOverviewService) {}

  @Get()
  get() {
    return this.service.get();
  }
}
