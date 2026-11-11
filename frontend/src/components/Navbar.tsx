'use client';

import React from 'react';
import { DollarSign, PieChart, PlusCircle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  usdRate?: number;
  onNewTransaction: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  usdRate,
  onNewTransaction,
  onRefresh,
  isLoading
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Invest Portfolio</h1>
            <p className="text-xs text-slate-400">B3 & Nomad Multi-Market Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {usdRate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">USD/BRL:</span>
              <span className="font-semibold text-white">
                R$ {usdRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Atualizar cotações"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={onNewTransaction}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};
