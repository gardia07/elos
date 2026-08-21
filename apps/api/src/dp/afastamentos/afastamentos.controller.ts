import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AfastamentosService } from './afastamentos.service';
import { CreateAfastamentoDto, RegistrarRetornoAfastamentoDto } from './dto/afastamentos.dto';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('dp/afastamentos')
export class AfastamentosController {
  constructor(private readonly service: AfastamentosService) {}

  @Get('motivos')
  listMotivos() {
    return this.service.listMotivos();
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAfastamentoDto) {
    return this.service.create(dto);
  }

  @Post(':id/retorno')
  registrarRetorno(@Param('id') id: string, @Body() dto: RegistrarRetornoAfastamentoDto) {
    return this.service.registrarRetorno(id, dto.retorno);
  }
}
