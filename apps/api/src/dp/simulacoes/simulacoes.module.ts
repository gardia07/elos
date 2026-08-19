import { Module } from '@nestjs/common';
import { FeriasModule } from '../../rh/ferias/ferias.module';
import { SimulacoesController } from './simulacoes.controller';
import { SimulacoesService } from './simulacoes.service';

@Module({
  imports: [FeriasModule],
  controllers: [SimulacoesController],
  providers: [SimulacoesService],
})
export class SimulacoesModule {}
