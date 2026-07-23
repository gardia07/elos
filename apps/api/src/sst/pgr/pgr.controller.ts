import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PgrService } from './pgr.service';
import { CreatePgrActionDto, UpdatePgrActionDto } from './dto/pgr.dto';

@UseGuards(AuthGuard)
@Controller('sst/pgr')
export class PgrController {
  constructor(private readonly service: PgrService) {}

  @Get('actions')
  listActions() {
    return this.service.listActions();
  }

  @Post('actions')
  createAction(@Body() dto: CreatePgrActionDto) {
    return this.service.createAction(dto);
  }

  @Patch('actions/:id')
  updateAction(@Param('id') id: string, @Body() dto: UpdatePgrActionDto) {
    return this.service.updateAction(id, dto);
  }

  @Get('pcmso-upcoming')
  pcmsoUpcoming() {
    return this.service.pcmsoUpcoming();
  }
}
