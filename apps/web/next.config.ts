import type { NextConfig } from "next";

// Em produção, o front (Vercel) e a API (Railway) ficam em domínios
// diferentes. Um Set-Cookie vindo direto da API é "de terceiros" do ponto
// de vista do navegador, e o Safari/iOS bloqueia isso por padrão (ITP) —
// o login parecia funcionar mas a sessão nunca era salva. Este rewrite faz
// o navegador falar só com o próprio domínio do front; o Next.js repassa
// para a API nos bastidores, e o cookie passa a ser de primeira parte.
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` }];
  },
};

export default nextConfig;
