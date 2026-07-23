import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { NrTrainingsService } from './nr-trainings.service';
import { CreateNrTrainingDto } from './dto/nr-trainings.dto';

@UseGuards(AuthGuard)
@Controller('sst/nr-trainings')
export class NrTrainingsController {
  constructor(private readonly service: NrTrainingsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('by-curso')
  byCurso() {
    return this.service.byCurso();
  }

  @Get('kpis')
  kpis() {
    return this.service.kpis();
  }

  @Post()
  create(@Body() dto: CreateNrTrainingDto) {
    return this.service.create(dto);
  }
}
