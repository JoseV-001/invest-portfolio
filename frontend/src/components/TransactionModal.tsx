'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { TransactionRequest, TransactionType, CurrencyType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionRequest) => Promise<void>;
  usdRate?: number;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  usdRate = 5.75
}) => {
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<TransactionType>('BUY');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [fees, setFees] = useState('0.00');
  const [currency, setCurrency] = useState<CurrencyType>('BRL');
  const [broker, setBroker] = useState('Banco Inter');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ticker.trim()) {
      setError('Ticker é obrigatório.');
      return;
    }

    const qtyNum = parseFloat(quantity);
    const priceNum = parseFloat(unitPrice);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Quantidade inválida.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Preço unitário inválido.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        portfolioId: 1,
        ticker: ticker.trim().toUpperCase(),
        type,
        quantity: qtyNum,
        unitPrice: priceNum,
        fees: parseFloat(fees) || 0,
        currency,
        exchangeRate: currency === 'USD' ? usdRate : 1.0,
        transactionDate: new Date(transactionDate).toISOString(),
        broker,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar transação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">Cadastrar Lançamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ticker</label>
              <input
                type="text"
                placeholder="Ex: PETR4, VOO, MXRF11"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white uppercase focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Operação</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BUY">Compra (Aporte)</option>
                <option value="SELL">Venda</option>
                <option value="DIVIDEND">Dividendo</option>
                <option value="JCP">JCP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Quantidade (Suporta Frações)</label>
              <input
                type="number"
                step="0.00000001"
                placeholder="Ex: 10 ou 0.2541"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Preço Unitário</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Ex: 34.50"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Moeda</label>
              <select
                value={currency}
                onChange={(e) => {
                  const curr = e.target.value as CurrencyType;
                  setCurrency(curr);
                  setBroker(curr === 'USD' ? 'Nomad' : 'Banco Inter');
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BRL">BRL (Reais)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Corretora</label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Taxas / Emolumentos</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notas / Observação</label>
            <input
              type="text"
              placeholder="Opcional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
