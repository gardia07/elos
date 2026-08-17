import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { LembretesCronService } from './lembretes-cron.service';
import { ProjetosController } from './projetos/projetos.controller';
import { ProjetosService } from './projetos/projetos.service';

@Module({
  controllers: [AgendaController, ProjetosController],
  providers: [AgendaService, LembretesCronService, ProjetosService],
  exports: [AgendaService],
})
export class AgendaModule {}
