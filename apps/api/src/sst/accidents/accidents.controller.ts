import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AccidentsService } from './accidents.service';
import { CloseAccidentDto, CreateAccidentDto, UpdateInvestigationDto } from './dto/accidents.dto';

@UseGuards(AuthGuard)
@Controller('sst/accidents')
export class AccidentsController {
  constructor(private readonly service: AccidentsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('kpis')
  kpis() {
    return this.service.kpis();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateAccidentDto) {
    return this.service.create(dto);
  }

  @Post(':id/esocial')
  sendEsocial(@Param('id') id: string) {
    return this.service.sendEsocial(id);
  }

  @Post(':id/investigation')
  updateInvestigation(@Param('id') id: string, @Body() dto: UpdateInvestigationDto) {
    return this.service.updateInvestigation(id, dto);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseAccidentDto) {
    return this.service.close(id, dto);
  }
}
