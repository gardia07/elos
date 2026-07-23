import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PortalService } from './portal.service';
import { RequestPortalVacationDto } from './dto/portal.dto';

@UseGuards(AuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('me')
  me() {
    return this.service.me();
  }

  @Get('documentos')
  documentos() {
    return this.service.documentos();
  }

  @Get('historico')
  historico() {
    return this.service.historico();
  }

  @Get('ferias')
  ferias() {
    return this.service.ferias();
  }

  @Post('ferias')
  requestFerias(@Body() dto: RequestPortalVacationDto) {
    return this.service.requestFerias(dto);
  }

  @Get('holerites')
  holerites() {
    return this.service.holerites();
  }
}
