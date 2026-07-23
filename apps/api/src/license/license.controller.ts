import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipLicenseCheck } from '../common/decorators/skip-license-check.decorator';
import type { JwtPayload } from '../common/jwt-payload';
import { LicenseService } from './license.service';
import { UpdateLicenseDto } from './dto/update-license.dto';

@UseGuards(AuthGuard)
@SkipLicenseCheck()
@Controller('license')
export class LicenseController {
  constructor(private readonly service: LicenseService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.publicLicense(user.tenantId);
  }

  @Get('plans')
  plans() {
    return this.service.plans();
  }

  @Patch()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLicenseDto) {
    return this.service.update(user.tenantId, dto);
  }
}
