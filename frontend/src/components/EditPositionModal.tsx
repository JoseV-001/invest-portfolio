'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, PlusCircle, Edit3, AlertCircle } from 'lucide-react';
import {
  AssetClass,
  AssetPosition,
  MarketType,
  PositionUpdateRequest,
  TransactionRequest
} from '../types';
import {
  ASSET_CLASS_OPTIONS,
  formatBrl,
  formatNativeCurrency,
  formatQuantity
} from '../utils/formatters';

interface EditPositionModalProps {
  position: AssetPosition | null;
  usdRate?: number;
  onClose: () => void;
  onAddAporte: (data: TransactionRequest) => Promise<void>;
  onUpdatePosition: (assetId: number, data: PositionUpdateRequest) => Promise<void>;
}

function parseDecimal(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  const parsed = parseFloat(raw.trim().replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

export const EditPositionModal: React.FC<EditPositionModalProps> = ({
  position,
  usdRate = 5.75,
  onClose,
  onAddAporte,
  onUpdatePosition
}) => {
  const [mode, setMode] = useState<'APORTE' | 'EDIT'>('APORTE');
  const [aporteInputType, setAporteInputType] = useState<'QTY' | 'VALUE'>('QTY');
  const [aporteQty, setAporteQty] = useState('');
  const [aporteValue, setAporteValue] = useState('');
  const [aportePrice, setAportePrice] = useState('');

  const [editQty, setEditQty] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');
  const [editAssetClass, setEditAssetClass] = useState<AssetClass>('STOCKS_BR');
  const [editMarket, setEditMarket] = useState<MarketType>('B3');

  const [broker, setBroker] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (position) {
      setMode('APORTE');
      setAporteInputType('QTY');
      setAporteQty('');
      setAporteValue('');
      setAportePrice(
        position.currentPrice > 0 ? String(position.currentPrice) : String(position.averagePrice)
      );
      setEditQty(String(position.quantity));
      setEditAvgPrice(String(position.averagePrice));
      setEditAssetClass(position.assetClass);
      setEditMarket(position.market);
      setBroker(position.currency === 'USD' ? 'Nomad' : 'Banco Inter');
      setNotes('');
      setError('');
    }
  }, [position]);

  if (!position) return null;

  const isUsd = position.currency === 'USD';
  const priceNum = parseDecimal(aportePrice);
  const computedAporteQty =
    aporteInputType === 'QTY'
      ? parseDecimal(aporteQty)
      : priceNum > 0
      ? Number((parseDecimal(aporteValue) / priceNum).toFixed(8))
      : 0;
  const computedAporteTotal =
    aporteInputType === 'VALUE' ? parseDecimal(aporteValue) : computedAporteQty * priceNum;

  const newTotalQtyAfterAporte = Number((Number(position.quantity) + computedAporteQty).toFixed(8));
  const updatedGrossAfterAporte = newTotalQtyAfterAporte * Number(position.currentPrice);

  const editQtyNum = parseDecimal(editQty);
  const editAvgNum = parseDecimal(editAvgPrice);
  const editGrossPreview = editQtyNum * Number(position.currentPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      if (mode === 'APORTE') {
        const normalizedQty = Number(computedAporteQty.toFixed(8));
        if (normalizedQty <= 0) {
          setError('Informe uma quantidade ou valor de aporte válido (até 8 casas decimais).');
          return;
        }
        if (priceNum <= 0) {
          setError('Informe um preço unitário maior que zero.');
          return;
        }
        await onAddAporte({
          portfolioId: 1,
          ticker: position.ticker,
          assetName: position.name,
          assetClass: editAssetClass,
          market: editMarket,
          type: 'BUY',
          quantity: normalizedQty,
          unitPrice: priceNum,
          fees: 0,
          currency: position.currency,
          exchangeRate: isUsd ? usdRate : 1.0,
          transactionDate: new Date().toISOString(),
          broker: broker.trim() || (isUsd ? 'Nomad' : 'Banco Inter'),
          notes: notes.trim() || 'Aporte adicional'
        });
      } else {
        const normalizedQty = Number(editQtyNum.toFixed(8));
        if (normalizedQty <= 0) {
          setError('A quantidade total deve ser maior que zero.');
          return;
        }
        if (editAvgNum <= 0) {
          setError('O preço médio deve ser maior que zero.');
          return;
        }
        await onUpdatePosition(position.assetId, {
          quantity: normalizedQty,
          averagePrice: editAvgNum,
          assetClass: editAssetClass,
          market: editMarket,
          broker: broker.trim() || undefined,
          notes: notes.trim() || undefined
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alteração na posição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-sm">
                {position.ticker}
              </span>
              <span className="text-xs font-medium text-slate-300 truncate max-w-[230px]">
                {position.name}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
              Posição atual: <span className="text-slate-200 font-semibold">{formatQuantity(position.quantity, position.currency)}</span> cotas • Mercado:{' '}
              <span className="text-emerald-400 font-semibold">
                {formatNativeCurrency(position.currentPrice, position.currency, 2)}
              </span>
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

        {/* Seletor de Modo */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('APORTE');
                setError('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                mode === 'APORTE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Novo Aporte</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('EDIT');
                setError('');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                mode === 'EDIT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ajustar Posição / Classe</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'APORTE' ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Modo de cálculo:</span>
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setAporteInputType('QTY')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      aporteInputType === 'QTY' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    Quantidade
                  </button>
                  <button
                    type="button"
                    onClick={() => setAporteInputType('VALUE')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      aporteInputType === 'VALUE' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    Valor ({position.currency})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {aporteInputType === 'QTY' ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Qtd. do Aporte (até 8 dec.)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={isUsd ? 'Ex: 0.12500000' : 'Ex: 10'}
                      value={aporteQty}
                      onChange={(e) => {
                        if (/^[0-9]*[.,]?[0-9]{0,8}$/.test(e.target.value)) {
                          setAporteQty(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Valor Investido ({position.currency})
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 250.00"
                      value={aporteValue}
                      onChange={(e) => {
                        if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(e.target.value)) {
                          setAporteValue(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Preço Unitário ({position.currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={aportePrice}
                    onChange={(e) => {
                      if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(e.target.value)) {
                        setAportePrice(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {computedAporteQty > 0 && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs tabular-nums">
                  <div className="flex justify-between text-slate-400">
                    <span>Cotas adicionadas:</span>
                    <span className="text-white font-semibold">
                      +{formatQuantity(computedAporteQty, position.currency)} (
                      {formatNativeCurrency(computedAporteTotal, position.currency, 2)})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Nova posição acumulada:</span>
                    <span className="text-white font-bold">
                      {formatQuantity(newTotalQtyAfterAporte, position.currency)} cotas
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Patrimônio estimado na cotação atual:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatNativeCurrency(updatedGrossAfterAporte, position.currency, 2)}
                      {isUsd ? ` (${formatBrl(updatedGrossAfterAporte * usdRate)})` : ''}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Quantidade Consolidada (8 dec.)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editQty}
                    onChange={(e) => {
                      if (/^[0-9]*[.,]?[0-9]{0,8}$/.test(e.target.value)) {
                        setEditQty(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Preço Médio ({position.currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editAvgPrice}
                    onChange={(e) => {
                      if (/^[0-9]*[.,]?[0-9]{0,4}$/.test(e.target.value)) {
                        setEditAvgPrice(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {editQtyNum > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between text-xs tabular-nums">
                  <span className="text-slate-400">Saldo bruto projetado:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatNativeCurrency(editGrossPreview, position.currency, 2)}
                    {isUsd ? ` (${formatBrl(editGrossPreview * usdRate)})` : ''}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Seletores Explícitos de Classe do Ativo e Mercado */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Classe do Ativo
              </label>
              <select
                value={editAssetClass}
                onChange={(e) => setEditAssetClass(e.target.value as AssetClass)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
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
                Mercado / Bolsa
              </label>
              <select
                value={editMarket}
                onChange={(e) => setEditMarket(e.target.value as MarketType)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="B3">B3 (Brasil)</option>
                <option value="NYSE">NYSE (EUA)</option>
                <option value="NASDAQ">NASDAQ (EUA)</option>
                <option value="CRYPTO">CRYPTO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Corretora</label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Observação</label>
              <input
                type="text"
                placeholder="Opcional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
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
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md disabled:opacity-50 ${
                mode === 'APORTE'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 hover:to-teal-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {loading ? 'Salvando...' : mode === 'APORTE' ? 'Confirmar Aporte' : 'Salvar Ajustes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
