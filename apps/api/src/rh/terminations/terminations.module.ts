import { Module } from '@nestjs/common';
import { TerminationsController } from './terminations.controller';
import { TerminationsService } from './terminations.service';

@Module({
  controllers: [TerminationsController],
  providers: [TerminationsService],
})
export class TerminationsModule {}
