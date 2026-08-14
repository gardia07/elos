import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RiskMapService } from './risk-map.service';
import { CreateRiskMapEntryDto } from './dto/risk-map.dto';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('sst/risk-map')
export class RiskMapController {
  constructor(private readonly service: RiskMapService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateRiskMapEntryDto) {
    return this.service.create(dto);
  }

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Post('esocial')
  sendEsocial() {
    return this.service.sendEsocial();
  }
}
