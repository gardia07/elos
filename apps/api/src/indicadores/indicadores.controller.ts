import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { IndicadoresService } from './indicadores.service';

@UseGuards(AuthGuard)
@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

  @Get('headcount')
  headcount() {
    return this.service.headcount();
  }

  @Get('custo-contratacao')
  custoContratacao() {
    return this.service.custoMedioContratacao();
  }

  @Get('turnover')
  turnover() {
    return this.service.turnover();
  }

  @Get('diversidade')
  diversidade() {
    return this.service.diversidade();
  }
}
