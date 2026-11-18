'use client';

import React, { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { AssetClass, AssetPosition } from '../types';
import { ASSET_CLASS_CONFIG, formatBrl } from '../utils/formatters';

interface AssetAllocationChartProps {
  allocation: Record<AssetClass, number>;
  allocationBrl?: Partial<Record<AssetClass, number>>;
  positions?: AssetPosition[];
  totalGrossEquityBrl?: number;
}

interface AllocationSlice {
  assetClass: AssetClass;
  percent: number;
  valueBrl: number;
  label: string;
  hex: string;
  bgClass: string;
  badgeClass: string;
}

export const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({
  allocation,
  allocationBrl,
  positions = [],
  totalGrossEquityBrl = 0
}) => {
  const [hoveredClass, setHoveredClass] = useState<AssetClass | null>(null);

  const slices: AllocationSlice[] = useMemo(() => {
    const sumByClassFromPositions: Partial<Record<AssetClass, number>> = {};
    for (const pos of positions) {
      sumByClassFromPositions[pos.assetClass] =
        (sumByClassFromPositions[pos.assetClass] || 0) + Number(pos.currentGrossValueBrl || 0);
    }

    const entries = Object.entries(allocation || {}) as [AssetClass, number][];
    return entries
      .filter(([_, pct]) => Number(pct) > 0)
      .map(([cls, pct]) => {
        const cfg = ASSET_CLASS_CONFIG[cls] || ASSET_CLASS_CONFIG.CASH;
        const exactBrl =
          allocationBrl?.[cls] !== undefined
            ? Number(allocationBrl[cls])
            : sumByClassFromPositions[cls] !== undefined
            ? Number(sumByClassFromPositions[cls])
            : (totalGrossEquityBrl * Number(pct)) / 100;

        return {
          assetClass: cls,
          percent: Number(pct),
          valueBrl: exactBrl,
          label: cfg.label,
          hex: cfg.hex,
          bgClass: cfg.bgClass,
          badgeClass: cfg.badgeClass
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [allocation, allocationBrl, positions, totalGrossEquityBrl]);

  const totalPct = useMemo(
    () => slices.reduce((acc, item) => acc + item.percent, 0) || 100,
    [slices]
  );

  const activeSlice = useMemo(
    () => slices.find((s) => s.assetClass === hoveredClass) || null,
    [slices, hoveredClass]
  );

  // Geometria SVG Donut
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <section className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Alocação por Classe de Ativo
            </h2>
            <p className="text-xs text-slate-400">
              Passe o mouse sobre os segmentos ou classes para inspecionar saldo em R$ e participação %
            </p>
          </div>
        </div>

        {activeSlice && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs animate-fade-in">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeSlice.hex }}
            />
            <span className="text-slate-300 font-medium">{activeSlice.label}:</span>
            <span className="font-bold text-white tabular-nums">
              {formatBrl(activeSlice.valueBrl)}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold tabular-nums">
              {activeSlice.percent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {slices.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Nenhum ativo alocado na carteira até o momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* SVG Donut Interativo */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform overflow-visible" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="20"
                />
                {slices.map((slice) => {
                  const normalizedFraction = slice.percent / totalPct;
                  const dashLength = Math.max(0, normalizedFraction * circumference - 2);
                  const strokeDasharray = `${dashLength} ${circumference}`;
                  const strokeDashoffset = -cumulativeOffset;
                  cumulativeOffset += normalizedFraction * circumference;

                  const isHovered = hoveredClass === slice.assetClass;
                  const isDimmed = hoveredClass !== null && !isHovered;

                  return (
                    <circle
                      key={slice.assetClass}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke={slice.hex}
                      strokeWidth={isHovered ? 25 : 20}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                      className="transition-all duration-200 cursor-pointer"
                      style={{
                        opacity: isDimmed ? 0.35 : 1,
                        filter: isHovered ? `drop-shadow(0 0 8px ${slice.hex}66)` : 'none'
                      }}
                      onMouseEnter={() => setHoveredClass(slice.assetClass)}
                      onMouseLeave={() => setHoveredClass(null)}
                    >
                      <title>
                        {`${slice.label}: ${formatBrl(slice.valueBrl)} (${slice.percent.toFixed(2)}%)`}
                      </title>
                    </circle>
                  );
                })}
              </svg>

              {/* Centro Dinâmico do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 pointer-events-none">
                {activeSlice ? (
                  <>
                    <span className="text-[11px] font-medium text-slate-400 line-clamp-1">
                      {ASSET_CLASS_CONFIG[activeSlice.assetClass]?.shortLabel || activeSlice.label}
                    </span>
                    <span className="text-lg font-extrabold text-white tabular-nums mt-0.5">
                      {activeSlice.percent.toFixed(2)}%
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400 tabular-nums mt-0.5">
                      {formatBrl(activeSlice.valueBrl)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Total Alocado
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums mt-1">
                      {formatBrl(totalGrossEquityBrl)}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      {slices.length} classes
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Barras & Cards Interativos por Classe */}
          <div className="lg:col-span-8 space-y-4">
            {/* Barra empilhada horizontal */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-950 p-0.5 border border-slate-800 gap-0.5">
              {slices.map((slice) => {
                const isHovered = hoveredClass === slice.assetClass;
                const isDimmed = hoveredClass !== null && !isHovered;
                return (
                  <div
                    key={slice.assetClass}
                    onMouseEnter={() => setHoveredClass(slice.assetClass)}
                    onMouseLeave={() => setHoveredClass(null)}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer"
                    style={{
                      width: `${(slice.percent / totalPct) * 100}%`,
                      backgroundColor: slice.hex,
                      opacity: isDimmed ? 0.35 : 1
                    }}
                    title={`${slice.label} • ${formatBrl(slice.valueBrl)} (${slice.percent.toFixed(2)}%)`}
                  />
                );
              })}
            </div>

            {/* Grid de Classes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {slices.map((slice) => {
                const isHovered = hoveredClass === slice.assetClass;
                return (
                  <div
                    key={slice.assetClass}
                    onMouseEnter={() => setHoveredClass(slice.assetClass)}
                    onMouseLeave={() => setHoveredClass(null)}
                    className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-slate-800/90 border-slate-600 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 transition-transform group-hover:scale-125"
                        style={{ backgroundColor: slice.hex }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {slice.label}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {formatBrl(slice.valueBrl)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right pl-2 shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-bold text-white tabular-nums">
                        {slice.percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
