import { Module } from '@nestjs/common';
import { PgrController } from './pgr.controller';
import { PgrService } from './pgr.service';

@Module({
  controllers: [PgrController],
  providers: [PgrService],
})
export class PgrModule {}
