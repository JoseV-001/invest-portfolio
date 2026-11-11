'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Globe2, Building2 } from 'lucide-react';
import { PortfolioSummary } from '../types';

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const isPositive = summary.totalProfitLossBrl >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Patrimônio Total */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-medium tracking-wider">Patrimônio Consolidado</span>
          <Wallet className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          R$ {summary.totalGrossEquityBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Investido: R$ {summary.totalInvestedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Rentabilidade Total */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-medium tracking-wider">Lucro / Prejuízo Total</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}R$ {summary.totalProfitLossBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.totalReturnPercent >= 0 ? `+${summary.totalReturnPercent}%` : `${summary.totalReturnPercent}%`}
          </span>
          <span className="text-xs text-slate-500">rentabilidade geral</span>
        </div>
      </div>

      {/* Mercado Nacional (B3) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-medium tracking-wider">Brasil (B3 - Inter)</span>
          <Building2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          R$ {summary.totalEquityB3Brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {summary.totalGrossEquityBrl > 0
            ? `${((summary.totalEquityB3Brl / summary.totalGrossEquityBrl) * 100).toFixed(1)}% do total da carteira`
            : '0%'}
        </div>
      </div>

      {/* Mercado Internacional (Nomad) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs uppercase font-medium tracking-wider">Exterior (Nomad)</span>
          <Globe2 className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-white">
          R$ {summary.totalEquityNomadBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-amber-400/90 font-medium mt-1">
          US$ {summary.totalEquityNomadUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-slate-500 ml-1">
            ({summary.totalGrossEquityBrl > 0
              ? `${((summary.totalEquityNomadBrl / summary.totalGrossEquityBrl) * 100).toFixed(1)}%`
              : '0%'})
          </span>
        </div>
      </div>
    </div>
  );
};
