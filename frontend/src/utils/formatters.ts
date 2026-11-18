import { AssetClass, CurrencyType, MarketType } from '../types';

export interface AssetClassVisualConfig {
  label: string;
  shortLabel: string;
  hex: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

export const ASSET_CLASS_CONFIG: Record<AssetClass, AssetClassVisualConfig> = {
  STOCKS_BR: {
    label: 'Ações Brasil (B3)',
    shortLabel: 'Ações BR',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/25'
  },
  FIIS: {
    label: 'Fundos Imobiliários (FIIs)',
    shortLabel: 'FIIs',
    hex: '#10b981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
  },
  ETFS_BR: {
    label: 'ETFs Brasil (B3)',
    shortLabel: 'ETFs BR',
    hex: '#06b6d4',
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25'
  },
  STOCKS_US: {
    label: 'Stocks EUA',
    shortLabel: 'Stocks US',
    hex: '#f59e0b',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/25'
  },
  REITS: {
    label: 'REITs (Imobiliário EUA)',
    shortLabel: 'REITs',
    hex: '#f97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/25'
  },
  ETFS_US: {
    label: 'ETFs EUA (Nomad)',
    shortLabel: 'ETFs US',
    hex: '#6366f1',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
  },
  CRYPTO: {
    label: 'Criptoativos',
    shortLabel: 'Cripto',
    hex: '#a855f7',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/25'
  },
  CASH: {
    label: 'Caixa / Renda Fixa',
    shortLabel: 'Caixa',
    hex: '#64748b',
    bgClass: 'bg-slate-500',
    textClass: 'text-slate-300',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }
};

export const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: 'STOCKS_BR', label: 'Ações Brasil (B3)' },
  { value: 'FIIS', label: 'Fundos Imobiliários (FIIs)' },
  { value: 'ETFS_BR', label: 'ETFs Brasil (B3)' },
  { value: 'STOCKS_US', label: 'Stocks EUA' },
  { value: 'REITS', label: 'REITs (EUA)' },
  { value: 'ETFS_US', label: 'ETFs EUA' },
  { value: 'CRYPTO', label: 'Criptoativos' },
  { value: 'CASH', label: 'Caixa / Reserva' }
];

const B3_ETFS = new Set([
  'IVVB11', 'BOVA11', 'SMAL11', 'HASH11', 'DIVO11', 'NASD11', 'SPXI11',
  'GOLD11', 'BOVV11', 'BRAX11', 'ECOO11', 'PIBB11', 'XFIX11', 'QBTC11',
  'ETHE11', 'BITH11', 'SOLH11', 'CHIP11', 'TECK11', 'EURP11', 'ACWI11',
  'WRLD11', 'LFTS11', 'IMAB11', 'B5P211', 'IB5M11', 'FIXA11', 'NDIV11'
]);

const B3_UNITS = new Set([
  'TAEE11', 'SANB11', 'KLBN11', 'BPAC11', 'ENGI11', 'ALUP11', 'SAPR11',
  'TIET11', 'AURE11', 'BRBI11', 'IGTI11', 'MODL11', 'PPLA11', 'RNEW11',
  'SULA11', 'BMGB11', 'BIDI11'
]);

const US_ETFS = new Set([
  'VOO', 'SPY', 'IVV', 'QQQ', 'QQQM', 'SCHD', 'VTI', 'VXUS', 'VT',
  'VEA', 'VWO', 'DHS', 'SPHD', 'QYLD', 'JEPI', 'JEPQ', 'DIVO', 'DGRO',
  'VIG', 'VYM', 'IAU', 'GLD', 'SLV', 'TFLO', 'SGOV', 'BIL', 'SHV',
  'TLT', 'IEF', 'BND', 'AGG', 'VNQ', 'XLK', 'XLF', 'XLV', 'XLE', 'ARKK', 'IBIT'
]);

