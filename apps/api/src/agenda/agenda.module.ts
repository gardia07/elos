import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { LembretesCronService } from './lembretes-cron.service';

@Module({
  controllers: [AgendaController],
  providers: [AgendaService, LembretesCronService],
  exports: [AgendaService],
})
export class AgendaModule {}
