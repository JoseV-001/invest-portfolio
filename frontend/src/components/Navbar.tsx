'use client';

import React from 'react';
import { Clock, DollarSign, Eye, EyeOff, PieChart, Plus, RefreshCw, WifiOff } from 'lucide-react';
import { formatTimestampPtBr } from '../utils/formatters';

interface NavbarProps {
  usdRate?: number;
  lastUpdatedAt?: string;
  isOfflineDemo?: boolean;
  hideValues?: boolean;
  onToggleHideValues: () => void;
  onNewTransaction: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  usdRate,
  lastUpdatedAt,
  isOfflineDemo = false,
  hideValues = false,
  onToggleHideValues,
  onNewTransaction,
  onRefresh,
  isLoading = false
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/65 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/5 border border-emerald-500/30 text-emerald-400 shadow-inner">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">
                Invest<span className="text-emerald-400">Portfolio</span>
              </h1>
              {isOfflineDemo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <WifiOff className="w-3 h-3" />
                  Modo Demo
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Consolidação Multi-Mercado • B3 (Inter) &amp; NYSE/NASDAQ (Nomad)
            </p>
          </div>
        </div>

        {/* Telemetry & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Timestamp da última atualização */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/90 text-[11px] text-slate-400"
            title="Horário da última sincronização de cotações"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Cotações:</span>
            <span className="text-slate-200 font-medium tabular-nums">
              {formatTimestampPtBr(lastUpdatedAt)}
            </span>
          </div>

          {/* Badge Câmbio USD/BRL */}
          {typeof usdRate === 'number' && usdRate > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/25 text-xs shadow-sm"
              title="Taxa de câmbio comercial USD/BRL aplicada na consolidação"
            >
              <div className="p-0.5 rounded bg-emerald-500/15 text-emerald-400">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-400 hidden md:inline">USD/BRL</span>
              <span className="font-bold text-emerald-300 tabular-nums">
                R$ {usdRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          )}

          {/* Botão Ocultar/Mostrar Valores */}
          <button
            type="button"
            onClick={onToggleHideValues}
            aria-pressed={hideValues}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              hideValues
                ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title={hideValues ? 'Mostrar valores e investimentos' : 'Ocultar valores e investimentos'}
          >
            {hideValues ? (
              <Eye className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">
              {hideValues ? 'Mostrar' : 'Ocultar'}
            </span>
          </button>

          {/* Botão Atualizar Cotações com Spinner */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-medium text-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            title="Forçar atualização sequencial de cotações e câmbio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {isLoading ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>

          {/* CTA Novo Lançamento */}
          <button
            type="button"
            onClick={onNewTransaction}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md shadow-emerald-950/50 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};
