import { Module } from '@nestjs/common';
import { NrTrainingsController } from './nr-trainings.controller';
import { NrTrainingsService } from './nr-trainings.service';

@Module({
  controllers: [NrTrainingsController],
  providers: [NrTrainingsService],
})
export class NrTrainingsModule {}
