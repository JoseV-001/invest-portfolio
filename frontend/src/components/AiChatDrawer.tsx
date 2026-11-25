'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  BrainCircuit,
  Building2,
  Loader2,
  MessageSquareText,
  Newspaper,
  Scale,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { AiAnalysisResponse, AiChatTurn } from '../types';
import { analyzeTickerWithAi, sendAiChat } from '../services/api';

export interface PendingTickerAnalysis {
  ticker: string;
  nonce: number;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  portfolioId: number;
  hideValues?: boolean;
  pendingAnalysis: PendingTickerAnalysis | null;
  onClose: () => void;
  onConsumePendingAnalysis: () => void;
}

interface DrawerEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  analysis?: AiAnalysisResponse;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  'Avaliar saúde e diversificação da minha carteira',
  'Como está minha exposição em Dólar (Nomad)?',
  'Quais ativos estão puxando minha rentabilidade?'
];

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={keyIdx++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/70 text-emerald-300 text-[11px] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  const isTableRow = (line: string) => line.trim().startsWith('|') && line.trim().includes('|');
  const isSeparatorRow = (line: string) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(line.trim());

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={blockKey++} className="border-slate-800 my-2.5" />);
      i++;
      continue;
    }

    // Markdown table
    if (isTableRow(trimmed) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const parseCells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseCells(lines[i]));
        i++;
      }

      blocks.push(
        <div
          key={blockKey++}
          className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80"
        >
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-2.5 py-2 font-semibold whitespace-nowrap">
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-900/50">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-slate-300 align-top">
                      {renderInlineMarkdown(r[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const cls =
        level === 1
          ? 'text-sm font-bold text-white mt-3 mb-1.5'
          : level === 2
          ? 'text-xs font-bold uppercase tracking-wider text-emerald-300 mt-3 mb-1'
          : 'text-xs font-semibold text-slate-200 mt-2.5 mb-1';
      blocks.push(
        <div key={blockKey++} className={cls}>
          {renderInlineMarkdown(text)}
        </div>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^([-*•])\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^([-*•])\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^([-*•])\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={blockKey++} className="my-1.5 space-y-1 pl-4 list-disc marker:text-emerald-400">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-200 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={blockKey++} className="my-1.5 space-y-1 pl-4 list-decimal marker:text-emerald-400">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-200 leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={blockKey++}
          className="my-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto"
        >
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !/^([-*•]|\d+\.)\s+/.test(lines[i].trim()) &&
      !isTableRow(lines[i].trim()) &&
      !lines[i].trim().startsWith('```') &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={blockKey++} className="text-xs text-slate-200 leading-relaxed my-1.5">
        {renderInlineMarkdown(paraLines.join(' '))}
      </p>
    );
  }

  return <div className="space-y-0.5">{blocks}</div>;
};

type AnalysisSectionKey = 'decision' | 'market' | 'sentiment' | 'news' | 'fundamentals' | 'debate';

const RATING_BADGE_STYLES: Record<string, string> = {
  BUY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  OVERWEIGHT: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  HOLD: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  UNDERWEIGHT: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  SELL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  REVIEW: 'bg-slate-700/50 text-slate-300 border-slate-600/60'
};

const MultiAgentAnalysisCard: React.FC<{ analysis: AiAnalysisResponse }> = ({ analysis }) => {
  const [activeSection, setActiveSection] = useState<AnalysisSectionKey>('decision');

  const ratingKey = (analysis.finalRating || 'REVIEW').toUpperCase();
  const badgeClass = RATING_BADGE_STYLES[ratingKey] || RATING_BADGE_STYLES.REVIEW;

  const debateCombined = [
    analysis.summary?.investmentPlan ? `### Plano do Research Manager\n${analysis.summary.investmentPlan}` : '',
    analysis.summary?.bullHistory ? `### Argumentos Bull\n${analysis.summary.bullHistory}` : '',
    analysis.summary?.bearHistory ? `### Argumentos Bear\n${analysis.summary.bearHistory}` : '',
    analysis.summary?.traderInvestmentPlan ? `### Proposta do Trader\n${analysis.summary.traderInvestmentPlan}` : '',
    analysis.summary?.riskHistory ? `### Debate de Risco\n${analysis.summary.riskHistory}` : ''
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');

  const tabs: { key: AnalysisSectionKey; label: string; icon: React.ElementType; content: string }[] = [
    {
      key: 'decision',
      label: 'Decisão PM',
      icon: Scale,
      content: analysis.finalTradeDecision || 'Decisão final indisponível.'
    },
    {
      key: 'market',
      label: 'Técnico',
      icon: Activity,
      content: analysis.summary?.marketReport || 'Relatório técnico não gerado.'
    },
    {
      key: 'fundamentals',
      label: 'Fundamentos',
      icon: Building2,
      content: analysis.summary?.fundamentalsReport || 'Relatório fundamentalista não gerado.'
    },
    {
      key: 'news',
      label: 'Notícias',
      icon: Newspaper,
      content: analysis.summary?.newsReport || 'Relatório de notícias não gerado.'
    },
    {
      key: 'sentiment',
      label: 'Sentimento',
      icon: MessageSquareText,
      content: analysis.summary?.sentimentReport || 'Relatório de sentimento não gerado.'
    },
    {
      key: 'debate',
      label: 'Debate & Risco',
      icon: ShieldAlert,
      content: debateCombined || 'Histórico de debate indisponível.'
    }
  ];

  const currentTab = tabs.find((t) => t.key === activeSection) || tabs[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{analysis.ticker}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {analysis.date}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Análise Multi-Agente • TradingAgents ({analysis.model || 'gemini-3.1-flash-lite'})
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${badgeClass}`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          {analysis.finalRating || 'REVIEW'}
        </span>
      </div>

      {/* Tabs de leitura */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = tab.key === activeSection;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-all ${
                isSelected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-3 max-h-96 overflow-y-auto">
        <MarkdownContent content={currentTab.content} />
      </div>
    </div>
  );
};

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  portfolioId,
  hideValues = false,
  pendingAnalysis,
  onClose,
  onConsumePendingAnalysis
}) => {
  const [entries, setEntries] = useState<DrawerEntry[]>([]);
  const [input, setInput] = useState('');
  const [loadingMode, setLoadingMode] = useState<'idle' | 'chat' | 'analyze'>('idle');
  const [analyzingTicker, setAnalyzingTicker] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, loadingMode]);

  const handleAnalyzeTicker = async (ticker: string) => {
    if (loadingMode !== 'idle') return;
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    const userMsg: DrawerEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: `Executar análise multi-agente completa para **${cleanTicker}** via TradingAgents.`
    };
    setEntries((prev) => [...prev, userMsg]);
    setLoadingMode('analyze');
    setAnalyzingTicker(cleanTicker);

    try {
      const analysis = await analyzeTickerWithAi(cleanTicker, { fast: true });
      const aiMsg: DrawerEntry = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: analysis.finalTradeDecision || '',
        model: analysis.model,
        analysis
      };
      setEntries((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: err?.message || `Não foi possível concluir a análise de ${cleanTicker}.`
        }
      ]);
    } finally {
      setLoadingMode('idle');
      setAnalyzingTicker(null);
    }
  };

  useEffect(() => {
    if (isOpen && pendingAnalysis && loadingMode === 'idle') {
      const targetTicker = pendingAnalysis.ticker;
      onConsumePendingAnalysis();
      void handleAnalyzeTicker(targetTicker);
    }
  }, [isOpen, pendingAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = async (textOverride?: string) => {
    const message = (textOverride ?? input).trim();
    if (!message || loadingMode !== 'idle') return;

    if (!textOverride) {
      setInput('');
    }

    const history: AiChatTurn[] = entries
      .filter((e) => !e.isError && e.content.trim().length > 0)
      .slice(-10)
      .map((e) => ({
        role: e.role,
        content: e.content
      }));

    const userMsg: DrawerEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message
    };

    setEntries((prev) => [...prev, userMsg]);
    setLoadingMode('chat');

    try {
      const res = await sendAiChat(portfolioId, message, history);
      setEntries((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          model: res.model
        }
      ]);
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: err?.message || 'Erro ao comunicar com o Copiloto IA.'
        }
      ]);
    } finally {
      setLoadingMode('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 w-full max-w-xl h-full bg-slate-950/95 border-l border-slate-800/90 shadow-2xl shadow-black flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900/80 to-emerald-950/25">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/35 text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Copiloto Financeiro IA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  TradingAgents
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gemini 3.1 Flash • Conectado à carteira real (B3 &amp; Nomad)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => setEntries([])}
                disabled={loadingMode !== 'idle'}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                title="Limpar conversa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Privacy Notice when hidden */}
        {hideValues && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-200/90 flex items-center justify-between">
            <span>Modo privacidade ativo no painel: a IA ainda lê sua carteira no servidor para responder.</span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {entries.length === 0 ? (
            <div className="space-y-5 pt-4">
              <div className="rounded-2xl bg-slate-900/75 border border-slate-800/90 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <Bot className="w-4 h-4" />
                  <span>Assessor &amp; Equipe Multi-Agente Prontos</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pergunte sobre concentração, exposição ao dólar, rentabilidade ou clique em{' '}
                  <strong className="text-white">Analisar com IA</strong> na tabela de ativos para
                  rodar a equipe completa de agentes (Técnico, Sentimento, Notícias, Fundamentos,
                  Debate Bull/Bear e Gestão de Risco).
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Perguntas Rápidas
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={loadingMode !== 'idle'}
                      onClick={() => void handleSendMessage(q)}
                      className="text-left px-3.5 py-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-200 transition-all flex items-center justify-between gap-2 group"
                    >
                      <span>{q}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Quick chips strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={loadingMode !== 'idle'}
                    onClick={() => void handleSendMessage(q)}
                    className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-300 whitespace-nowrap transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 border ${
                      entry.role === 'user'
                        ? 'max-w-[85%] bg-emerald-500/15 border-emerald-500/35 text-emerald-50'
                        : entry.isError
                        ? 'w-full bg-rose-500/10 border-rose-500/35 text-rose-200'
                        : 'w-full bg-slate-900/85 border-slate-800/90 text-slate-100'
                    }`}
                  >
                    {entry.analysis ? (
                      <MultiAgentAnalysisCard analysis={entry.analysis} />
                    ) : (
                      <MarkdownContent content={entry.content} />
                    )}
                    {entry.model && !entry.analysis && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800/70 text-[10px] text-slate-500 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        <span>{entry.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Loading Indicator */}
          {loadingMode !== 'idle' && (
            <div className="rounded-2xl bg-slate-900/85 border border-emerald-500/30 px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-300">
                  {loadingMode === 'analyze'
                    ? `Executando equipe TradingAgents para ${analyzingTicker}...`
                    : 'Copiloto IA pensando...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {loadingMode === 'analyze'
                    ? 'Rodando analistas Técnico, Sentimento, Notícias, Fundamentos e debate Bull/Bear/Risco.'
                    : 'Consultando posições consolidadas, rentabilidade e câmbio USD/BRL via Gemini Flash.'}
                </p>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage();
          }}
          className="p-4 border-t border-slate-800/80 bg-slate-950/90"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loadingMode !== 'idle'}
              placeholder="Pergunte sobre sua carteira ou peça uma análise..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500/70 focus:outline-none text-xs text-white placeholder-slate-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loadingMode !== 'idle'}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMode !== 'idle' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
