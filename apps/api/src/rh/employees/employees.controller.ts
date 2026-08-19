import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmployeesService } from './employees.service';
import {
  AddContatoEmergenciaDto,
  AddDependenteDto,
  AddOcorrenciaDto,
  CreateEmployeeDto,
  ListEmployeesQueryDto,
  PromoteEmployeeDto,
  RemoveCargoSalarioHistoricoDto,
  UpdateCargoSalarioHistoricoDto,
  UpdateEmployeeDto,
} from './dto/employees.dto';

const documentoUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const ok = /\.(pdf|jpe?g|png|docx?)$/i.test(file.originalname);
    cb(
      ok
        ? null
        : new BadRequestException(
            'Envie um arquivo .pdf, .jpg, .png ou .doc/.docx.',
          ),
      ok,
    );
  },
};

@Roles('ADMIN', 'RH_GENERALISTA', 'GESTOR_AREA')
@UseGuards(AuthGuard, RolesGuard)
@Controller('rh/employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  list(@Query() query: ListEmployeesQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get('org-chart')
  orgChart() {
    return this.service.orgChart();
  }

  @Get('filter-options')
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get('managers')
  managers(@Query('excludeId') excludeId?: string) {
    return this.service.managers(excludeId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/promote')
  promote(@Param('id') id: string, @Body() dto: PromoteEmployeeDto) {
    return this.service.promote(id, dto);
  }

  @Patch(':id/cargo-salario-historico/:historicoId')
  updateCargoSalarioHistorico(
    @Param('id') id: string,
    @Param('historicoId') historicoId: string,
    @Body() dto: UpdateCargoSalarioHistoricoDto,
  ) {
    return this.service.updateCargoSalarioHistorico(id, historicoId, dto);
  }

  @Delete(':id/cargo-salario-historico/:historicoId')
  removeCargoSalarioHistorico(
    @Param('id') id: string,
    @Param('historicoId') historicoId: string,
    @Body() dto: RemoveCargoSalarioHistoricoDto,
  ) {
    return this.service.removeCargoSalarioHistorico(id, historicoId, dto);
  }

  @Post(':id/dependentes')
  addDependente(@Param('id') id: string, @Body() dto: AddDependenteDto) {
    return this.service.addDependente(id, dto);
  }

  @Post(':id/contatos-emergencia')
  addContatoEmergencia(
    @Param('id') id: string,
    @Body() dto: AddContatoEmergenciaDto,
  ) {
    return this.service.addContatoEmergencia(id, dto);
  }

  @Delete(':id/contatos-emergencia/:contatoId')
  removeContatoEmergencia(
    @Param('id') id: string,
    @Param('contatoId') contatoId: string,
  ) {
    return this.service.removeContatoEmergencia(id, contatoId);
  }

  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('arquivo', documentoUploadOptions))
  addDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('tipo') tipo: string,
    @Body('nome') nome?: string,
    @Body('terminationId') terminationId?: string,
    @Body('vacationRequestId') vacationRequestId?: string,
    @Body('leaveRecordId') leaveRecordId?: string,
    @Body('fracaoDeFeriasId') fracaoDeFeriasId?: string,
  ) {
    if (!file)
      throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    if (!tipo) throw new BadRequestException('Informe o tipo do documento.');
    return this.service.addDocumento(id, file, tipo, nome, terminationId, vacationRequestId, leaveRecordId, fracaoDeFeriasId);
  }

  @Get(':id/documentos/:documentoId/arquivo')
  async getDocumentoArquivo(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
  ) {
    const { stream, contentType, nome } =
      await this.service.getDocumentoArquivo(id, documentoId);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: `inline; filename="${encodeURIComponent(nome)}"`,
    });
  }

  @Delete(':id/documentos/:documentoId')
  removeDocumento(
    @Param('id') id: string,
    @Param('documentoId') documentoId: string,
  ) {
    return this.service.removeDocumento(id, documentoId);
  }

  @Post(':id/ocorrencias')
  addOcorrencia(@Param('id') id: string, @Body() dto: AddOcorrenciaDto) {
    return this.service.addOcorrencia(id, dto);
  }

  @Delete(':id/ocorrencias/:ocorrenciaId')
  removeOcorrencia(
    @Param('id') id: string,
    @Param('ocorrenciaId') ocorrenciaId: string,
  ) {
    return this.service.removeOcorrencia(id, ocorrenciaId);
  }

  @Post(':id/historico/:historicoId/reverter')
  reverterExclusao(
    @Param('id') id: string,
    @Param('historicoId') historicoId: string,
  ) {
    return this.service.reverterExclusao(id, historicoId);
  }

  @Post(':id/ocorrencias/:ocorrenciaId/documentos')
  @UseInterceptors(FileInterceptor('arquivo', documentoUploadOptions))
  addOcorrenciaDocumento(
    @Param('id') id: string,
    @Param('ocorrenciaId') ocorrenciaId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('nome') nome?: string,
  ) {
    if (!file)
      throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    return this.service.addOcorrenciaDocumento(id, ocorrenciaId, file, nome);
  }
}
