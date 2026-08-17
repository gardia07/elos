import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AtalhosExternosService } from './atalhos-externos.service';
import { CreateAtalhoDto, UpdateAtalhoDto } from './dto/atalhos-externos.dto';

@UseGuards(AuthGuard)
@Controller('ferramentas/atalhos-externos')
export class AtalhosExternosController {
  constructor(private readonly service: AtalhosExternosService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateAtalhoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAtalhoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
