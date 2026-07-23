import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AprovacoesService, ApprovalItem } from './aprovacoes.service';

@UseGuards(AuthGuard)
@Controller('aprovacoes')
export class AprovacoesController {
  constructor(private readonly service: AprovacoesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('kpis')
  kpis() {
    return this.service.kpis();
  }

  @Post(':tipo/:id/approve')
  approve(@Param('tipo') tipo: ApprovalItem['tipo'], @Param('id') id: string) {
    return this.service.approve(tipo, id);
  }

  @Post(':tipo/:id/reject')
  reject(@Param('tipo') tipo: ApprovalItem['tipo'], @Param('id') id: string) {
    return this.service.reject(tipo, id);
  }
}
