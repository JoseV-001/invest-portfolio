'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Check, Compass, RefreshCw, Save, Sparkles, Target } from 'lucide-react';
import { AllocationTarget, AssetClass, RebalanceSuggestion } from '../types';
import {
  fetchAllocations,
  fetchRebalanceSuggestion,
  updateAllocations
} from '../services/api';
import { ASSET_CLASS_CONFIG, formatBrl, formatUsd } from '../utils/formatters';

interface RebalancePanelProps {
  portfolioId?: number;
  hideValues?: boolean;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const MASKED_BRL = 'R$ ••••••';
const MASKED_USD = 'US$ ••••••';

const PRESETS: { label: string; targets: Partial<Record<AssetClass, number>> }[] = [
  {
    label: 'Global 50/50 (BR & EUA)',
    targets: { STOCKS_BR: 25, FIIS: 15, ETFS_BR: 10, ETFS_US: 30, REITS: 10, STOCKS_US: 10 }
  },
  {
    label: 'Foco Dividendos',
    targets: { FIIS: 30, STOCKS_BR: 25, REITS: 20, ETFS_US: 15, STOCKS_US: 10 }
  },
  {
    label: 'ETFs Consolidado',
    targets: { ETFS_US: 55, ETFS_BR: 15, FIIS: 15, REITS: 15 }
  }
];

export const RebalancePanel: React.FC<RebalancePanelProps> = ({
  portfolioId = 1,
  hideValues = false,
  onNotify
}) => {
  const [allocations, setAllocations] = useState<AllocationTarget[]>([]);
  const [draftTargets, setDraftTargets] = useState<Record<AssetClass, string>>({
    STOCKS_BR: '0',
    FIIS: '0',
    ETFS_BR: '0',
    STOCKS_US: '0',
    REITS: '0',
    ETFS_US: '0',
    CRYPTO: '0',
    CASH: '0'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contributionInput, setContributionInput] = useState('1000');
  const [calculating, setCalculating] = useState(false);
  const [suggestion, setSuggestion] = useState<RebalanceSuggestion | null>(null);

  const loadAllocations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllocations(portfolioId);
      setAllocations(data);
      const nextDraft: Record<AssetClass, string> = {
        STOCKS_BR: '0',
        FIIS: '0',
        ETFS_BR: '0',
        STOCKS_US: '0',
        REITS: '0',
        ETFS_US: '0',
        CRYPTO: '0',
        CASH: '0'
      };
      for (const item of data) {
        nextDraft[item.assetClass] = String(Number(item.targetPercentage || 0));
      }
      setDraftTargets(nextDraft);
    } catch (err: any) {
      onNotify('error', err?.message || 'Erro ao carregar metas de alocação.');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, onNotify]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  const totalTargetPercent = useMemo(() => {
    return Object.values(draftTargets).reduce((acc, val) => {
      const num = parseFloat(val.replace(',', '.'));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [draftTargets]);

  const handleApplyPreset = (presetTargets: Partial<Record<AssetClass, number>>) => {
    const next: Record<AssetClass, string> = {
      STOCKS_BR: '0',
      FIIS: '0',
      ETFS_BR: '0',
      STOCKS_US: '0',
      REITS: '0',
      ETFS_US: '0',
      CRYPTO: '0',
      CASH: '0'
    };
    for (const [k, v] of Object.entries(presetTargets)) {
      next[k as AssetClass] = String(v);
    }
    setDraftTargets(next);
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalTargetPercent > 100.001) {
      onNotify('error', 'A soma das metas não pode ultrapassar 100%.');
      return;
    }
    try {
      setSaving(true);
      const payload = (Object.keys(draftTargets) as AssetClass[]).map((cls) => ({
        assetClass: cls,
        targetPercentage: Number((parseFloat(draftTargets[cls].replace(',', '.')) || 0).toFixed(2))
      }));
      const updated = await updateAllocations(portfolioId, payload);
      setAllocations(updated);
      onNotify('success', 'Metas de alocação salvas com sucesso!');
      const amount = parseFloat(contributionInput.replace(',', '.'));
      if (!isNaN(amount) && amount > 0 && payload.some((p) => p.targetPercentage > 0)) {
        const sim = await fetchRebalanceSuggestion(portfolioId, amount);
        setSuggestion(sim);
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Erro ao salvar metas.');
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateRebalance = async (customAmount?: number) => {
    const amount = customAmount ?? parseFloat(contributionInput.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      onNotify('error', 'Informe um valor de aporte maior que zero.');
      return;
    }
    try {
      setCalculating(true);
      const sim = await fetchRebalanceSuggestion(portfolioId, amount);
      setSuggestion(sim);
    } catch (err: any) {
      onNotify('error', err?.message || 'Não foi possível calcular o rebalanceamento.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Coluna Esquerda: Metas por Classe */}
      <section className="xl:col-span-6 rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Metas de Alocação por Classe</h2>
              <p className="text-xs text-slate-400">Defina a porcentagem ideal de cada classe na carteira</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums ${
              Math.abs(totalTargetPercent - 100) < 0.01
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : totalTargetPercent > 100
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            Soma: {totalTargetPercent.toFixed(1)}%
          </span>
        </div>

        {/* Presets rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] text-slate-500 mr-1 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset.targets)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2.5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-slate-800/40 rounded-xl" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSaveTargets} className="space-y-2.5">
            {allocations.map((item) => {
              const cfg = ASSET_CLASS_CONFIG[item.assetClass] || ASSET_CLASS_CONFIG.CASH;
              const draftVal = parseFloat((draftTargets[item.assetClass] || '0').replace(',', '.')) || 0;
              const diff = Number(item.currentPercentage || 0) - draftVal;

              return (
                <div
                  key={item.assetClass}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.hex }} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{cfg.label}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Atual: <span className="text-slate-200 font-medium">{Number(item.currentPercentage).toFixed(1)}%</span>
                        {' • '}
                        {hideValues ? MASKED_BRL : formatBrl(item.currentValueBrl)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md tabular-nums ${
                        diff < -1
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : diff > 1
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                    </span>

                    <div className="relative w-24">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draftTargets[item.assetClass] ?? '0'}
                        onChange={(e) => {
                          if (/^[0-9]*[.,]?[0-9]{0,2}$/.test(e.target.value)) {
                            setDraftTargets((prev) => ({ ...prev, [item.assetClass]: e.target.value }));
                          }
                        }}
                        className="w-full pr-6 pl-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-bold text-right text-white tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Dica: ajuste os percentuais até totalizar 100%.
              </span>
              <button
                type="submit"
                disabled={saving || totalTargetPercent > 100.001}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? 'Salvando...' : 'Salvar Metas'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Coluna Direita: Simulador Onde Aportar */}
      <section className="xl:col-span-6 rounded-2xl bg-slate-900/75 border border-slate-800/90 p-5 sm:p-6 shadow-xl shadow-black/20 flex flex-col">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Simulador &ldquo;Onde Aportar&rdquo;</h2>
            <p className="text-xs text-slate-400">
              Calcula quanto investir em cada classe defasada sem vender ativos
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800/80 space-y-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Valor disponível para o novo aporte (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={contributionInput}
                onChange={(e) => {
                  if (/^[0-9]*[.,]?[0-9]{0,2}$/.test(e.target.value)) {
                    setContributionInput(e.target.value);
                  }
                }}
                placeholder="Ex: 1000.00"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleCalculateRebalance()}
                disabled={calculating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
              >
                {calculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                <span>Calcular Aporte</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[500, 1000, 2500, 5000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setContributionInput(String(val));
                  handleCalculateRebalance(val);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 tabular-nums"
              >
                R$ {val.toLocaleString('pt-BR')}
              </button>
            ))}
          </div>
        </div>

        {!suggestion ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl text-slate-400">
            <Check className="w-6 h-6 text-emerald-500/60 mb-2" />
            <p className="text-xs font-medium text-slate-300">
              Salve suas metas ao lado e clique em &ldquo;Calcular Aporte&rdquo;
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              O algoritmo prioriza automaticamente as classes mais distantes da meta ideal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1 text-slate-400 tabular-nums">
              <span>
                Patrimônio projetado:{' '}
                <strong className="text-white">
                  {hideValues ? MASKED_BRL : formatBrl(suggestion.projectedTotalEquityBrl)}
                </strong>
              </span>
              <span>
                Câmbio: <strong className="text-emerald-300">R$ {Number(suggestion.usdBrlRate).toFixed(2)}</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {suggestion.items.map((item) => {
                const cfg = ASSET_CLASS_CONFIG[item.assetClass] || ASSET_CLASS_CONFIG.CASH;
                const isUsClass =
                  item.assetClass === 'STOCKS_US' ||
                  item.assetClass === 'REITS' ||
                  item.assetClass === 'ETFS_US' ||
                  item.assetClass === 'CRYPTO';

                return (
                  <div
                    key={item.assetClass}
                    className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800/90 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.hex }} />
                        <span className="text-xs font-bold text-white">{cfg.label}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-extrabold text-emerald-400">
                          {hideValues ? MASKED_BRL : formatBrl(item.suggestedAmountBrl)}
                        </div>
                        {isUsClass && item.suggestedAmountBrl > 0 && (
                          <div className="text-[10px] text-amber-300/90 font-medium">
                            ≈ {hideValues ? MASKED_USD : formatUsd(item.suggestedAmountUsd)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 tabular-nums">
                      <span>
                        Atual <strong className="text-slate-200">{Number(item.currentPercentage).toFixed(1)}%</strong>
                        {' → '}
                        Projetado <strong className="text-emerald-300">{Number(item.projectedPercentage).toFixed(1)}%</strong>
                        {' '}
                        (Meta {Number(item.targetPercentage).toFixed(1)}%)
                      </span>

                      {item.suggestedTickers && item.suggestedTickers.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Sugestões:</span>
                          {item.suggestedTickers.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
