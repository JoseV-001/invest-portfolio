import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Invest Portfolio - Gestor Consolidado B3 & Nomad',
  description: 'Gerenciador e consolidador inteligente de carteira com B3 e Nomad',
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
