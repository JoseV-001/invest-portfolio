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
  lastUpdatedAt?: string;
  totalInvestedBrl: number;
  totalGrossEquityBrl: number;
  totalGrossEquityUsd?: number;
  totalProfitLossBrl: number;
  totalReturnPercent: number;
  totalEquityB3Brl: number;
  totalEquityNomadUsd: number;
  totalEquityNomadBrl: number;
  positions: AssetPosition[];
  allocationByClassPercent: Record<AssetClass, number>;
  allocationByClassBrl?: Partial<Record<AssetClass, number>>;
}

export interface TransactionRequest {
  portfolioId: number;
  ticker: string;
  assetName?: string;
  assetClass?: AssetClass;
  market?: MarketType;
  type: TransactionType;
  quantity: number;
  unitPrice?: number;
  fees?: number;
  currency: CurrencyType;
  exchangeRate?: number;
  transactionDate: string;
  broker: string;
  notes?: string;
}

export interface PositionUpdateRequest {
  quantity: number;
  averagePrice: number;
  assetName?: string;
  assetClass?: AssetClass;
  market?: MarketType;
  broker?: string;
  notes?: string;
}

export interface QuoteLookupResponse {
  ticker: string;
  name: string;
  price: number;
  currency: CurrencyType;
  market: MarketType;
  assetClass: AssetClass;
  timestamp?: string;
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

export interface AllocationTarget {
  assetClass: AssetClass;
  targetPercentage: number;
  currentPercentage: number;
  currentValueBrl: number;
  deviationPercent: number;
}

export interface AllocationTargetInput {
  assetClass: AssetClass;
  targetPercentage: number;
}

export interface RebalanceItem {
  assetClass: AssetClass;
  currentPercentage: number;
  targetPercentage: number;
  currentValueBrl: number;
  projectedValueBrl: number;
  projectedPercentage: number;
  suggestedAmountBrl: number;
  suggestedAmountUsd: number;
  suggestedTickers: string[];
}

export interface RebalanceSuggestion {
  contributionBrl: number;
  usdBrlRate: number;
  totalCurrentEquityBrl: number;
  projectedTotalEquityBrl: number;
  items: RebalanceItem[];
}

export interface MonthlyDividend {
  month: string;
  label: string;
  totalBrl: number;
  fromBrl: number;
  fromUsdInBrl: number;
  paymentsCount: number;
}

export interface AssetDividend {
  ticker: string;
  assetName: string;
  assetClass: AssetClass;
  currency: CurrencyType;
  totalReceivedNative: number;
  totalReceivedBrl: number;
  paymentsCount: number;
  yieldOnCostPercent: number;
  lastPaymentDate?: string;
}

export interface DividendSummary {
  totalReceivedBrl: number;
  currentMonthBrl: number;
  last12MonthsBrl: number;
  monthlyAverageBrl: number;
  portfolioYieldOnCostPercent: number;
  monthlyHistory: MonthlyDividend[];
  byAsset: AssetDividend[];
}

export interface PortfolioEvolutionPoint {
  date: string;
  label: string;
  investedBrl: number;
  grossEquityBrl: number;
  profitLossBrl: number;
  returnPercent: number;
}

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  reply: string;
  model: string;
}

export interface AiAnalysisSummary {
  marketReport?: string;
  sentimentReport?: string;
  newsReport?: string;
  fundamentalsReport?: string;
  investmentPlan?: string;
  traderInvestmentPlan?: string;
  bullHistory?: string;
  bearHistory?: string;
  riskHistory?: string;
}

export interface AiAnalysisResponse {
  ticker: string;
  date: string;
  analysts: string[];
  model?: string;
  finalRating: string;
  finalTradeDecision: string;
  summary?: AiAnalysisSummary;
}
