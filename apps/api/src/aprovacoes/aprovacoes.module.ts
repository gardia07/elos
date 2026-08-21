import { Module } from '@nestjs/common';
import { AprovacoesController } from './aprovacoes.controller';
import { AprovacoesService } from './aprovacoes.service';
import { VacationsModule } from '../rh/vacations/vacations.module';
import { TimeclockModule } from '../dp/timeclock/timeclock.module';
import { RecruitmentModule } from '../rh/recruitment/recruitment.module';
import { ComplianceEngineModule } from '../compliance-engine/compliance-engine.module';

@Module({
  imports: [VacationsModule, TimeclockModule, RecruitmentModule, ComplianceEngineModule],
  controllers: [AprovacoesController],
  providers: [AprovacoesService],
  exports: [AprovacoesService],
})
export class AprovacoesModule {}
