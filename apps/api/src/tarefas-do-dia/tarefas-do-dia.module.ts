import { Module } from '@nestjs/common';
import { TarefasDoDiaController } from './tarefas-do-dia.controller';
import { TarefasDoDiaService } from './tarefas-do-dia.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AgendaModule } from '../agenda/agenda.module';
import { AprovacoesModule } from '../aprovacoes/aprovacoes.module';

@Module({
  imports: [DashboardModule, AgendaModule, AprovacoesModule],
  controllers: [TarefasDoDiaController],
  providers: [TarefasDoDiaService],
})
export class TarefasDoDiaModule {}
