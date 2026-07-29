import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { SimulacoesService } from './simulacoes.service';
import { SimularFeriasDto, SimularRescisaoDto } from './dto/simulacoes.dto';

@UseGuards(AuthGuard)
@Controller('dp/simulacoes')
export class SimulacoesController {
  constructor(private readonly service: SimulacoesService) {}

  @Post('ferias')
  simularFerias(@Body() dto: SimularFeriasDto) {
    return this.service.simularFerias(dto);
  }

  @Post('rescisao')
  simularRescisao(@Body() dto: SimularRescisaoDto) {
    return this.service.simularRescisao(dto);
  }
}
