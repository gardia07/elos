import { Module } from '@nestjs/common';
import { RiskMapController } from './risk-map.controller';
import { RiskMapService } from './risk-map.service';

@Module({
  controllers: [RiskMapController],
  providers: [RiskMapService],
})
export class RiskMapModule {}
