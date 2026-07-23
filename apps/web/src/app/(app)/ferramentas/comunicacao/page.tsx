'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button, Card } from '@/components/ui';

interface Announcement {
  id: string;
  titulo: string;
  corpo: string;
  autor: string;
  createdAt: string;
}

export default function ComunicacaoPage() {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');

  const { data: announcements } = useQuery({
    queryKey: ['ferramentas', 'announcements'],
    queryFn: async () => (await api.get<Announcement[]>('/ferramentas/announcements')).data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/ferramentas/announcements', { titulo, corpo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas', 'announcements'] });
      setTitulo('');
      setCorpo('');
    },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do comunicado"
            required
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="Escreva o comunicado…"
            rows={3}
            required
            className="rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={create.isPending} className="self-start">
            Publicar
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {announcements?.map((a) => (
          <Card key={a.id}>
            <div className="mb-1 flex items-center justify-between">
              <h4 className="font-medium">{a.titulo}</h4>
              <span className="text-xs text-text-tertiary">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <p className="text-sm text-text-secondary">{a.corpo}</p>
            <p className="mt-2 text-xs text-text-tertiary">— {a.autor}</p>
          </Card>
        ))}
        {announcements?.length === 0 && <p className="text-sm text-text-tertiary">Nenhum comunicado publicado ainda.</p>}
      </div>
    </div>
  );
}
