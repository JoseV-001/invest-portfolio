'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Coins, Percent, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { DividendSummary } from '../types';
import { fetchDividendsSummary } from '../services/api';
import { ASSET_CLASS_CONFIG, formatBrl, formatNativeCurrency } from '../utils/formatters';

interface DividendsPanelProps {
  portfolioId?: number;
  hideValues?: boolean;
  refreshSignal?: number;
  onNewDividend: () => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const MASKED_BRL = 'R$ ••••••';
const MASKED_NATIVE = '••••••';

export const DividendsPanel: React.FC<DividendsPanelProps> = ({
  portfolioId = 1,
  hideValues = false,
  refreshSignal = 0,
  onNewDividend,
  onNotify
}) => {
  const [data, setData] = useState<DividendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const loadDividends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchDividendsSummary(portfolioId);
      setData(res);
    } catch (err: any) {
      onNotify('error', err?.message || 'Erro ao carregar resumo de proventos.');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, onNotify]);

  useEffect(() => {
    loadDividends();
  }, [loadDividends, refreshSignal]);

  const maxMonthlyBrl = useMemo(() => {
    if (!data?.monthlyHistory?.length) return 1;
    return Math.max(1, ...data.monthlyHistory.map((m) => Number(m.totalBrl || 0)));
  }, [data]);

  const activeMonth = useMemo(() => {
    if (!data?.monthlyHistory?.length) return null;
    if (hoveredMonth) {
      return data.monthlyHistory.find((m) => m.month === hoveredMonth) || null;
    }
    return data.monthlyHistory[data.monthlyHistory.length - 1];
  }, [data, hoveredMonth]);

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/70 border border-slate-800" />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-slate-900/70 border border-slate-800" />
      </div>
    );
  }

  const summary = data ?? {
    totalReceivedBrl: 0,
    currentMonthBrl: 0,
    last12MonthsBrl: 0,
    monthlyAverageBrl: 0,
    portfolioYieldOnCostPercent: 0,
    monthlyHistory: [],
    byAsset: []
  };

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Proventos &amp; Renda Passiva</h2>
            <p className="text-xs text-slate-400">
              Consolidado de Dividendos, JCP e Amortizações (B3 e Nomad convertidos em BRL)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDividends}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            onClick={onNewDividend}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Lançar Provento</span>
          </button>
        </div>
      </div>

      {/* KPIs de Proventos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
            <span>Total Acumulado</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tabular-nums">
            {hideValues ? MASKED_BRL : formatBrl(summary.totalReceivedBrl)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Todo o período registrado</p>
        </div>

        <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
            <span>Mês Atual</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 tabular-nums">
            {hideValues ? MASKED_BRL : formatBrl(summary.currentMonthBrl)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Proventos recebidos no mês</p>
        </div>

        <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
            <span>Média Mensal</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tabular-nums">
            {hideValues ? MASKED_BRL : formatBrl(summary.monthlyAverageBrl)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Últimos 12m: {hideValues ? MASKED_BRL : formatBrl(summary.last12MonthsBrl)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5">
          <div className="flex items-center justify-between text-[11px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
            <span>Yield on Cost (12m)</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
            {Number(summary.portfolioYieldOnCostPercent || 0).toFixed(2)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sobre o custo total investido</p>
        </div>
      </div>

      {/* Gráfico Mensal + Ranking por Ativo */}
      {summary.monthlyHistory.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/75 border border-dashed border-slate-800 p-10 text-center space-y-3">
          <Coins className="w-8 h-8 text-amber-400/70 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhum provento registrado ainda</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Registre dividendos, JCP ou amortizações usando o botão acima (ou importando via CSV) para acompanhar sua renda passiva mensal e o Yield on Cost da carteira.
          </p>
          <button
            type="button"
            onClick={onNewDividend}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primeiro Provento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico Mensal */}
          <section className="lg:col-span-6 rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white">Histórico Mensal (BRL)</h3>
                <p className="text-xs text-slate-400">Passe o mouse nas barras para detalhar B3 e EUA</p>
              </div>
              {activeMonth && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs tabular-nums">
                  <span className="text-slate-400 mr-2">{activeMonth.label}:</span>
                  <span className="font-bold text-amber-300">
                    {hideValues ? MASKED_BRL : formatBrl(activeMonth.totalBrl)}
                  </span>
                </div>
              )}
            </div>

            <div className="h-52 flex items-end gap-2 sm:gap-3 pt-4 pb-1 px-2 rounded-xl bg-slate-950/60 border border-slate-800/70 overflow-x-auto">
              {summary.monthlyHistory.map((m) => {
                const heightPct = Math.max(8, (Number(m.totalBrl) / maxMonthlyBrl) * 100);
                const brlPart = Number(m.totalBrl) > 0 ? (Number(m.fromBrl) / Number(m.totalBrl)) * 100 : 100;
                const isActive = hoveredMonth === m.month;

                return (
                  <div
                    key={m.month}
                    onMouseEnter={() => setHoveredMonth(m.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="flex-1 min-w-[44px] h-full flex flex-col items-center justify-end gap-1.5 cursor-pointer group"
                  >
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white tabular-nums">
                      {hideValues ? '•••' : formatBrl(m.totalBrl, 0)}
                    </span>
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all ${
                        isActive ? 'ring-2 ring-amber-400/70 brightness-110' : ''
                      }`}
                      style={{ height: `${heightPct * 0.72}%` }}
                    >
                      <div
                        className="w-full bg-amber-500"
                        style={{ height: `${Math.max(0, 100 - brlPart)}%` }}
                        title={`Nomad USD->BRL: ${hideValues ? MASKED_BRL : formatBrl(m.fromUsdInBrl)}`}
                      />
                      <div
                        className="w-full bg-emerald-500"
                        style={{ height: `${brlPart}%` }}
                        title={`B3 BRL: ${hideValues ? MASKED_BRL : formatBrl(m.fromBrl)}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> B3 (BRL)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Exterior (USD convertido)
              </span>
            </div>
          </section>

          {/* Tabela por Ativo */}
          <section className="lg:col-span-6 rounded-2xl bg-slate-900/75 border border-slate-800/90 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Proventos por Ativo</h3>
              <p className="text-xs text-slate-400">Ranking de ativos pagadores e Yield on Cost</p>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Ativo</th>
                    <th className="py-3 px-3 text-right">Pagtos</th>
                    <th className="py-3 px-3 text-right">Recebido</th>
                    <th className="py-3 px-4 text-right">YoC (12m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary.byAsset.map((item) => {
                    const cfg = ASSET_CLASS_CONFIG[item.assetClass] || ASSET_CLASS_CONFIG.CASH;
                    return (
                      <tr key={item.ticker} className="hover:bg-slate-800/35">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.ticker}</div>
                          <div className="text-[10px] text-slate-400">{cfg.shortLabel}</div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300 tabular-nums">
                          {item.paymentsCount}x
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <div className="font-bold text-emerald-300">
                            {hideValues ? MASKED_BRL : formatBrl(item.totalReceivedBrl)}
                          </div>
                          {item.currency === 'USD' && (
                            <div className="text-[10px] text-amber-300/80">
                              {hideValues ? MASKED_NATIVE : formatNativeCurrency(item.totalReceivedNative, 'USD', 2)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white tabular-nums">
                          {Number(item.yieldOnCostPercent).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
