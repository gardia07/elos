import { Module } from '@nestjs/common';
import { SimulacoesController } from './simulacoes.controller';
import { SimulacoesService } from './simulacoes.service';

@Module({
  controllers: [SimulacoesController],
  providers: [SimulacoesService],
})
export class SimulacoesModule {}
