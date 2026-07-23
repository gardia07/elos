import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ExamsService } from './exams.service';
import { CreateExamDto, RegisterResultDto } from './dto/exams.dto';

@UseGuards(AuthGuard)
@Controller('sst/exams')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

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
  create(@Body() dto: CreateExamDto) {
    return this.service.create(dto);
  }

  @Post(':id/result')
  registerResult(@Param('id') id: string, @Body() dto: RegisterResultDto) {
    return this.service.registerResult(id, dto);
  }

  @Post(':id/esocial')
  sendEsocial(@Param('id') id: string) {
    return this.service.sendEsocial(id);
  }
}
