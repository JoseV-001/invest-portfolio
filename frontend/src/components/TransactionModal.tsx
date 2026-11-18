'use client';

import React, { useState } from 'react';
import { X, Check, Search, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import {
  AssetClass,
  CurrencyType,
  MarketType,
  TransactionRequest,
  TransactionType
} from '../types';
import { fetchQuote } from '../services/api';
import {
  ASSET_CLASS_OPTIONS,
  formatBrl,
  formatNativeCurrency,
  suggestAssetClassification
} from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionRequest) => Promise<void>;
  usdRate?: number;
}

function parseDecimalInput(raw: string): number {
  if (!raw || !raw.trim()) return NaN;
  return parseFloat(raw.trim().replace(',', '.'));
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  usdRate = 5.75
}) => {
  const [ticker, setTicker] = useState('');
  const [assetName, setAssetName] = useState('');
  const [market, setMarket] = useState<MarketType>('B3');
  const [assetClass, setAssetClass] = useState<AssetClass>('STOCKS_BR');
  const [manualClassSelected, setManualClassSelected] = useState(false);
  const [type, setType] = useState<TransactionType>('BUY');
  const [inputMode, setInputMode] = useState<'QTY' | 'AMOUNT'>('QTY');
  const [quantity, setQuantity] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [liveQuote, setLiveQuote] = useState<number | null>(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [fees, setFees] = useState('0.00');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [broker, setBroker] = useState('Banco Inter');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTickerChange = (raw: string) => {
    const clean = raw.toUpperCase();
    setTicker(clean);
    setLiveQuote(null);

    if (!manualClassSelected) {
      const suggestion = suggestAssetClassification(clean);
      if (suggestion) {
        setMarket(suggestion.market);
        setAssetClass(suggestion.assetClass);
        setCurrency(suggestion.currency);
        setBroker(suggestion.broker);
      }
    }
  };

  const handleMarketChange = (newMarket: MarketType) => {
    setMarket(newMarket);
    if (newMarket === 'B3') {
      setCurrency('BRL');
      setBroker('Banco Inter');
      if (assetClass === 'STOCKS_US' || assetClass === 'REITS' || assetClass === 'ETFS_US') {
        setAssetClass('STOCKS_BR');
      }
    } else if (newMarket === 'CRYPTO') {
      setCurrency('USD');
      setBroker('Nomad');
      setAssetClass('CRYPTO');
    } else {
      setCurrency('USD');
      setBroker('Nomad');
      if (assetClass === 'STOCKS_BR' || assetClass === 'FIIS' || assetClass === 'ETFS_BR') {
        setAssetClass('STOCKS_US');
      }
    }
  };

  const handleAssetClassChange = (newClass: AssetClass) => {
    setAssetClass(newClass);
    setManualClassSelected(true);
    if (newClass === 'STOCKS_BR' || newClass === 'FIIS' || newClass === 'ETFS_BR') {
      setMarket('B3');
      setCurrency('BRL');
      setBroker('Banco Inter');
    } else if (newClass === 'CRYPTO') {
      setMarket('CRYPTO');
      setCurrency('USD');
      setBroker('Nomad');
    } else if (newClass === 'STOCKS_US' || newClass === 'REITS' || newClass === 'ETFS_US') {
      if (market === 'B3' || market === 'CRYPTO') {
        setMarket('NYSE');
      }
      setCurrency('USD');
      setBroker('Nomad');
    }
  };

  const handleLookupQuote = async () => {
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;
    setError('');
    try {
      setFetchingQuote(true);
      const quote = await fetchQuote(
        cleanTicker,
        manualClassSelected ? market : undefined,
        manualClassSelected ? currency : undefined,
        manualClassSelected ? assetClass : undefined
      );
      if (quote.price && quote.price > 0) {
        setLiveQuote(quote.price);
        setUnitPrice(String(quote.price));
      } else {
        setError(`Cotação não encontrada para ${cleanTicker}. Informe o preço unitário manualmente.`);
      }
      if (quote.name && quote.name !== cleanTicker && !assetName.trim()) {
        setAssetName(quote.name);
      }
      if (!manualClassSelected) {
        if (quote.market) setMarket(quote.market);
        if (quote.currency) {
          setCurrency(quote.currency);
          setBroker(quote.currency === 'USD' ? 'Nomad' : 'Banco Inter');
        }
        if (quote.assetClass) setAssetClass(quote.assetClass);
      }
    } catch (err: any) {
      setError(err.message || 'Não foi possível buscar a cotação atual.');
    } finally {
      setFetchingQuote(false);
    }
  };

  const resetForm = () => {
    setTicker('');
    setAssetName('');
    setManualClassSelected(false);
    setQuantity('');
    setAmountInput('');
    setUnitPrice('');
    setLiveQuote(null);
    setFees('0.00');
    setNotes('');
    setError('');
  };

  const parsedUnitPrice = parseDecimalInput(unitPrice);
  const parsedFees = parseDecimalInput(fees) || 0;

  const computedQuantity =
    inputMode === 'QTY'
      ? parseDecimalInput(quantity)
      : !isNaN(parsedUnitPrice) && parsedUnitPrice > 0
      ? Number((parseDecimalInput(amountInput) / parsedUnitPrice).toFixed(8))
      : NaN;

  const estimatedTotalNative =
    !isNaN(computedQuantity) && computedQuantity > 0 && !isNaN(parsedUnitPrice) && parsedUnitPrice > 0
      ? computedQuantity * parsedUnitPrice + parsedFees
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ticker.trim()) {
      setError('Informe o ticker do ativo.');
      return;
    }

    if (inputMode === 'AMOUNT' && (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0)) {
      setError('Para calcular cotas fracionárias pelo valor investido, informe ou busque o preço unitário.');
      return;
    }

    if (isNaN(computedQuantity) || computedQuantity <= 0) {
      setError('Informe uma quantidade válida maior que zero (até 8 casas decimais).');
      return;
    }

    const normalizedQty = Number(computedQuantity.toFixed(8));
    if (normalizedQty < 0.00000001) {
      setError('A quantidade mínima permitida é 0.00000001.');
      return;
    }

    const priceNum = unitPrice.trim() ? parsedUnitPrice : undefined;
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum <= 0)) {
      setError('Preço unitário inválido.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        portfolioId: 1,
        ticker: ticker.trim().toUpperCase(),
        assetName: assetName.trim() || undefined,
        assetClass,
        market,
        type,
        quantity: normalizedQty,
        unitPrice: priceNum,
        fees: parsedFees,
        currency,
        exchangeRate: currency === 'USD' ? usdRate : 1.0,
        transactionDate: new Date(transactionDate).toISOString(),
        broker: broker.trim() || (currency === 'USD' ? 'Nomad' : 'Banco Inter'),
        notes: notes.trim() || undefined
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h3 className="text-base font-bold text-white">Novo Lançamento na Carteira</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Suporte completo a lotes B3 e frações de até 8 casas decimais na Nomad
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Linha 1: Ticker + Operação */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ticker do Ativo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: IVVB11, TAEE11, MXRF11, AAPL, O"
                  value={ticker}
                  onChange={(e) => handleTickerChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={handleLookupQuote}
                  disabled={!ticker.trim() || fetchingQuote}
                  title="Consultar cotação ao vivo"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0"
                >
                  {fetchingQuote ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Cotação</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Operação
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BUY">Compra (Aporte)</option>
                <option value="SELL">Venda</option>
              </select>
            </div>
          </div>

          {liveQuote !== null && (
            <div className="px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Cotação atual carregada:
              </span>
              <span className="font-bold tabular-nums">
                {formatNativeCurrency(liveQuote, currency, 4)}
              </span>
            </div>
          )}

          {/* Linha 2: Seletores explícitos de Classe do Ativo, Mercado e Nome */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Classe do Ativo
              </label>
              <select
                value={assetClass}
                onChange={(e) => handleAssetClassChange(e.target.value as AssetClass)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                {ASSET_CLASS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Bolsa / Mercado
              </label>
              <select
                value={market}
                onChange={(e) => handleMarketChange(e.target.value as MarketType)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="B3">B3 (Brasil)</option>
                <option value="NYSE">NYSE (EUA)</option>
                <option value="NASDAQ">NASDAQ (EUA)</option>
                <option value="CRYPTO">CRYPTO</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Nome da Empresa/Fundo
              </label>
              <input
                type="text"
                placeholder="Opcional (ex: iShares S&P 500)"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Linha 3: Modo de Entrada (Quantidade vs Valor) + Preço Unitário */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Dimensionamento da Ordem
              </span>
              <div className="inline-flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setInputMode('QTY')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    inputMode === 'QTY' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por Quantidade
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('AMOUNT')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    inputMode === 'AMOUNT' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por Valor ({currency})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inputMode === 'QTY' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Quantidade <span className="text-slate-500">(até 8 decimais)</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={currency === 'USD' ? 'Ex: 0.06146430' : 'Ex: 10'}
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]{0,8}$/.test(val)) {
                        setQuantity(val);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Valor Financeiro ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={currency === 'USD' ? 'Ex: 50.00' : 'Ex: 500.00'}
                    value={amountInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(val)) {
                        setAmountInput(val);
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Preço Unitário ({currency}){' '}
                  <span className="text-slate-500">{inputMode === 'QTY' ? '(vazio = mercado)' : ''}</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 35.55"
                  value={unitPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(val)) {
                      setUnitPrice(val);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  required={inputMode === 'AMOUNT'}
                />
              </div>
            </div>
          </div>

          {/* Preview Financeiro Consolidado */}
          {estimatedTotalNative !== null && (
            <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5 text-xs tabular-nums">
              {inputMode === 'AMOUNT' && !isNaN(computedQuantity) && (
                <div className="flex justify-between text-slate-400">
                  <span>Cotas fracionárias calculadas:</span>
                  <span className="font-semibold text-emerald-300">
                    {computedQuantity.toFixed(8)} cotas
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>Total estimado da ordem:</span>
                <span className="font-bold text-white">
                  {formatNativeCurrency(estimatedTotalNative, currency, 2)}
                </span>
              </div>
              {currency === 'USD' && (
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Equivalente consolidado em BRL (R$ {usdRate.toFixed(2)}):</span>
                  <span className="font-semibold text-amber-300">
                    {formatBrl(estimatedTotalNative * usdRate)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Linha 4: Moeda, Corretora, Data, Taxas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Moeda</label>
              <select
                value={currency}
                onChange={(e) => {
                  const curr = e.target.value as CurrencyType;
                  setCurrency(curr);
                  setBroker(curr === 'USD' ? 'Nomad' : 'Banco Inter');
                }}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD (US$)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Corretora</label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Data</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Taxas</label>
              <input
                type="text"
                inputMode="decimal"
                value={fees}
                onChange={(e) => {
                  if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(e.target.value)) {
                    setFees(e.target.value);
                  }
                }}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Observações</label>
            <input
              type="text"
              placeholder="Opcional (ex: Aporte mensal dividendos)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 transition-all shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{loading ? 'Salvando...' : 'Confirmar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
