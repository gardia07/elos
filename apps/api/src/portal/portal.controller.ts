import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../common/guards/auth.guard';
import { PortalSafe } from '../common/decorators/portal-safe.decorator';
import { PortalService } from './portal.service';
import { RequestPortalVacationDto } from './dto/portal.dto';

const anexoPendenciaUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    const ok = /\.(pdf|jpe?g|png)$/i.test(file.originalname);
    cb(ok ? null : new BadRequestException('Envie um arquivo .pdf, .jpg ou .png.'), ok);
  },
};

@PortalSafe()
@UseGuards(AuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('me')
  me() {
    return this.service.me();
  }

  @Get('documentos')
  documentos() {
    return this.service.documentos();
  }

  @Get('historico')
  historico() {
    return this.service.historico();
  }

  @Get('ferias')
  ferias() {
    return this.service.ferias();
  }

  @Post('ferias')
  requestFerias(@Body() dto: RequestPortalVacationDto) {
    return this.service.requestFerias(dto);
  }

  @Get('holerites')
  holerites() {
    return this.service.holerites();
  }

  @Get('pendencias')
  pendencias() {
    return this.service.pendencias();
  }

  @Post('pendencias/:id/anexar')
  @UseInterceptors(FileInterceptor('arquivo', anexoPendenciaUploadOptions))
  anexarPendencia(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    return this.service.anexarDocumentoPendencia(id, file);
  }
}
