'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge, Button, Card } from '@/components/ui';
import { Header } from '@/components/header';

interface Conversation {
  id: string;
  pergunta: string;
  resposta: string;
  modoAgente: boolean;
  acaoExecutada: string | null;
  createdAt: string;
}

export default function EloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pergunta, setPergunta] = useState('');
  const [modoAgente, setModoAgente] = useState(false);
  const [ultima, setUltima] = useState<Conversation | null>(null);

  const { data: history } = useQuery({
    queryKey: ['elo', 'history'],
    queryFn: async () => (await api.get<Conversation[]>('/elo/history')).data,
  });

  const ask = useMutation({
    mutationFn: async (vars: { pergunta: string; modoAgente: boolean }) => (await api.post<Conversation>('/elo/ask', vars)).data,
    onSuccess: (data) => {
      setUltima(data);
      setPergunta('');
      queryClient.invalidateQueries({ queryKey: ['elo', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  useEffect(() => {
    const incoming = searchParams.get('pergunta');
    if (!incoming) return;
    const agente = searchParams.get('modoAgente') === '1';
    setModoAgente(agente);
    ask.mutate({ pergunta: incoming, modoAgente: agente });
    router.replace('/elo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exibida = ultima ?? history?.[0] ?? null;

  return (
    <>
      <Header eyebrow="Assistente de IA · Especialista trabalhista" title="Elô" />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="flex flex-col gap-1">
            <h3 className="mb-2 text-sm font-semibold">Histórico</h3>
            {history?.map((h) => (
              <button
                key={h.id}
                onClick={() => setUltima(h)}
                className="rounded-[10px] px-2 py-2 text-left text-sm text-text-secondary hover:bg-surface-alt"
              >
                {h.pergunta}
              </button>
            ))}
            {history?.length === 0 && <p className="text-sm text-text-tertiary">Nenhuma conversa ainda.</p>}
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent">E</div>
                <div>
                  <div className="font-medium">Elô</div>
                  <div className="text-xs text-text-tertiary">Especialista em RH, DP, SST, Psicologia, Compliance e legislação trabalhista</div>
                </div>
              </div>
              <label className="flex flex-col items-end gap-1 text-xs">
                <span className="font-medium text-text-secondary">Modo agente</span>
                <button
                  onClick={() => setModoAgente((m) => !m)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${modoAgente ? 'border-accent bg-accent/10 text-accent' : 'border-border-strong text-text-tertiary'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${modoAgente ? 'bg-success' : 'bg-text-tertiary'}`} />
                  {modoAgente ? 'Executa ações' : 'Só informa'}
                </button>
              </label>
            </Card>

            <Card className="flex min-h-[320px] flex-col gap-4">
              {!exibida && (
                <p className="text-sm text-text-secondary">
                  Olá! Sou a Elô, sua especialista da plataforma. Posso responder sobre dados do sistema, orientar sobre legislação
                  trabalhista e, em modo agente, executar ações reais como criar tarefas e itens de agenda.
                </p>
              )}
              {exibida && (
                <div className="flex flex-col gap-4">
                  <div className="self-end rounded-[14px] rounded-br-none bg-accent px-4 py-2.5 text-sm text-on-accent">
                    {exibida.pergunta}
                  </div>
                  <div className="flex flex-col gap-2 self-start rounded-[14px] rounded-bl-none bg-surface-alt px-4 py-2.5 text-sm">
                    <span className="whitespace-pre-wrap">{exibida.resposta}</span>
                    {exibida.acaoExecutada && <Badge tone="green">Ação executada: {exibida.acaoExecutada}</Badge>}
                  </div>
                </div>
              )}
              {ask.isPending && <p className="text-sm text-text-tertiary">Elô está pensando…</p>}
            </Card>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (pergunta.trim()) ask.mutate({ pergunta, modoAgente });
              }}
            >
              <input
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder='Ex: "Criar tarefa: revisar PGR" ou "Resumo do turnover"'
                className="flex-1 rounded-[10px] border border-border-strong bg-surface px-3 py-2.5 text-sm"
              />
              <Button type="submit" disabled={ask.isPending || !pergunta.trim()}>
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
