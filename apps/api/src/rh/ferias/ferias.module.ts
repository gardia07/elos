import { Module } from '@nestjs/common';
import { FeriasController } from './ferias.controller';
import { FeriasService } from './ferias.service';
import { FeriasCronService } from './ferias-cron.service';

@Module({
  controllers: [FeriasController],
  providers: [FeriasService, FeriasCronService],
  exports: [FeriasService],
})
export class FeriasModule {}
