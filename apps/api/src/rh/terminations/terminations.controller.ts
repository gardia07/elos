import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TerminationsService } from './terminations.service';
import {
  CreateTerminationDto,
  ExitInterviewDto,
  SetTerminationChecklistDto,
  ToggleTerminationDocDto,
  UpdateTerminationStatusDto,
} from './dto/terminations.dto';

@UseGuards(AuthGuard)
@Controller('rh/terminations')
export class TerminationsController {
  constructor(private readonly service: TerminationsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('checklist-config')
  getChecklistConfig() {
    return this.service.getChecklistConfig();
  }

  @Put('checklist-config')
  setChecklistConfig(@Body() dto: SetTerminationChecklistDto) {
    return this.service.setChecklistConfig(dto);
  }

  @Post()
  create(@Body() dto: CreateTerminationDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id/docs')
  toggleDoc(@Param('id') id: string, @Body() dto: ToggleTerminationDocDto) {
    return this.service.toggleDoc(id, dto);
  }

  @Post(':id/esocial')
  sendEsocial(@Param('id') id: string) {
    return this.service.sendEsocial(id);
  }

  @Post(':id/generate-termo')
  generateTermo(@Param('id') id: string) {
    return this.service.generateTermo(id);
  }

  @Post(':id/generate-carta')
  generateCarta(@Param('id') id: string) {
    return this.service.generateCarta(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTerminationStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':id/exit-interview')
  updateExitInterview(@Param('id') id: string, @Body() dto: ExitInterviewDto) {
    return this.service.updateExitInterview(id, dto);
  }
}
