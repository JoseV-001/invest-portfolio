'use client';

import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  Globe2,
  Building2,
  Layers
} from 'lucide-react';
import { PortfolioSummary } from '../types';
import { formatBrl, formatUsd } from '../utils/formatters';

interface SummaryCardsProps {
  summary: PortfolioSummary;
  hideValues?: boolean;
}

const MASKED_BRL = 'R$ ••••••';
const MASKED_USD = 'US$ ••••••';

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, hideValues = false }) => {
  const isPositive = summary.totalProfitLossBrl >= 0;
  const usdRate = summary.currentUsdBrlRate > 0 ? summary.currentUsdBrlRate : 5.75;

  const grossEquityUsd =
    summary.totalGrossEquityUsd && summary.totalGrossEquityUsd > 0
      ? summary.totalGrossEquityUsd
      : summary.totalGrossEquityBrl / usdRate;

  const b3SharePct =
    summary.totalGrossEquityBrl > 0
      ? (summary.totalEquityB3Brl / summary.totalGrossEquityBrl) * 100
      : 0;

  const nomadSharePct =
    summary.totalGrossEquityBrl > 0
      ? (summary.totalEquityNomadBrl / summary.totalGrossEquityBrl) * 100
      : 0;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* KPI 1: Patrimônio Bruto Consolidado (R$ e equivalente em US$) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col justify-between">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
              Patrimônio Bruto Consolidado
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-white tabular-nums">
            {hideValues ? MASKED_BRL : formatBrl(summary.totalGrossEquityBrl)}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/90 border border-slate-800 text-xs font-semibold text-slate-200 tabular-nums">
              <span className="text-slate-400 font-normal">Equivalente:</span>
              {hideValues ? MASKED_USD : formatUsd(grossEquityUsd)}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{summary.positions.length} ativos em carteira</span>
          </span>
          <span className="tabular-nums text-slate-500">
            Câmbio base R$ {usdRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* KPI 2: Total Investido vs. Lucro/Prejuízo Total */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col justify-between">
        <div
          className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${
            isPositive ? 'from-emerald-400 via-emerald-500/50 to-transparent' : 'from-rose-500 via-rose-500/50 to-transparent'
          }`}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
              Resultado &amp; Rentabilidade
            </span>
            <div
              className={`p-2 rounded-lg border ${
                isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5">
            <span
              className={`text-3xl sm:text-[32px] font-extrabold tracking-tight tabular-nums ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {hideValues ? (
                MASKED_BRL
              ) : (
                <>
                  {isPositive ? '+' : '-'}
                  {formatBrl(Math.abs(summary.totalProfitLossBrl))}
                </>
              )}
            </span>

            <span
              className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {summary.totalReturnPercent >= 0
                ? `+${summary.totalReturnPercent.toFixed(2)}%`
                : `${summary.totalReturnPercent.toFixed(2)}%`}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2">
            Variação sobre o custo médio consolidado em Reais
          </p>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-800/70 flex items-center justify-between text-xs">
          <span className="text-slate-400">Custo Total Investido</span>
          <span className="font-bold text-slate-100 tabular-nums">
            {hideValues ? MASKED_BRL : formatBrl(summary.totalInvestedBrl)}
          </span>
        </div>
      </div>

      {/* KPI 3: Comparativo Brasil (B3) vs. Exterior (Nomad) & Exposição Cambial */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col justify-between">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500" />

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase font-semibold tracking-wider text-slate-400">
              Exposição Geográfica &amp; Cambial
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 tabular-nums">
              <Globe2 className="w-3 h-3" />
              {nomadSharePct.toFixed(1)}% USD
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            {/* Bloco B3 */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Brasil (B3 / BRL)</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white tabular-nums">
                {hideValues ? MASKED_BRL : formatBrl(summary.totalEquityB3Brl)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                {b3SharePct.toFixed(1)}% • BRL
              </div>
            </div>

            {/* Bloco Exterior & Cripto */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 mb-1">
                <Globe2 className="w-3.5 h-3.5" />
                <span>Exterior &amp; Cripto (USD)</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white tabular-nums">
                {hideValues ? MASKED_BRL : formatBrl(summary.totalEquityNomadBrl)}
              </div>
              <div className="text-[11px] text-amber-300/90 font-medium mt-0.5 tabular-nums">
                {hideValues ? MASKED_USD : formatUsd(summary.totalEquityNomadUsd)} ({nomadSharePct.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Barra comparativa Brasil vs Exterior */}
        <div className="mt-4">
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-800">
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${b3SharePct}%` }}
              title={`Brasil (B3): ${b3SharePct.toFixed(1)}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${nomadSharePct}%` }}
              title={`Exterior (Nomad USD): ${nomadSharePct.toFixed(1)}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              BRL {b3SharePct.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              Dolarizado {nomadSharePct.toFixed(1)}%
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
