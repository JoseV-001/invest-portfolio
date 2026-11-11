'use client';

import React, { useState } from 'react';
import { AssetPosition } from '../types';
import { ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

interface AssetsTableProps {
  positions: AssetPosition[];
}

export const AssetsTable: React.FC<AssetsTableProps> = ({ positions }) => {
  const [filterMarket, setFilterMarket] = useState<'ALL' | 'B3' | 'US'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = positions.filter((p) => {
    const matchesMarket =
      filterMarket === 'ALL' ||
      (filterMarket === 'B3' && p.market === 'B3') ||
      (filterMarket === 'US' && (p.market === 'NYSE' || p.market === 'NASDAQ'));

    const matchesSearch =
      p.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesMarket && matchesSearch;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header com Filtros */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Posições Atuais</h2>
          <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-400">
            {filtered.length} ativos
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Campo de Busca */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar ticker ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro Mercado */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setFilterMarket('ALL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMarket === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMarket('B3')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMarket === 'B3' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              B3 (Inter)
            </button>
            <button
              onClick={() => setFilterMarket('US')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterMarket === 'US' ? 'bg-amber-600/30 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              EUA (Nomad)
            </button>
          </div>
        </div>
      </div>

      {/* Tabela Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Ativo</th>
              <th className="py-3 px-3">Mercado / Tipo</th>
              <th className="py-3 px-3 text-right">Quantidade</th>
              <th className="py-3 px-3 text-right">Preço Médio</th>
              <th className="py-3 px-3 text-right">Cotação Atual</th>
              <th className="py-3 px-3 text-right">Saldo (Moeda)</th>
              <th className="py-3 px-3 text-right">Total em R$</th>
              <th className="py-3 px-3 text-right">Rentabilidade</th>
              <th className="py-3 px-4 text-right">Carteira %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((pos) => {
              const isProfit = pos.returnRatePercent >= 0;
              const isUsd = pos.currency === 'USD';

              return (
                <tr key={pos.ticker} className="hover:bg-slate-800/40 transition-colors">
                  {/* Ticker & Nome */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{pos.ticker}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{pos.name}</div>
                  </td>

                  {/* Mercado & Tipo */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          pos.market === 'B3'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {pos.market}
                      </span>
                      <span className="text-[11px] text-slate-400">{pos.assetClass}</span>
                    </div>
                  </td>

                  {/* Quantidade (com suporte a frações) */}
                  <td className="py-3.5 px-3 text-right font-medium text-slate-200">
                    {Number(pos.quantity).toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 6,
                    })}
                  </td>

                  {/* Preço Médio */}
                  <td className="py-3.5 px-3 text-right text-slate-300">
                    {isUsd ? 'US$ ' : 'R$ '}
                    {Number(pos.averagePrice).toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* Cotação Atual */}
                  <td className="py-3.5 px-3 text-right font-semibold text-white">
                    {isUsd ? 'US$ ' : 'R$ '}
                    {Number(pos.currentPrice).toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* Saldo na Moeda Nativa */}
                  <td className="py-3.5 px-3 text-right text-slate-300 font-medium">
                    {isUsd ? 'US$ ' : 'R$ '}
                    {Number(pos.currentGrossValue).toLocaleString(isUsd ? 'en-US' : 'pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* Total em Reais Consolidado */}
                  <td className="py-3.5 px-3 text-right font-bold text-white">
                    R$ {Number(pos.currentGrossValueBrl).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* Rentabilidade */}
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        isProfit
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isProfit ? `+${pos.returnRatePercent}%` : `${pos.returnRatePercent}%`}
                    </span>
                  </td>

                  {/* Carteira % */}
                  <td className="py-3.5 px-4 text-right font-medium text-slate-400">
                    {pos.portfolioSharePercent}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
