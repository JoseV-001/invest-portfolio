'use client';

import React from 'react';
import { AssetClass } from '../types';
import { PieChart } from 'lucide-react';

interface AssetAllocationChartProps {
  allocation: Record<AssetClass, number>;
}

const CLASS_LABELS: Record<AssetClass, { label: string; color: string }> = {
  STOCKS_BR: { label: 'Ações Brasil (B3)', color: 'bg-blue-500' },
  FIIS: { label: 'Fundos Imobiliários (FIIs)', color: 'bg-emerald-500' },
  ETFS_BR: { label: 'ETFs Brasil', color: 'bg-cyan-500' },
  STOCKS_US: { label: 'Ações EUA (Stocks)', color: 'bg-amber-500' },
  REITS: { label: 'REITs (EUA)', color: 'bg-orange-500' },
  ETFS_US: { label: 'ETFs EUA (Nomad)', color: 'bg-indigo-500' },
  CRYPTO: { label: 'Criptoativos', color: 'bg-purple-500' },
  CASH: { label: 'Caixa / Reserva', color: 'bg-slate-500' },
};

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({ allocation }) => {
  const entries = Object.entries(allocation || {}) as [AssetClass, number][];
  const sorted = entries.filter(([_, pct]) => pct > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Asset Allocation (Distribuição por Classe)</h2>
        </div>
      </div>

      {/* Barra de Distribuição Horizontal Contínua */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800 mb-5">
        {sorted.map(([cls, pct]) => {
          const config = CLASS_LABELS[cls] || { label: cls, color: 'bg-slate-600' };
          return (
            <div
              key={cls}
              className={`${config.color} h-full transition-all`}
              style={{ width: `${pct}%` }}
              title={`${config.label}: ${pct}%`}
            />
          );
        })}
      </div>

      {/* Lista com porcentagens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(([cls, pct]) => {
          const config = CLASS_LABELS[cls] || { label: cls, color: 'bg-slate-600' };
          return (
            <div key={cls} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">{config.label}</span>
              </div>
              <span className="text-xs font-bold text-white">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
