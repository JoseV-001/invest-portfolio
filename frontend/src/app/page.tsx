'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Compass,
  History,
  LayoutDashboard,
  RefreshCw,
  Sparkles,
  WifiOff,
  X
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SummaryCards } from '../components/SummaryCards';
import { AssetsTable } from '../components/AssetsTable';
import { AssetAllocationChart } from '../components/AssetAllocationChart';
import { EquityEvolutionChart } from '../components/EquityEvolutionChart';
import { RebalancePanel } from '../components/RebalancePanel';
import { DividendsPanel } from '../components/DividendsPanel';
import { TransactionsHistoryPanel } from '../components/TransactionsHistoryPanel';
import { TransactionModal } from '../components/TransactionModal';
import { EditPositionModal } from '../components/EditPositionModal';
import { AiChatDrawer, PendingTickerAnalysis } from '../components/AiChatDrawer';
import {
  AssetPosition,
  PortfolioEvolutionPoint,
  PortfolioSummary,
  PositionUpdateRequest,
  TransactionRequest,
  TransactionType
} from '../types';
import {
  fetchPortfolioEvolution,
  fetchPortfolioSummary,
  createTransaction,
  updatePosition,
  removePosition
} from '../services/api';

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

// Dados estritamente identificados como Demonstração quando o Backend está offline
const DEMO_FALLBACK_SUMMARY: PortfolioSummary = {
  portfolioId: 1,
  portfolioName: 'Carteira Principal Consolidada (Demonstração)',
  currentUsdBrlRate: 5.5,
  lastUpdatedAt: '2026-01-15T18:00:00Z',
  totalInvestedBrl: 27098.5,
  totalGrossEquityBrl: 28894.1,
  totalGrossEquityUsd: 5253.47,
  totalProfitLossBrl: 1795.6,
  totalReturnPercent: 6.63,
  totalEquityB3Brl: 10044.5,
  totalEquityNomadUsd: 3427.2,
  totalEquityNomadBrl: 18849.6,
  allocationByClassPercent: {
    STOCKS_BR: 17.71,
    FIIS: 7.87,
    ETFS_BR: 5.66,
    STOCKS_US: 28.76,
    REITS: 12.36,
    ETFS_US: 27.64,
    CRYPTO: 0.0,
    CASH: 0.0
  },
  positions: [
    {
      assetId: 5,
      ticker: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      assetClass: 'ETFS_US',
      market: 'NYSE',
      currency: 'USD',
      quantity: 1.2,
      averagePrice: 500.0,
      currentPrice: 545.0,
      totalInvested: 600.0,
      currentGrossValue: 654.0,
      totalInvestedBrl: 3300.0,
      currentGrossValueBrl: 3597.0,
      profitLossBrl: 297.0,
      returnRatePercent: 9.0,
      portfolioSharePercent: 12.45
    },
    {
      assetId: 4,
      ticker: 'SCHD',
      name: 'Schwab US Dividend Equity ETF',
      assetClass: 'ETFS_US',
      market: 'NYSE',
      currency: 'USD',
      quantity: 10,
      averagePrice: 28.0,
      currentPrice: 30.5,
      totalInvested: 280.0,
      currentGrossValue: 305.0,
      totalInvestedBrl: 1540.0,
      currentGrossValueBrl: 1677.5,
      profitLossBrl: 137.5,
      returnRatePercent: 8.93,
      portfolioSharePercent: 5.81
    },
    {
      assetId: 1,
      ticker: 'MXRF11',
      name: 'Maxi Renda FII',
      assetClass: 'FIIS',
      market: 'B3',
      currency: 'BRL',
      quantity: 120,
      averagePrice: 10.0,
      currentPrice: 10.25,
      totalInvested: 1200.0,
      currentGrossValue: 1230.0,
      totalInvestedBrl: 1200.0,
      currentGrossValueBrl: 1230.0,
      profitLossBrl: 30.0,
      returnRatePercent: 2.5,
      portfolioSharePercent: 4.26
    },
    {
      assetId: 7,
      ticker: 'O',
      name: 'Realty Income Corporation',
      assetClass: 'REITS',
      market: 'NYSE',
      currency: 'USD',
      quantity: 3.5,
      averagePrice: 56.0,
      currentPrice: 58.0,
      totalInvested: 196.0,
      currentGrossValue: 203.0,
      totalInvestedBrl: 1078.0,
      currentGrossValueBrl: 1116.5,
      profitLossBrl: 38.5,
      returnRatePercent: 3.57,
      portfolioSharePercent: 3.86
    },
    {
      assetId: 8,
      ticker: 'BOVA11',
      name: 'iShares Ibovespa ETF',
      assetClass: 'ETFS_BR',
      market: 'B3',
      currency: 'BRL',
      quantity: 8,
      averagePrice: 125.0,
      currentPrice: 132.5,
      totalInvested: 1000.0,
      currentGrossValue: 1060.0,
      totalInvestedBrl: 1000.0,
      currentGrossValueBrl: 1060.0,
      profitLossBrl: 60.0,
      returnRatePercent: 6.0,
      portfolioSharePercent: 3.67
    },
    {
      assetId: 2,
      ticker: 'KNCR11',
      name: 'Kinea Rendimentos Imobiliários FII',
      assetClass: 'FIIS',
      market: 'B3',
      currency: 'BRL',
      quantity: 10,
      averagePrice: 102.0,
      currentPrice: 104.5,
      totalInvested: 1020.0,
      currentGrossValue: 1045.0,
      totalInvestedBrl: 1020.0,
      currentGrossValueBrl: 1045.0,
      profitLossBrl: 25.0,
      returnRatePercent: 2.45,
      portfolioSharePercent: 3.62
    },
    {
      assetId: 6,
      ticker: 'AAPL',
      name: 'Apple Inc',
      assetClass: 'STOCKS_US',
      market: 'NASDAQ',
      currency: 'USD',
      quantity: 0.75,
      averagePrice: 220.0,
      currentPrice: 244.0,
      totalInvested: 165.0,
      currentGrossValue: 183.0,
      totalInvestedBrl: 907.5,
      currentGrossValueBrl: 1006.5,
      profitLossBrl: 99.0,
      returnRatePercent: 10.91,
      portfolioSharePercent: 3.48
    },
    {
      assetId: 3,
      ticker: 'PETR4',
      name: 'Petrobras PN',
      assetClass: 'STOCKS_BR',
      market: 'B3',
      currency: 'BRL',
      quantity: 25,
      averagePrice: 35.0,
      currentPrice: 38.4,
      totalInvested: 875.0,
      currentGrossValue: 960.0,
      totalInvestedBrl: 875.0,
      currentGrossValueBrl: 960.0,
      profitLossBrl: 85.0,
      returnRatePercent: 9.71,
      portfolioSharePercent: 3.32
    }
  ]
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* KPI Skeletons */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 h-44 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center">
            <div className="h-3 w-40 bg-slate-800 rounded" />
            <div className="h-8 w-8 bg-slate-800 rounded-lg" />
          </div>
          <div className="space-y-2.5">
            <div className="h-8 w-48 bg-slate-800 rounded-lg" />
            <div className="h-4 w-32 bg-slate-800/70 rounded" />
          </div>
          <div className="h-3 w-full bg-slate-800/60 rounded" />
        </div>
      ))}
    </div>

    {/* Allocation Chart Skeleton */}
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6">
      <div className="h-4 w-56 bg-slate-800 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-4 flex justify-center">
          <div className="w-44 h-44 rounded-full border-[18px] border-slate-800" />
        </div>
        <div className="lg:col-span-8 space-y-3">
          <div className="h-3 w-full bg-slate-800 rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="h-14 bg-slate-950/60 border border-slate-800/60 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Table Skeleton */}
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex justify-between items-center">
        <div className="h-5 w-48 bg-slate-800 rounded" />
        <div className="h-8 w-64 bg-slate-800 rounded-xl" />
      </div>
      <div className="p-5 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((r) => (
          <div key={r} className="h-12 w-full bg-slate-800/40 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

