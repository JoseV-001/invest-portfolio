import {
  AssetClass,
  CurrencyType,
  MarketType,
  PortfolioSummary,
  PositionUpdateRequest,
  QuoteLookupResponse,
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