const US_REITS = new Set([
  'O', 'STAG', 'VICI', 'PLD', 'AMT', 'CCI', 'EQIX', 'DLR', 'SPG',
  'NNN', 'WPC', 'ADC', 'WELL', 'VTR', 'AVB', 'EQR', 'ESS', 'MAA',
  'INVH', 'PSA', 'EXR', 'CUBE', 'IRM', 'ARE'
]);

const NASDAQ_TICKERS = new Set([
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA',
  'AVGO', 'COST', 'NFLX', 'AMD', 'INTC', 'QCOM', 'ADBE', 'CSCO',
  'PEP', 'QQQ', 'QQQM', 'QYLD', 'JEPQ', 'IBIT'
]);

const CRYPTO_TICKERS = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'BTC-USD', 'ETH-USD', 'SOL-USD'
]);

export function suggestAssetClassification(rawTicker: string): {
  market: MarketType;
  assetClass: AssetClass;
  currency: CurrencyType;
  broker: string;
} | null {
  const norm = rawTicker.trim().toUpperCase();
  if (norm.length < 1) return null;

  if (CRYPTO_TICKERS.has(norm)) {
    return { market: 'CRYPTO', assetClass: 'CRYPTO', currency: 'USD', broker: 'Nomad' };
  }

  // Padrão B3: 4 letras + 1 ou 2 dígitos (ex: PETR4, MXRF11, IVVB11, TAEE11, AAPL34)
  if (/^[A-Z]{4}\d{1,2}B?$/.test(norm)) {
    if (B3_ETFS.has(norm)) {
      return { market: 'B3', assetClass: 'ETFS_BR', currency: 'BRL', broker: 'Banco Inter' };
    }
    if (B3_UNITS.has(norm)) {
      return { market: 'B3', assetClass: 'STOCKS_BR', currency: 'BRL', broker: 'Banco Inter' };
    }
    if (norm.endsWith('11') || norm.endsWith('11B')) {
      return { market: 'B3', assetClass: 'FIIS', currency: 'BRL', broker: 'Banco Inter' };
    }
    return { market: 'B3', assetClass: 'STOCKS_BR', currency: 'BRL', broker: 'Banco Inter' };
  }

  // Padrão US (apenas letras, 1 a 5 caracteres, ex: O, KO, VOO, AAPL, NVDA)
  if (/^[A-Z]{1,5}$/.test(norm)) {
    const market: MarketType = NASDAQ_TICKERS.has(norm) ? 'NASDAQ' : 'NYSE';
    if (US_ETFS.has(norm)) {
      return { market, assetClass: 'ETFS_US', currency: 'USD', broker: 'Nomad' };
    }
    if (US_REITS.has(norm)) {
      return { market, assetClass: 'REITS', currency: 'USD', broker: 'Nomad' };
    }
    return { market, assetClass: 'STOCKS_US', currency: 'USD', broker: 'Nomad' };
  }

  return null;
}

export function formatBrl(value: number, fractionDigits: number = 2): string {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

export function formatUsd(value: number, fractionDigits: number = 2): string {
  return `US$ ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}`;
}

export function formatNativeCurrency(value: number, currency: CurrencyType, maxDecimals: number = 2): string {
  if (currency === 'USD') {
    return `US$ ${Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals
    })}`;
  }
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  })}`;
}

export function formatQuantity(value: number, currency: CurrencyType): string {
  const num = Number(value || 0);
  const isInteger = Math.abs(num - Math.round(num)) < 1e-9;
  if (isInteger) {
    return num.toLocaleString(currency === 'USD' ? 'en-US' : 'pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  return num.toLocaleString(currency === 'USD' ? 'en-US' : 'pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  });
}

export function formatTimestampPtBr(isoString?: string): string {
  if (!isoString) return 'Aguardando sincronização';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Sincronizado recentemente';

  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  if (isSameDay) {
    return `Hoje às ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
  return `${dateStr} às ${timeStr}`;
}