const AUTO_REFRESH_INTERVAL_MS = 60_000;
const HIDE_VALUES_STORAGE_KEY = 'invest-portfolio:hide-values';

type DashboardTab = 'overview' | 'rebalance' | 'dividends' | 'transactions';

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [evolutionPoints, setEvolutionPoints] = useState<PortfolioEvolutionPoint[]>([]);
  const [evolutionLoading, setEvolutionLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [refreshSignal, setRefreshSignal] = useState<number>(0);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOfflineDemo, setIsOfflineDemo] = useState<boolean>(false);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const [hideValues, setHideValues] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('BUY');
  const [editingPosition, setEditingPosition] = useState<AssetPosition | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [pendingAiAnalysis, setPendingAiAnalysis] = useState<PendingTickerAnalysis | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HIDE_VALUES_STORAGE_KEY);
      if (saved === 'true') {
        setHideValues(true);
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const handleToggleHideValues = useCallback(() => {
    setHideValues((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HIDE_VALUES_STORAGE_KEY, String(next));
      } catch {
        // ignore storage access errors
      }
      return next;
    });
  }, []);

  const pushToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const loadData = useCallback(
    async (refresh: boolean = false, showSuccessToast: boolean = false) => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      try {
        setIsRefreshing(true);
        const data = await fetchPortfolioSummary(1, refresh);
        setSummary({
          ...data,
          lastUpdatedAt: data.lastUpdatedAt || new Date().toISOString()
        });
        setIsOfflineDemo(false);
        setOfflineReason(null);
        setRefreshSignal((prev) => prev + 1);
        setEvolutionLoading(true);
        fetchPortfolioEvolution(1)
          .then((pts) => setEvolutionPoints(pts))
          .catch(() => {})
          .finally(() => setEvolutionLoading(false));
        if (showSuccessToast) {
          pushToast(
            'success',
            refresh
              ? 'Cotações e câmbio sincronizados com sucesso!'
              : 'Conexão com o servidor restabelecida!'
          );
        }
      } catch (err: any) {
        setIsOfflineDemo(true);
        setOfflineReason(
          err?.message || 'Servidor backend indisponível no momento.'
        );
        setSummary((prev) => prev ?? DEMO_FALLBACK_SUMMARY);
        if (showSuccessToast) {
          pushToast('error', 'Ainda não foi possível conectar ao backend.');
        }
      } finally {
        isFetchingRef.current = false;
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    loadData(false, false);

    const intervalId = setInterval(() => {
      if (!document.hidden && !isFetchingRef.current) {
        loadData(false, false);
      }
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden && !isFetchingRef.current) {
        loadData(false, false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  const handleCreateTransaction = async (data: TransactionRequest) => {
    await createTransaction(data);
    await loadData(false, false);
    pushToast('success', `Lançamento em ${data.ticker} registrado com sucesso!`);
  };

  const handleUpdatePosition = async (assetId: number, data: PositionUpdateRequest) => {
    const updated = await updatePosition(summary?.portfolioId || 1, assetId, data);
    setSummary({
      ...updated,
      lastUpdatedAt: updated.lastUpdatedAt || new Date().toISOString()
    });
    setIsOfflineDemo(false);
    pushToast('success', 'Posição atualizada com sucesso!');
  };

  const handleRemovePosition = async (position: AssetPosition) => {
    try {
      await removePosition(summary?.portfolioId || 1, position.assetId);
      await loadData(false, false);
      pushToast('success', `Ativo ${position.ticker} removido da carteira.`);
    } catch (err: any) {
      pushToast('error', err?.message || `Erro ao remover ${position.ticker}.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      <Navbar
        usdRate={summary?.currentUsdBrlRate}
        lastUpdatedAt={summary?.lastUpdatedAt}
        isOfflineDemo={isOfflineDemo}
        hideValues={hideValues}
        onToggleHideValues={handleToggleHideValues}
        onOpenAiCopilot={() => setIsAiDrawerOpen(true)}
        onNewTransaction={() => {
          setModalDefaultType('BUY');
          setIsModalOpen(true);
        }}
        onRefresh={() => loadData(true, true)}
        isLoading={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navegação por Abas */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview' as const, label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'rebalance' as const, label: 'Metas & Onde Aportar', icon: Compass },
            { id: 'dividends' as const, label: 'Proventos', icon: Coins },
            { id: 'transactions' as const, label: 'Extrato & CSV', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Banner Explícito de Modo Offline / Demonstração */}
        {!isInitialLoading && isOfflineDemo && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/35 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    Modo Offline / Dados de Demonstração
                  </span>
                </div>
                <p className="text-xs text-amber-100/85 mt-1">
                  Não foi possível alcançar a API do backend ({offlineReason}). Exibindo snapshot demonstrativo somente para visualização.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadData(false, true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Reconectando...' : 'Tentar Reconectar'}</span>
            </button>
          </div>
        )}

        {isInitialLoading || !summary ? (
          <DashboardSkeleton />
        ) : activeTab === 'overview' ? (
          <>
            <SummaryCards summary={summary} hideValues={hideValues} />
            <EquityEvolutionChart
              points={evolutionPoints}
              hideValues={hideValues}
              isLoading={evolutionLoading}
            />
            <AssetAllocationChart
              allocation={summary.allocationByClassPercent}
              allocationBrl={summary.allocationByClassBrl}
              positions={summary.positions}
              totalGrossEquityBrl={summary.totalGrossEquityBrl}
              hideValues={hideValues}
            />
            <AssetsTable
              positions={summary.positions}
              usdRate={summary.currentUsdBrlRate}
              hideValues={hideValues}
              onEditPosition={(pos) => setEditingPosition(pos)}
              onRemovePosition={handleRemovePosition}
              onAnalyzeWithAi={(ticker) => {
                setPendingAiAnalysis({ ticker, nonce: Date.now() });
                setIsAiDrawerOpen(true);
              }}
            />
          </>
        ) : activeTab === 'rebalance' ? (
          <RebalancePanel
            portfolioId={summary.portfolioId || 1}
            hideValues={hideValues}
            onNotify={pushToast}
          />
        ) : activeTab === 'dividends' ? (
          <DividendsPanel
            portfolioId={summary.portfolioId || 1}
            hideValues={hideValues}
            refreshSignal={refreshSignal}
            onNewDividend={() => {
              setModalDefaultType('DIVIDEND');
              setIsModalOpen(true);
            }}
            onNotify={pushToast}
          />
        ) : (
          <TransactionsHistoryPanel
            portfolioId={summary.portfolioId || 1}
            usdRate={summary.currentUsdBrlRate}
            hideValues={hideValues}
            refreshSignal={refreshSignal}
            onChanged={() => loadData(false, false)}
            onNotify={pushToast}
          />
        )}
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransaction}
        usdRate={summary?.currentUsdBrlRate}
        defaultType={modalDefaultType}
      />

      <EditPositionModal
        position={editingPosition}
        usdRate={summary?.currentUsdBrlRate}
        onClose={() => setEditingPosition(null)}
        onAddAporte={async (req) => {
          await createTransaction(req);
          await loadData(false, false);
          pushToast('success', `Novo aporte em ${req.ticker} registrado!`);
        }}
        onUpdatePosition={handleUpdatePosition}
      />

      <AiChatDrawer
        isOpen={isAiDrawerOpen}
        portfolioId={summary?.portfolioId || 1}
        hideValues={hideValues}
        pendingAnalysis={pendingAiAnalysis}
        onClose={() => setIsAiDrawerOpen(false)}
        onConsumePendingAnalysis={() => setPendingAiAnalysis(null)}
      />

      {/* Botão Flutuante Copiloto IA */}
      {!isAiDrawerOpen && (
        <button
          type="button"
          onClick={() => setIsAiDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-emerald-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-semibold text-xs shadow-xl shadow-emerald-950/60 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95"
          title="Abrir Copiloto Financeiro IA"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>Copiloto IA</span>
        </button>
      )}

      {/* Stack de Toasts de Feedback Visual */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-xs font-medium transition-all ${
                toast.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900/95 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
