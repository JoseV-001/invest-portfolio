'use client';

import React, { useMemo, useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { PortfolioEvolutionPoint } from '../types';
import { formatBrl } from '../utils/formatters';

interface EquityEvolutionChartProps {
  points: PortfolioEvolutionPoint[];
  hideValues?: boolean;
  isLoading?: boolean;
}

const MASKED_BRL = 'R$ ••••••';

export const EquityEvolutionChart: React.FC<EquityEvolutionChartProps> = ({
  points,
  hideValues = false,
  isLoading = false
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!points || points.length === 0) return null;

    const width = 760;
    const height = 220;
    const padX = 16;
    const padY = 20;

    const values = points.flatMap((p) => [Number(p.grossEquityBrl || 0), Number(p.investedBrl || 0)]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const span = maxVal - minVal;
    const yMin = span > 0 ? Math.max(0, minVal - span * 0.15) : Math.max(0, minVal * 0.85);
    const yMax = span > 0 ? maxVal + span * 0.12 : Math.max(100, maxVal * 1.15);
    const ySpan = Math.max(1, yMax - yMin);

    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const coords = points.map((p, idx) => {
      const x = points.length === 1 ? padX + plotW / 2 : padX + (idx / (points.length - 1)) * plotW;
      const yGross = padY + plotH - ((Number(p.grossEquityBrl || 0) - yMin) / ySpan) * plotH;
      const yInv = padY + plotH - ((Number(p.investedBrl || 0) - yMin) / ySpan) * plotH;
      return { x, yGross, yInv, point: p };
    });

    const grossLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.yGross.toFixed(1)}`).join(' ');
    const invLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.yInv.toFixed(1)}`).join(' ');
    const areaPath =
      coords.length > 1
        ? `${grossLine} L${coords[coords.length - 1].x.toFixed(1)},${(height - padY).toFixed(1)} L${coords[0].x.toFixed(1)},${(height - padY).toFixed(1)} Z`
        : '';

    return { width, height, padX, padY, coords, grossLine, invLine, areaPath };
  }, [points]);

  const activePoint =
    hoverIdx !== null && points[hoverIdx]
      ? points[hoverIdx]
      : points.length > 0
      ? points[points.length - 1]
      : null;

  return (
    <section className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Evolução Patrimonial
            </h2>
            <p className="text-xs text-slate-400">
              Comparativo histórico entre Patrimônio Bruto e Custo Total Investido (BRL)
            </p>
          </div>
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs tabular-nums">
            <span className="text-slate-400 font-medium">{activePoint.label}</span>
            <span className="text-emerald-300 font-bold">
              Patrimônio: {hideValues ? MASKED_BRL : formatBrl(activePoint.grossEquityBrl)}
            </span>
            <span className="text-blue-300 font-medium">
              Investido: {hideValues ? MASKED_BRL : formatBrl(activePoint.investedBrl)}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded font-bold ${
                activePoint.returnPercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {activePoint.returnPercent >= 0
                ? `+${Number(activePoint.returnPercent).toFixed(2)}%`
                : `${Number(activePoint.returnPercent).toFixed(2)}%`}
            </span>
          </div>
        )}
      </div>

      {isLoading && points.length === 0 ? (
        <div className="h-44 rounded-xl bg-slate-950/50 animate-pulse border border-slate-800/60" />
      ) : !chartData ? (
        <div className="py-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <span>Sem histórico suficiente para exibir a curva patrimonial.</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-full overflow-hidden rounded-xl bg-slate-950/60 border border-slate-800/70 p-2 sm:p-3">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full h-44 sm:h-52 overflow-visible"
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="equityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = chartData.padY + (chartData.height - chartData.padY * 2) * ratio;
                return (
                  <line
                    key={ratio}
                    x1={chartData.padX}
                    y1={y}
                    x2={chartData.width - chartData.padX}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {chartData.areaPath && (
                <path d={chartData.areaPath} fill="url(#equityAreaGrad)" />
              )}

              {chartData.coords.length > 1 && (
                <>
                  <path
                    d={chartData.invLine}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                  />
                  <path
                    d={chartData.grossLine}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {chartData.coords.map((c, idx) => {
                const isActive = hoverIdx === idx || (hoverIdx === null && idx === chartData.coords.length - 1);
                return (
                  <g key={c.point.date}>
                    {isActive && (
                      <line
                        x1={c.x}
                        y1={chartData.padY}
                        x2={c.x}
                        y2={chartData.height - chartData.padY}
                        stroke="#334155"
                        strokeWidth="1"
                      />
                    )}
                    <circle
                      cx={c.x}
                      cy={c.yInv}
                      r={isActive ? 4 : 2}
                      fill="#60a5fa"
                      opacity={isActive ? 1 : 0.45}
                    />
                    <circle
                      cx={c.x}
                      cy={c.yGross}
                      r={isActive ? 5 : 2.5}
                      fill="#10b981"
                      stroke="#020617"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={c.x - 14}
                      y={0}
                      width={28}
                      height={chartData.height}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIdx(idx)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
                Patrimônio Bruto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-400" />
                Valor Investido
              </span>
            </div>
            <span className="tabular-nums">
              {points.length} {points.length === 1 ? 'ponto registrado' : 'pontos históricos'}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
