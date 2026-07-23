import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DeadlinesService } from './deadlines.service';
import { CreateDeadlineDto, UpdateDeadlineDto } from './dto/deadlines.dto';

@UseGuards(AuthGuard)
@Controller('dp/deadlines')
export class DeadlinesController {
  constructor(private readonly service: DeadlinesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateDeadlineDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeadlineDto) {
    return this.service.update(id, dto);
  }
}
