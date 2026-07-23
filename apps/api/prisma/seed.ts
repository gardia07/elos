import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('elos123456', 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Grupo Vitalis Ind.',
      slug: 'grupo-vitalis',
      users: {
        create: [
          { email: 'admin@vitalis.com', passwordHash, name: 'Marina Alves', role: 'ADMIN' },
          { email: 'rh@vitalis.com', passwordHash, name: 'Carlos Menezes', role: 'RH_GENERALISTA' },
        ],
      },
    },
  });

  // Session var must be set for every write from here on — the RLS policies
  // key off it. `false` (persist) keeps it set for the rest of this script.
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, false)`;

  const filiais = ['Matriz SP', 'Filial RJ', 'Filial MG'];
  const admissaoKeys: { key: string; nome: string }[] = [
    { key: 'rg', nome: 'RG' },
    { key: 'cpf', nome: 'CPF' },
    { key: 'ctps', nome: 'Carteira de Trabalho' },
    { key: 'comprovante', nome: 'Comprovante de residência' },
    { key: 'exame', nome: 'Exame admissional' },
    { key: 'titulo', nome: 'Título de eleitor' },
  ];
  for (const filial of filiais) {
    for (const [ordem, item] of admissaoKeys.entries()) {
      await prisma.checklistItemDef.create({
        data: { tenantId: tenant.id, scope: 'ADMISSAO', filial, key: item.key, nome: item.nome, ativo: true, ordem },
      });
    }
  }

  const desligKeys: { key: string; nome: string; ativo: boolean }[] = [
    { key: 'aviso', nome: 'Aviso prévio', ativo: true },
    { key: 'exame', nome: 'Exame demissional', ativo: true },
    { key: 'calculo', nome: 'Cálculo rescisório', ativo: true },
    { key: 'equipamentos', nome: 'Devolução de equipamentos', ativo: true },
    { key: 'acessos', nome: 'Revogação de acessos e credenciais', ativo: true },
    { key: 'homologacao', nome: 'Homologação sindical', ativo: false },
  ];
  for (const [ordem, item] of desligKeys.entries()) {
    await prisma.terminationChecklistDef.create({
      data: { tenantId: tenant.id, key: item.key, nome: item.nome, ativo: item.ativo, ordem },
    });
  }

  const employeesData = [
    { nome: 'Ana Beatriz Souza', cargo: 'Analista de RH Pleno', departamento: 'Gestão de Pessoas', salario: 4200 },
    { nome: 'Bruno Carvalho', cargo: 'Desenvolvedor Backend Sênior', departamento: 'TI', salario: 9800 },
    { nome: 'Camila Ferreira', cargo: 'Executiva de Contas', departamento: 'Comercial', salario: 5200 },
    { nome: 'Diego Martins', cargo: 'Analista Financeiro', departamento: 'Financeiro', salario: 5600 },
    { nome: 'Elisa Rocha', cargo: 'Coordenadora de Operações', departamento: 'Operações', salario: 7200 },
  ];
  const employees: Awaited<ReturnType<typeof prisma.employee.create>>[] = [];
  for (const [i, e] of employeesData.entries()) {
    const dataAdmissao = new Date('2023-03-01');
    const feriasVencimento = new Date('2026-08-15');
    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        matricula: String(i + 1).padStart(4, '0'),
        nome: e.nome,
        cargo: e.cargo,
        departamento: e.departamento,
        filial: 'Matriz SP',
        status: 'ATIVO',
        dataAdmissao,
        email: `${e.nome.split(' ')[0].toLowerCase()}@vitalis.com`,
        salario: e.salario,
        tipoContrato: 'CLT',
        feriasSaldo: 30,
        feriasVencimento,
        historico: { create: [{ evento: 'Admissão efetivada', categoria: 'Admissão', autor: 'Sistema' }] },
      },
    });
    employees.push(employee);
  }

  await prisma.recruitmentJob.create({
    data: {
      tenantId: tenant.id,
      cargo: 'Analista de RH Pleno',
      depto: 'Gestão de Pessoas',
      contrato: 'CLT',
      status: 'ABERTA',
      candidates: {
        create: [
          { tenantId: tenant.id, nome: 'Fernanda Lima', origem: 'LinkedIn', stage: 'TRIAGEM' },
          { tenantId: tenant.id, nome: 'Gustavo Pires', origem: 'Indicação', stage: 'ENTREVISTA' },
        ],
      },
    },
  });

  const cycle = await prisma.evaluationCycle.create({
    data: {
      tenantId: tenant.id,
      nome: '2026.1',
      periodoInicio: new Date('2026-01-01'),
      periodoFim: new Date('2026-06-30'),
      modelo: 'NOVENTA',
    },
  });
  await prisma.evaluationRecord.create({
    data: { tenantId: tenant.id, cycleId: cycle.id, employeeId: employees[0].id, autoNota: 4.2, gestorNota: 4.5 },
  });

  console.log(`Seed concluído. Tenant: ${tenant.slug} — logins: admin@vitalis.com / rh@vitalis.com — senha: elos123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
