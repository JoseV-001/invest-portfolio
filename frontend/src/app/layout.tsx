import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Invest Portfolio - Consolidador Patrimonial Multi-Ativo & Multi-Moeda',
  description: 'Plataforma de consolidação de investimentos (Ações, FIIs, ETFs, REITs, Cripto e Caixa em BRL e USD) com Copiloto Financeiro IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
