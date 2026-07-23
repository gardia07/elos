import { Module } from '@nestjs/common';
import { EloController } from './elo.controller';
import { EloService } from './elo.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AprovacoesModule } from '../aprovacoes/aprovacoes.module';
import { IndicadoresModule } from '../indicadores/indicadores.module';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [DashboardModule, AprovacoesModule, IndicadoresModule, AgendaModule],
  controllers: [EloController],
  providers: [EloService],
})
export class EloModule {}
