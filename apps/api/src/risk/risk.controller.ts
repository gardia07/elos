import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RiskEngineService } from './risk-engine.service';
import { UpdateRiskWeightDto } from './dto/update-risk-weight.dto';

@UseGuards(AuthGuard)
@Controller('risk')
export class RiskController {
  constructor(
    private readonly riskEngine: RiskEngineService,
    private readonly prisma: PrismaService,
  ) {}

  /** Avaliação completa (risco geral + por categoria + itens) usada pelo painel e pela tela de detalhe/drill-down. */
  @Get('evaluation')
  evaluation() {
    return this.riskEngine.evaluate();
  }

  /** Tabela de pesos de impacto — só quem administra a conta pode ver/editar (é configuração, não dado operacional). */
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Get('weights')
  weights() {
    return this.prisma.forCurrentTenant().riskImpactRule.findMany({
      orderBy: [{ categoria: 'asc' }, { tipo: 'asc' }],
    });
  }

  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @Patch('weights/:id')
  updateWeight(@Param('id') id: string, @Body() dto: UpdateRiskWeightDto) {
    return this.prisma.forCurrentTenant().riskImpactRule.update({ where: { id }, data: dto });
  }
}
