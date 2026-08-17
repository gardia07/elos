import { Module } from '@nestjs/common';
import { PlannerController } from './planner.controller';
import { MetasService } from './metas.service';
import { HabitosService } from './habitos.service';
import { FinancasService } from './financas.service';
import { HumorService } from './humor.service';
import { CicloService } from './ciclo.service';
import { PesoMedidaService } from './peso-medida.service';
import { RodaDaVidaService } from './roda-da-vida.service';
import { RevisaoMensalService } from './revisao-mensal.service';

@Module({
  controllers: [PlannerController],
  providers: [MetasService, HabitosService, FinancasService, HumorService, CicloService, PesoMedidaService, RodaDaVidaService, RevisaoMensalService],
})
export class PlannerModule {}
