'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { AssetPosition } from '../types';
import {
  ASSET_CLASS_CONFIG,
  formatBrl,
  formatNativeCurrency,
  formatQuantity,
  formatUsd
} from '../utils/formatters';

interface AssetsTableProps {
  positions: AssetPosition[];
  usdRate?: number;
  onEditPosition: (position: AssetPosition) => void;
  onRemovePosition: (position: AssetPosition) => Promise<void>;
}

type FilterTab = 'ALL' | 'B3' | 'US' | 'STOCKS' | 'FIIS' | 'REITS' | 'ETFS';
type SortField = 'portfolioSharePercent' | 'returnRatePercent' | 'currentGrossValueBrl' | 'ticker';
type SortDirection = 'asc' | 'desc';

export const AssetsTable: React.FC<AssetsTableProps> = ({
  positions,
  usdRate = 5.75,
  onEditPosition,
  onRemovePosition
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('portfolioSharePercent');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const matchesTab = (p: AssetPosition, tab: FilterTab): boolean => {
    switch (tab) {
      case 'ALL':
        return true;
      case 'B3':
        return p.market === 'B3' || p.currency === 'BRL';
      case 'US':
        return p.market === 'NYSE' || p.market === 'NASDAQ' || p.currency === 'USD';
      case 'STOCKS':
        return p.assetClass === 'STOCKS_BR' || p.assetClass === 'STOCKS_US';
      case 'FIIS':
        return p.assetClass === 'FIIS';
      case 'REITS':
        return p.assetClass === 'REITS';
      case 'ETFS':
        return p.assetClass === 'ETFS_BR' || p.assetClass === 'ETFS_US';
      default:
        return true;
    }
  };

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      ALL: positions.length,
      B3: 0,
      US: 0,
      STOCKS: 0,
      FIIS: 0,
      REITS: 0,
      ETFS: 0
    };
    for (const p of positions) {
      if (matchesTab(p, 'B3')) counts.B3++;
      if (matchesTab(p, 'US')) counts.US++;
      if (matchesTab(p, 'STOCKS')) counts.STOCKS++;
      if (matchesTab(p, 'FIIS')) counts.FIIS++;
      if (matchesTab(p, 'REITS')) counts.REITS++;
      if (matchesTab(p, 'ETFS')) counts.ETFS++;
    }
    return counts;
  }, [positions]);

  const filteredAndSorted = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = positions.filter((p) => {
      if (!matchesTab(p, activeTab)) return false;
      if (!term) return true;
      return (
        p.ticker.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.assetClass.toLowerCase().includes(term)
      );
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'ticker') {
        cmp = a.ticker.localeCompare(b.ticker);
      } else {
        cmp = Number(a[sortField] || 0) - Number(b[sortField] || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [positions, activeTab, searchTerm, sortField, sortDir]);

  const filteredTotalBrl = useMemo(
    () => filteredAndSorted.reduce((acc, p) => acc + Number(p.currentGrossValueBrl || 0), 0),
    [filteredAndSorted]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'ticker' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />;
    }
    return sortDir === 'desc' ? (
      <ArrowDown className="w-3 h-3 text-emerald-400" />
    ) : (
      <ArrowUp className="w-3 h-3 text-emerald-400" />
    );
  };

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    { id: 'B3', label: 'B3' },
    { id: 'US', label: 'Nomad / EUA' },
    { id: 'STOCKS', label: 'Ações' },
    { id: 'FIIS', label: 'FIIs' },
    { id: 'REITS', label: 'REITs' },
    { id: 'ETFS', label: 'ETFs' }
  ];

  return (
    <section className="rounded-2xl bg-slate-900/75 border border-slate-800/90 overflow-hidden shadow-xl shadow-black/20 backdrop-blur-sm">
      {/* Top Bar: Título + Busca */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white">Posições Analíticas da Carteira</h2>
              <span className="text-[11px] font-semibold bg-slate-800/90 border border-slate-700/70 px-2.5 py-0.5 rounded-full text-slate-300 tabular-nums">
                {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'ativo' : 'ativos'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Subtotal exibido: <span className="text-slate-200 font-semibold">{formatBrl(filteredTotalBrl)}</span>
            </p>
          </div>

          {/* Barra de Busca por Ticker/Nome */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar ticker (ex: PETR4, VOO)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/70 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Abas Rápidas de Filtro por Classe / Mercado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela Analítica */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('ticker')}
                  className="group inline-flex items-center gap-1 hover:text-white transition-colors uppercase"
                >
                  <span>Ativo</span>
                  {renderSortIcon('ticker')}
                </button>
              </th>
              <th className="py-3.5 px-3">Classe / Bolsa</th>
              <th className="py-3.5 px-3 text-right">Quantidade</th>
              <th className="py-3.5 px-3 text-right">Preço Médio</th>
              <th className="py-3.5 px-3 text-right">Cotação Atual</th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSort('currentGrossValueBrl')}
                  className="group inline-flex items-center gap-1 ml-auto hover:text-white transition-colors uppercase"
                >
                  <span>Saldo Consolidado</span>
                  {renderSortIcon('currentGrossValueBrl')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSort('returnRatePercent')}
                  className="group inline-flex items-center gap-1 ml-auto hover:text-white transition-colors uppercase"
                >
                  <span>Rentabilidade</span>
                  {renderSortIcon('returnRatePercent')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right">
                <button
                  type="button"
                  onClick={() => handleSort('portfolioSharePercent')}
                  className="group inline-flex items-center gap-1 ml-auto hover:text-white transition-colors uppercase"
                >
                  <span>Peso %</span>
                  {renderSortIcon('portfolioSharePercent')}
                </button>
              </th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-slate-500">
                  Nenhum ativo encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((pos) => {
                const isProfit = pos.returnRatePercent >= 0;
                const isUsd = pos.currency === 'USD';
                const classCfg = ASSET_CLASS_CONFIG[pos.assetClass] || ASSET_CLASS_CONFIG.CASH;
                const effectiveRate = usdRate > 0 ? usdRate : 5.75;

                return (
                  <tr
                    key={`${pos.assetId}-${pos.ticker}`}
                    className="hover:bg-slate-800/35 transition-colors group"
                  >
                    {/* Ticker & Nome */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[11px] shrink-0 border border-slate-700/60 bg-slate-950 text-white"
                          style={{ borderLeftColor: classCfg.hex, borderLeftWidth: '3px' }}
                        >
                          {pos.ticker.slice(0, 4)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm tracking-tight">
                            {pos.ticker}
                          </div>
                          <div
                            className="text-[11px] text-slate-400 truncate max-w-[165px]"
                            title={pos.name}
                          >
                            {pos.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Classe & Mercado */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${classCfg.badgeClass}`}
                        >
                          {classCfg.shortLabel}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          {pos.market} • {pos.currency}
                        </span>
                      </div>
                    </td>

                    {/* Quantidade (até 8 casas para Nomad) */}
                    <td className="py-3.5 px-3 text-right font-semibold text-slate-200 tabular-nums">
                      {formatQuantity(pos.quantity, pos.currency)}
                    </td>

                    {/* Preço Médio (Exibição dupla para USD) */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className="font-medium text-slate-200">
                        {formatNativeCurrency(pos.averagePrice, pos.currency, 2)}
                      </div>
                      {isUsd && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          ≈ {formatBrl(pos.averagePrice * effectiveRate)}
                        </div>
                      )}
                    </td>

                    {/* Cotação Atual (Exibição dupla para USD) */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className="font-semibold text-white">
                        {formatNativeCurrency(pos.currentPrice, pos.currency, 2)}
                      </div>
                      {isUsd && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          ≈ {formatBrl(pos.currentPrice * effectiveRate)}
                        </div>
                      )}
                    </td>

                    {/* Saldo Consolidado em R$ + Saldo em US$ quando aplicável */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className="font-bold text-white text-sm">
                        {formatBrl(pos.currentGrossValueBrl)}
                      </div>
                      {isUsd ? (
                        <div className="text-[11px] font-medium text-amber-300/90 mt-0.5">
                          {formatUsd(pos.currentGrossValue)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Custo {formatBrl(pos.totalInvestedBrl)}
                        </div>
                      )}
                    </td>

                    {/* Rentabilidade (% + Lucro/Prejuízo R$) */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            isProfit
                              ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                              : 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                          }`}
                        >
                          {isProfit ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {isProfit
                            ? `+${Number(pos.returnRatePercent).toFixed(2)}%`
                            : `${Number(pos.returnRatePercent).toFixed(2)}%`}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            pos.profitLossBrl >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'
                          }`}
                        >
                          {pos.profitLossBrl >= 0 ? '+' : '-'}
                          {formatBrl(Math.abs(pos.profitLossBrl))}
                        </span>
                      </div>
                    </td>

                    {/* Peso na Carteira % + Barra */}
                    <td className="py-3.5 px-3 text-right tabular-nums">
                      <div className="inline-flex flex-col items-end gap-1 w-16">
                        <span className="font-semibold text-slate-200">
                          {Number(pos.portfolioSharePercent).toFixed(2)}%
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(3, Number(pos.portfolioSharePercent)))}%`,
                              backgroundColor: classCfg.hex
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      {confirmRemoveId === pos.assetId ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={removingId === pos.assetId}
                            onClick={async () => {
                              try {
                                setRemovingId(pos.assetId);
                                await onRemovePosition(pos);
                                setConfirmRemoveId(null);
                              } finally {
                                setRemovingId(null);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                            title="Confirmar exclusão da posição"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditPosition(pos)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 border border-slate-700/60 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 transition-all"
                            title="Aportar ou Editar Posição"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(pos.assetId)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all"
                            title="Remover Posição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
  );
};
