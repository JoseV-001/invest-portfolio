export type AssetClass =
  | 'STOCKS_BR'
  | 'FIIS'
  | 'ETFS_BR'
  | 'STOCKS_US'
  | 'REITS'
  | 'ETFS_US'
  | 'CRYPTO'
  | 'CASH';

export type MarketType = 'B3' | 'NYSE' | 'NASDAQ' | 'CRYPTO';
export type CurrencyType = 'BRL' | 'USD';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'JCP' | 'SPLIT' | 'REVERSE_SPLIT' | 'AMORTIZATION';

export interface AssetPosition {
  assetId: number;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  market: MarketType;
  currency: CurrencyType;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentGrossValue: number;
  totalInvestedBrl: number;
  currentGrossValueBrl: number;
  profitLossBrl: number;
  returnRatePercent: number;
  portfolioSharePercent: number;
}

export interface PortfolioSummary {
  portfolioId: number;
  portfolioName: string;
  currentUsdBrlRate: number;
  totalInvestedBrl: number;
  totalGrossEquityBrl: number;
  totalProfitLossBrl: number;
  totalReturnPercent: number;
  totalEquityB3Brl: number;
  totalEquityNomadUsd: number;
  totalEquityNomadBrl: number;
  positions: AssetPosition[];
  allocationByClassPercent: Record<AssetClass, number>;
}

export interface TransactionRequest {
  portfolioId: number;
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  fees?: number;
  currency: CurrencyType;
  exchangeRate?: number;
  transactionDate: string;
  broker: string;
  notes?: string;
}

export interface TransactionResponse {
  id: number;
  portfolioId: number;
  ticker: string;
  assetName: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  fees: number;
  totalAmount: number;
  currency: CurrencyType;
  exchangeRateOnDate: number;
  transactionDate: string;
  broker: string;
  notes?: string;
}
