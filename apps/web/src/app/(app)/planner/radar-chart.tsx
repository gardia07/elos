'use client';

export interface RadarPonto {
  label: string;
  valor: number;
}

export function RadarChart({ pontos, cor }: { pontos: RadarPonto[]; cor: string }) {
  const tamanho = 320;
  const centro = tamanho / 2;
  const raioMax = tamanho / 2 - 56;
  const n = pontos.length;

  function coordenada(i: number, valor: number) {
    const angulo = (Math.PI * 2 * i) / n - Math.PI / 2;
    const raio = (valor / 10) * raioMax;
    return { x: centro + raio * Math.cos(angulo), y: centro + raio * Math.sin(angulo) };
  }

  const poligono = pontos.map((p, i) => Object.values(coordenada(i, p.valor)).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${tamanho} ${tamanho}`} className="mx-auto w-full max-w-sm">
      {[2, 4, 6, 8, 10].map((nivel) => (
        <polygon
          key={nivel}
          points={pontos.map((_, i) => Object.values(coordenada(i, nivel)).join(',')).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {pontos.map((_, i) => {
        const c = coordenada(i, 10);
        return <line key={i} x1={centro} y1={centro} x2={c.x} y2={c.y} stroke="var(--border)" strokeWidth={1} />;
      })}
      <polygon points={poligono} fill={`${cor}33`} stroke={cor} strokeWidth={2} />
      {pontos.map((p, i) => {
        const c = coordenada(i, p.valor);
        return <circle key={i} cx={c.x} cy={c.y} r={4} fill={cor} />;
      })}
      {pontos.map((p, i) => {
        const c = coordenada(i, 10.9);
        return (
          <text key={i} x={c.x} y={c.y} textAnchor="middle" dominantBaseline="middle" fontSize={11} style={{ fill: 'var(--text-secondary)' }}>
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
