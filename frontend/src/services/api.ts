import { PortfolioSummary, TransactionRequest, TransactionResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export async function fetchPortfolioSummary(portfolioId: number = 1): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/summary`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Erro ao buscar dados do portfolio: ${res.statusText}`);
  }
  return res.json();
}

export async function createTransaction(data: TransactionRequest): Promise<TransactionResponse> {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`Erro ao cadastrar transação: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchUsdRate(): Promise<{ pair: string; rate: number }> {
  const res = await fetch(`${API_BASE_URL}/quotes/fx/usd-brl`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Erro ao buscar cotação de câmbio');
  }
  return res.json();
}
