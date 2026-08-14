import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DocumentTemplatesService } from './document-templates.service';
import { UpdateDocumentTemplateDto } from './dto/document-templates.dto';

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('rh/document-templates')
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get()
  list(@Query('tipo') tipo?: string) {
    return this.service.list(tipo);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentTemplateDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/restaurar-padrao')
  restaurarPadrao(@Param('id') id: string) {
    return this.service.restaurarPadrao(id);
  }
}
