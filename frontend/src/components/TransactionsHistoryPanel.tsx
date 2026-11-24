'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  History,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { TransactionRequest, TransactionResponse, TransactionType } from '../types';
import {
  createTransactionsBatch,
  deleteTransaction,
  fetchTransactions,
  getExportPortfolioCsvUrl
} from '../services/api';
import {
  formatBrl,
  formatNativeCurrency,
  formatQuantity,
  suggestAssetClassification
} from '../utils/formatters';

interface TransactionsHistoryPanelProps {
  portfolioId?: number;
  usdRate?: number;
  hideValues?: boolean;
  refreshSignal?: number;
  onChanged: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const MASKED_VALUE = '••••••';
const MASKED_BRL = 'R$ ••••••';

const TYPE_BADGE: Record<TransactionType, { label: string; cls: string }> = {
  BUY: { label: 'Compra', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  SELL: { label: 'Venda', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  DIVIDEND: { label: 'Dividendo', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  JCP: { label: 'JCP', cls: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  AMORTIZATION: { label: 'Amortização', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  SPLIT: { label: 'Desdobramento', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  REVERSE_SPLIT: { label: 'Grupamento', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
};

function parseDecimal(raw: string | undefined): number {
  if (!raw) return NaN;
  const cleaned = raw.trim().replace(/^"|"$/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(cleaned.replace(',', '.'));
}

function parseDateIso(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const clean = raw.trim();
  const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T14:00:00Z`).toISOString();
  }
  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapOperationType(raw: string | undefined): TransactionType {
  const norm = (raw || '').trim().toUpperCase();
  if (norm === 'VENDA' || norm === 'SELL') return 'SELL';
  if (norm === 'DIVIDENDO' || norm === 'DIVIDENDOS' || norm === 'DIVIDEND' || norm === 'RENDIMENTO') return 'DIVIDEND';
  if (norm === 'JCP') return 'JCP';
  if (norm === 'AMORTIZACAO' || norm === 'AMORTIZAÇÃO' || norm === 'AMORTIZATION') return 'AMORTIZATION';
  if (norm === 'SPLIT' || norm === 'DESDOBRAMENTO') return 'SPLIT';
  if (norm === 'REVERSE_SPLIT' || norm === 'GRUPAMENTO') return 'REVERSE_SPLIT';
  return 'BUY';
}

function parseCsvPreview(
  text: string,
  portfolioId: number,
  usdRate: number
): { items: TransactionRequest[]; skipped: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { items: [], skipped: 0 };

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
  const hasHeader = headers.some((h) => h.includes('ticker') || h.includes('ativo'));

  const startIdx = hasHeader ? 1 : 0;
  const idxOf = (names: string[]) => headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const colTicker = hasHeader ? idxOf(['ticker', 'ativo']) : 1;
  const colDate = hasHeader ? idxOf(['data', 'date']) : 0;
  const colType = hasHeader ? idxOf(['operacao', 'operação', 'tipo_op', 'type']) : 2;
  const colQty = hasHeader ? idxOf(['quantidade', 'qtd', 'qty', 'quantity']) : 3;
  const colPrice = hasHeader ? idxOf(['preco_medio', 'preco', 'preço', 'price', 'unit_price', 'valor']) : 4;
  const colCurrency = hasHeader ? idxOf(['moeda', 'currency']) : -1;
  const colBroker = hasHeader ? idxOf(['corretora', 'broker']) : 5;
  const colName = hasHeader ? idxOf(['nome', 'name']) : -1;
  const colNotes = hasHeader ? idxOf(['notas', 'notes', 'obs']) : -1;
  const colFees = hasHeader ? idxOf(['taxas', 'fees']) : -1;

  const items: TransactionRequest[] = [];
  let skipped = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
    const rawTicker = (colTicker >= 0 ? cols[colTicker] : '')?.toUpperCase();
    if (!rawTicker) {
      skipped++;
      continue;
    }

    const qty = parseDecimal(colQty >= 0 ? cols[colQty] : '1');
    const unitPrice = parseDecimal(colPrice >= 0 ? cols[colPrice] : '0');
    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      skipped++;
      continue;
    }

    const suggestion = suggestAssetClassification(rawTicker);
    const rawCurr = colCurrency >= 0 ? cols[colCurrency]?.toUpperCase() : '';
    const currency = rawCurr === 'USD' || rawCurr === 'BRL' ? rawCurr : suggestion?.currency || 'BRL';
    const broker = (colBroker >= 0 && cols[colBroker]) || suggestion?.broker || (currency === 'USD' ? 'Nomad' : 'Banco Inter');
    const fees = colFees >= 0 ? parseDecimal(cols[colFees]) : 0;

    items.push({
      portfolioId,
      ticker: rawTicker,
      assetName: colName >= 0 && cols[colName] ? cols[colName] : undefined,
      assetClass: suggestion?.assetClass,
      market: suggestion?.market,
      type: mapOperationType(colType >= 0 ? cols[colType] : 'BUY'),
      quantity: Number(qty.toFixed(8)),
      unitPrice: Number(unitPrice.toFixed(4)),
      fees: isNaN(fees) || fees < 0 ? 0 : Number(fees.toFixed(4)),
      currency,
      exchangeRate: currency === 'USD' ? usdRate : 1.0,
      transactionDate: parseDateIso(colDate >= 0 ? cols[colDate] : undefined),
      broker,
      notes: (colNotes >= 0 && cols[colNotes]) || 'Importado via CSV'
    });
  }

  return { items, skipped };
}

export const TransactionsHistoryPanel: React.FC<TransactionsHistoryPanelProps> = ({
  portfolioId = 1,
  usdRate = 5.75,
  hideValues = false,
  refreshSignal = 0,
  onChanged,
  onNotify
}) => {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchTransactions(portfolioId);
      setTransactions(list);
    } catch (err: any) {
      onNotify('error', err?.message || 'Erro ao carregar extrato de transações.');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, onNotify]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshSignal]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filterType !== 'ALL' && tx.type !== filterType) return false;
      if (!term) return true;
      return (
        tx.ticker.toLowerCase().includes(term) ||
        tx.assetName.toLowerCase().includes(term) ||
        tx.broker.toLowerCase().includes(term) ||
        (tx.notes || '').toLowerCase().includes(term)
      );
    });
  }, [transactions, filterType, searchTerm]);

  const parsedPreview = useMemo(
    () => (csvText.trim() ? parseCsvPreview(csvText, portfolioId, usdRate) : { items: [], skipped: 0 }),
    [csvText, portfolioId, usdRate]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    if (parsedPreview.items.length === 0) {
      onNotify('error', 'Nenhuma linha válida encontrada no CSV.');
      return;
    }
    try {
      setImporting(true);
      const created = await createTransactionsBatch(parsedPreview.items);
      onNotify('success', `${created.length} lançamento(s) importado(s) com sucesso!`);
      setCsvText('');
      setShowImport(false);
      await loadTransactions();
      await onChanged();
    } catch (err: any) {
      onNotify('error', err?.message || 'Falha ao importar CSV.');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (txId: number) => {
    try {
      setDeletingId(txId);
      await deleteTransaction(txId);
      setConfirmDeleteId(null);
      onNotify('success', 'Lançamento removido do histórico.');
      await loadTransactions();
      await onChanged();
    } catch (err: any) {
      onNotify('error', err?.message || 'Erro ao remover lançamento.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de ações e filtros */}
      <section className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 shadow-xl shadow-black/20 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Extrato de Lançamentos &amp; CSV
                <span className="ml-2 text-[11px] font-semibold bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300 tabular-nums">
                  {filtered.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria completa de compras, vendas, proventos, importação em lote e exportação para IR
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadTransactions}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            <button
              type="button"
              onClick={() => setShowImport((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-xs font-semibold text-indigo-200"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar CSV</span>
            </button>

            <a
              href={getExportPortfolioCsvUrl(portfolioId)}
              download={`carteira-${portfolioId}.csv`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-semibold text-emerald-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV (IR)</span>
            </a>
          </div>
        </div>

        {/* Painel expansível de Importação CSV */}
        {showImport && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importar Lançamentos via CSV</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCsvText(
                      'Data;Ticker;Operacao;Quantidade;Preco;Moeda;Corretora;Notas\n23/11/2026;MXRF11;DIVIDEND;1;4.10;BRL;Banco Inter;Rendimento mensal\n23/11/2026;PETR4;Compra;2;49.50;BRL;Banco Inter;Aporte mensal'
                    )
                  }
                  className="text-[11px] text-indigo-300 hover:underline"
                >
                  Carregar exemplo
                </button>
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Aceita arquivos com cabeçalho (<code className="text-slate-300">Data;Ticker;Operacao;Quantidade;Preco;Moeda;Corretora;Notas</code>) ou o padrão consolidado B3 (<code className="text-slate-300">Data,Tipo,Ticker,Nome,Operacao,Quantidade,Preco_Medio,...,Corretora</code>).
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Selecionar arquivo .csv</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
              </label>
              {csvText.trim() && (
                <span className="text-[11px] text-slate-300 tabular-nums">
                  Detectados: <strong className="text-emerald-400">{parsedPreview.items.length}</strong> válidos
                  {parsedPreview.skipped > 0 && ` • ${parsedPreview.skipped} ignorados`}
                </span>
              )}
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Cole aqui o conteúdo do CSV ou selecione o arquivo acima..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />

            {parsedPreview.items.length > 0 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCsvText('')}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {importing ? 'Importando...' : `Importar ${parsedPreview.items.length} lançamento(s)`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Busca + Filtros por Tipo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['ALL', 'BUY', 'SELL', 'DIVIDEND', 'JCP', 'AMORTIZATION'] as const).map((t) => {
              const active = filterType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                    active
                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/35'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'Todos' : TYPE_BADGE[t].label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar ticker, corretora ou nota..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Tabela de Transações */}
      <section className="rounded-2xl bg-slate-900/75 border border-slate-800/90 overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-3">Ativo</th>
                <th className="py-3.5 px-3">Operação</th>
                <th className="py-3.5 px-3 text-right">Qtd</th>
                <th className="py-3.5 px-3 text-right">Valor Unit.</th>
                <th className="py-3.5 px-3 text-right">Total</th>
                <th className="py-3.5 px-3">Corretora</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const badge = TYPE_BADGE[tx.type] || TYPE_BADGE.BUY;
                  const dateLabel = new Date(tx.transactionDate).toLocaleDateString('pt-BR');
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/35">
                      <td className="py-3 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                        {dateLabel}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{tx.ticker}</div>
                        {tx.notes && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={tx.notes}>
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-200 tabular-nums">
                        {hideValues ? MASKED_VALUE : formatQuantity(tx.quantity, tx.currency)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                        {hideValues ? MASKED_VALUE : formatNativeCurrency(tx.unitPrice, tx.currency, 4)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-bold text-white">
                          {hideValues ? MASKED_VALUE : formatNativeCurrency(tx.totalAmount, tx.currency, 2)}
                        </div>
                        {tx.currency === 'USD' && tx.exchangeRateOnDate > 0 && (
                          <div className="text-[10px] text-slate-500">
                            ≈ {hideValues ? MASKED_BRL : formatBrl(tx.totalAmount * tx.exchangeRateOnDate)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{tx.broker}</td>
                      <td className="py-3 px-4 text-right">
                        {confirmDeleteId === tx.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === tx.id}
                              onClick={() => handleDelete(tx.id)}
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
                              title="Confirmar exclusão"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-300"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
