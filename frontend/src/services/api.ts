import {
  AiAnalysisResponse,
  AiChatResponse,
  AiChatTurn,
  AllocationTarget,
  AllocationTargetInput,
  AssetClass,
  CurrencyType,
  DividendSummary,
  MarketType,
  PortfolioEvolutionPoint,
  PortfolioSummary,
  PositionUpdateRequest,
  QuoteLookupResponse,
  RebalanceSuggestion,
  TransactionRequest,
  TransactionResponse
} from '../types';

/**
 * Resolve dinamicamente a URL da API para funcionar tanto em localhost
 * quanto via IP da rede local (LAN) ou domínio customizado no servidor Homelab.
 */
export function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const configuredBackendPort = process.env.NEXT_PUBLIC_BACKEND_PORT?.trim() || '8080';

  if (typeof window !== 'undefined') {
    const browserHost = window.location.hostname;
    const browserProtocol = window.location.protocol;
    const isBrowserLocalhost = browserHost === 'localhost' || browserHost === '127.0.0.1';

    if (configuredUrl) {
      // Caminho relativo (ex: /api/v1 atrás de reverse proxy Nginx/Traefik)
      if (configuredUrl.startsWith('/')) {
        return configuredUrl.replace(/\/+$/, '');
      }

      // Se o navegador está acessando via IP da rede/domínio, mas NEXT_PUBLIC_API_URL aponta para localhost,
      // substitui automaticamente pelo hostname atual da janela mantendo a porta configurada.
      const pointsToLocalhost =
        configuredUrl.includes('://localhost') || configuredUrl.includes('://127.0.0.1');

      if (!isBrowserLocalhost && pointsToLocalhost) {
        try {
          const parsed = new URL(configuredUrl);
          const portSegment = parsed.port ? `:${parsed.port}` : `:${configuredBackendPort}`;
          return `${browserProtocol}//${browserHost}${portSegment}${parsed.pathname}`.replace(/\/+$/, '');
        } catch {
          return `${browserProtocol}//${browserHost}:${configuredBackendPort}/api/v1`;
        }
      }

      return configuredUrl.replace(/\/+$/, '');
    }

    return `${browserProtocol}//${browserHost}:${configuredBackendPort}/api/v1`;
  }

  return (configuredUrl || `http://localhost:${configuredBackendPort}/api/v1`).replace(/\/+$/, '');
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // ignore json parse error
  }
  return `${fallback} (${res.status})`;
}

export async function fetchPortfolioSummary(
  portfolioId: number = 1,
  refresh: boolean = false
): Promise<PortfolioSummary> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/summary?refresh=${refresh}`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar dados do portfólio'));
  }
  return res.json();
}

export async function createTransaction(data: TransactionRequest): Promise<TransactionResponse> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao cadastrar lançamento'));
  }
  return res.json();
}

export async function updatePosition(
  portfolioId: number,
  assetId: number,
  data: PositionUpdateRequest
): Promise<PortfolioSummary> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/positions/${assetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao atualizar posição'));
  }
  return res.json();
}

export async function removePosition(portfolioId: number, assetId: number): Promise<void> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/positions/${assetId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao remover investimento'));
  }
}

export async function fetchQuote(
  ticker: string,
  market?: MarketType,
  currency?: CurrencyType,
  assetClass?: AssetClass
): Promise<QuoteLookupResponse> {
  const baseUrl = resolveApiBaseUrl();
  const params = new URLSearchParams();
  if (market) params.set('market', market);
  if (currency) params.set('currency', currency);
  if (assetClass) params.set('assetClass', assetClass);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${baseUrl}/quotes/${encodeURIComponent(ticker.trim().toUpperCase())}${query}`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar cotação'));
  }
  return res.json();
}

export async function fetchUsdRate(): Promise<{ pair: string; rate: number; timestamp?: string }> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/quotes/fx/usd-brl`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Erro ao buscar cotação de câmbio');
  }
  return res.json();
}

export async function fetchAllocations(portfolioId: number = 1): Promise<AllocationTarget[]> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/allocations`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar metas de alocação'));
  }
  return res.json();
}

export async function updateAllocations(
  portfolioId: number,
  targets: AllocationTargetInput[]
): Promise<AllocationTarget[]> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/allocations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets })
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao salvar metas de alocação'));
  }
  return res.json();
}

export async function fetchRebalanceSuggestion(
  portfolioId: number,
  amountBrl: number
): Promise<RebalanceSuggestion> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(
    `${baseUrl}/portfolios/${portfolioId}/rebalance?amountBrl=${encodeURIComponent(amountBrl)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao calcular sugestão de aporte'));
  }
  return res.json();
}

export async function fetchDividendsSummary(portfolioId: number = 1): Promise<DividendSummary> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/dividends`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar proventos'));
  }
  return res.json();
}

export async function fetchPortfolioEvolution(portfolioId: number = 1): Promise<PortfolioEvolutionPoint[]> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/portfolios/${portfolioId}/evolution`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar evolução patrimonial'));
  }
  return res.json();
}

export async function fetchTransactions(portfolioId: number = 1): Promise<TransactionResponse[]> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/transactions/portfolio/${portfolioId}`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao buscar histórico de transações'));
  }
  return res.json();
}

export async function deleteTransaction(transactionId: number): Promise<void> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/transactions/${transactionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao excluir transação'));
  }
}

export async function createTransactionsBatch(
  requests: TransactionRequest[]
): Promise<TransactionResponse[]> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/transactions/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests)
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao importar lote de transações'));
  }
  return res.json();
}

export function getExportPortfolioCsvUrl(portfolioId: number = 1): string {
  return `${resolveApiBaseUrl()}/portfolios/${portfolioId}/export/csv`;
}

export async function sendAiChat(
  portfolioId: number,
  message: string,
  history: AiChatTurn[]
): Promise<AiChatResponse> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolioId, message, history })
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, 'Erro ao consultar Copiloto IA'));
  }
  return res.json();
}

export async function analyzeTickerWithAi(
  ticker: string,
  options?: { date?: string; analysts?: string[]; fast?: boolean }
): Promise<AiAnalysisResponse> {
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/ai/analyze/${encodeURIComponent(ticker.trim())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {})
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, `Erro ao analisar ${ticker} com TradingAgents`));
  }
  return res.json();
}
