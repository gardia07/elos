import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AdmissionsService } from './admissions.service';
import { SetChecklistConfigDto, ToggleDocDto } from './dto/admissions.dto';

@UseGuards(AuthGuard)
@Controller('rh/admissions')
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('checklist-config')
  getChecklistConfig(@Query('filial') filial: string) {
    return this.service.getChecklistConfig(filial);
  }

  @Put('checklist-config')
  setChecklistConfig(@Body() dto: SetChecklistConfigDto) {
    return this.service.setChecklistConfig(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id/docs')
  toggleDoc(@Param('id') id: string, @Body() dto: ToggleDocDto) {
    return this.service.toggleDoc(id, dto);
  }

  @Post(':id/esocial')
  sendEsocial(@Param('id') id: string) {
    return this.service.sendEsocial(id);
  }

  @Post(':id/contract')
  generateContract(@Param('id') id: string) {
    return this.service.generateContract(id);
  }

  @Post(':id/sign')
  signContract(@Param('id') id: string) {
    return this.service.signContract(id);
  }

  @Post(':id/efetivar')
  efetivar(@Param('id') id: string) {
    return this.service.efetivar(id);
  }
}
