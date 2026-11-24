package com.invest.service;

import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.CurrencyExchangeRate;
import com.invest.domain.model.QuoteHistory;
import com.invest.domain.model.Transaction;
import com.invest.dto.AssetPositionDTO;
import com.invest.dto.DividendSummaryDTO;
import com.invest.dto.PortfolioEvolutionPointDTO;
import com.invest.dto.PortfolioSummaryDTO;
import com.invest.repository.CurrencyExchangeRateRepository;
import com.invest.repository.PortfolioRepository;
import com.invest.repository.QuoteHistoryRepository;
import com.invest.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AnalyticsService {

    private static final ZoneId BRT_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter MONTH_LABEL_FMT = DateTimeFormatter.ofPattern("MM/yyyy");
    private static final DateTimeFormatter DAY_LABEL_FMT = DateTimeFormatter.ofPattern("dd/MM");

    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final QuoteHistoryRepository quoteHistoryRepository;
    private final CurrencyExchangeRateRepository fxRepository;
    private final CurrencyService currencyService;
    private final PortfolioService portfolioService;

    public AnalyticsService(PortfolioRepository portfolioRepository,
                            TransactionRepository transactionRepository,
                            QuoteHistoryRepository quoteHistoryRepository,
                            CurrencyExchangeRateRepository fxRepository,
                            CurrencyService currencyService,
                            PortfolioService portfolioService) {
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
        this.quoteHistoryRepository = quoteHistoryRepository;
        this.fxRepository = fxRepository;
        this.currencyService = currencyService;
        this.portfolioService = portfolioService;
    }

    @Transactional(readOnly = true)
    public DividendSummaryDTO getDividendSummary(Long portfolioId) {
        if (!portfolioRepository.existsById(portfolioId)) {
            throw new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId);
        }

        List<Transaction> allTxs = transactionRepository.findByPortfolioIdWithAssetAsc(portfolioId);
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);
        BigDecimal fallbackUsdRate = summary.getCurrentUsdBrlRate() != null && summary.getCurrentUsdBrlRate().compareTo(BigDecimal.ZERO) > 0
                ? summary.getCurrentUsdBrlRate()
                : currencyService.getUsdToBrlRate();

        Map<String, BigDecimal> investedBrlByTicker = new HashMap<>();
        for (AssetPositionDTO pos : summary.getPositions()) {
            investedBrlByTicker.put(pos.getTicker(), pos.getTotalInvestedBrl());
        }

        YearMonth currentYm = YearMonth.now(BRT_ZONE);
        YearMonth twelveMonthsAgoYm = currentYm.minusMonths(11);

        BigDecimal totalReceivedBrl = BigDecimal.ZERO;
        BigDecimal currentMonthBrl = BigDecimal.ZERO;
        BigDecimal last12MonthsBrl = BigDecimal.ZERO;

        Map<YearMonth, MonthlyAccumulator> byMonth = new TreeMap<>();
        Map<String, AssetDividendAccumulator> byAsset = new LinkedHashMap<>();

        for (Transaction tx : allTxs) {
            if (!isIncomeType(tx.getType())) {
                continue;
            }
            BigDecimal nativeAmount = tx.getTotalAmount() != null ? tx.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal fxRate = tx.getCurrency() == CurrencyType.USD
                    ? (tx.getExchangeRateOnDate() != null && tx.getExchangeRateOnDate().compareTo(BigDecimal.ZERO) > 0
                            ? tx.getExchangeRateOnDate()
                            : fallbackUsdRate)
                    : BigDecimal.ONE;
            BigDecimal amountBrl = tx.getCurrency() == CurrencyType.USD
                    ? FinancialMathEngine.convertUsdToBrl(nativeAmount, fxRate)
                    : nativeAmount.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);

            totalReceivedBrl = totalReceivedBrl.add(amountBrl);

            YearMonth ym = YearMonth.from(tx.getTransactionDate().atZone(BRT_ZONE));
            if (ym.equals(currentYm)) {
                currentMonthBrl = currentMonthBrl.add(amountBrl);
            }
            if (!ym.isBefore(twelveMonthsAgoYm)) {
                last12MonthsBrl = last12MonthsBrl.add(amountBrl);
            }

            MonthlyAccumulator monthAcc = byMonth.computeIfAbsent(ym, k -> new MonthlyAccumulator());
            monthAcc.totalBrl = monthAcc.totalBrl.add(amountBrl);
            if (tx.getCurrency() == CurrencyType.USD) {
                monthAcc.fromUsdInBrl = monthAcc.fromUsdInBrl.add(amountBrl);
            } else {
                monthAcc.fromBrl = monthAcc.fromBrl.add(amountBrl);
            }
            monthAcc.count++;

            Asset asset = tx.getAsset();
            AssetDividendAccumulator assetAcc = byAsset.computeIfAbsent(asset.getTicker(), k -> new AssetDividendAccumulator(asset));
            assetAcc.totalNative = assetAcc.totalNative.add(nativeAmount);
            assetAcc.totalBrl = assetAcc.totalBrl.add(amountBrl);
            if (!ym.isBefore(twelveMonthsAgoYm)) {
                assetAcc.last12mBrl = assetAcc.last12mBrl.add(amountBrl);
            }
            assetAcc.count++;
            if (assetAcc.lastPaymentDate == null || tx.getTransactionDate().isAfter(assetAcc.lastPaymentDate)) {
                assetAcc.lastPaymentDate = tx.getTransactionDate();
            }
        }

        BigDecimal monthlyAverageBrl = byMonth.isEmpty()
                ? BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP)
                : totalReceivedBrl.divide(BigDecimal.valueOf(byMonth.size()), FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);

        BigDecimal totalInvested = summary.getTotalInvestedBrl() != null ? summary.getTotalInvestedBrl() : BigDecimal.ZERO;
        BigDecimal portfolioYoC = FinancialMathEngine.calculatePercentageShare(last12MonthsBrl, totalInvested);

        List<DividendSummaryDTO.MonthlyDividendDTO> monthlyHistory = byMonth.entrySet().stream()
                .map(entry -> DividendSummaryDTO.MonthlyDividendDTO.builder()
                        .month(entry.getKey().toString())
                        .label(entry.getKey().format(MONTH_LABEL_FMT))
                        .totalBrl(entry.getValue().totalBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                        .fromBrl(entry.getValue().fromBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                        .fromUsdInBrl(entry.getValue().fromUsdInBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                        .paymentsCount(entry.getValue().count)
                        .build())
                .toList();

        List<DividendSummaryDTO.AssetDividendDTO> assetList = byAsset.values().stream()
                .map(acc -> {
                    BigDecimal assetInvestedBrl = investedBrlByTicker.getOrDefault(acc.asset.getTicker(), BigDecimal.ZERO);
                    BigDecimal yoc = FinancialMathEngine.calculatePercentageShare(acc.last12mBrl, assetInvestedBrl);
                    return DividendSummaryDTO.AssetDividendDTO.builder()
                            .ticker(acc.asset.getTicker())
                            .assetName(acc.asset.getName())
                            .assetClass(acc.asset.getAssetClass())
                            .currency(acc.asset.getCurrency())
                            .totalReceivedNative(acc.totalNative.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                            .totalReceivedBrl(acc.totalBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                            .paymentsCount(acc.count)
                            .yieldOnCostPercent(yoc)
                            .lastPaymentDate(acc.lastPaymentDate)
                            .build();
                })
                .sorted(Comparator.comparing(DividendSummaryDTO.AssetDividendDTO::getTotalReceivedBrl).reversed())
                .toList();

        return DividendSummaryDTO.builder()
                .totalReceivedBrl(totalReceivedBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .currentMonthBrl(currentMonthBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .last12MonthsBrl(last12MonthsBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .monthlyAverageBrl(monthlyAverageBrl)
                .portfolioYieldOnCostPercent(portfolioYoC)
                .monthlyHistory(monthlyHistory)
                .byAsset(assetList)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PortfolioEvolutionPointDTO> getPortfolioEvolution(Long portfolioId) {
        if (!portfolioRepository.existsById(portfolioId)) {
            throw new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId);
        }

        List<Transaction> txs = transactionRepository.findByPortfolioIdWithAssetAsc(portfolioId);
        PortfolioSummaryDTO liveSummary = portfolioService.getPortfolioSummary(portfolioId, false);
        if (txs.isEmpty()) {
            return List.of();
        }

        List<QuoteHistory> quotes = quoteHistoryRepository.findAllWithAssetOrderByTimestampAsc();
        List<CurrencyExchangeRate> fxRates = fxRepository.findByFromCurrencyAndToCurrencyOrderByTimestampAsc(
                CurrencyType.USD, CurrencyType.BRL);

        LocalDate firstTxDate = txs.get(0).getTransactionDate().atZone(BRT_ZONE).toLocalDate();
        LocalDate today = LocalDate.now(BRT_ZONE);

        TreeSet<LocalDate> timeline = new TreeSet<>();
        for (Transaction tx : txs) {
            timeline.add(tx.getTransactionDate().atZone(BRT_ZONE).toLocalDate());
        }
        for (QuoteHistory q : quotes) {
            LocalDate qDate = q.getTimestamp().atZone(BRT_ZONE).toLocalDate();
            if (!qDate.isBefore(firstTxDate) && !qDate.isAfter(today)) {
                timeline.add(qDate);
            }
        }
        timeline.add(today);

        // Limita a série a no máximo 45 pontos mantendo início, marcos e fim
        List<LocalDate> orderedDates = new ArrayList<>(timeline);
        if (orderedDates.size() > 45) {
            List<LocalDate> sampled = new ArrayList<>();
            int step = Math.max(1, orderedDates.size() / 44);
            for (int i = 0; i < orderedDates.size() - 1; i += step) {
                sampled.add(orderedDates.get(i));
            }
            sampled.add(orderedDates.get(orderedDates.size() - 1));
            orderedDates = sampled;
        }

        int txIdx = 0;
        int qIdx = 0;
        int fxIdx = 0;

        Map<Long, PositionState> positions = new HashMap<>();
        Map<Long, BigDecimal> latestQuotes = new HashMap<>();
        BigDecimal latestFx = fxRates.isEmpty()
                ? (liveSummary.getCurrentUsdBrlRate() != null ? liveSummary.getCurrentUsdBrlRate() : BigDecimal.valueOf(5.75))
                : fxRates.get(0).getRate();

        List<PortfolioEvolutionPointDTO> points = new ArrayList<>();

        for (LocalDate date : orderedDates) {
            while (txIdx < txs.size() && !txs.get(txIdx).getTransactionDate().atZone(BRT_ZONE).toLocalDate().isAfter(date)) {
                Transaction tx = txs.get(txIdx++);
                PositionState state = positions.computeIfAbsent(tx.getAsset().getId(), k -> new PositionState(tx.getAsset()));
                applyTransaction(state, tx);
                if (tx.getUnitPrice() != null && tx.getUnitPrice().compareTo(BigDecimal.ZERO) > 0) {
                    latestQuotes.putIfAbsent(tx.getAsset().getId(), tx.getUnitPrice());
                }
            }
            while (qIdx < quotes.size() && !quotes.get(qIdx).getTimestamp().atZone(BRT_ZONE).toLocalDate().isAfter(date)) {
                QuoteHistory q = quotes.get(qIdx++);
                latestQuotes.put(q.getAsset().getId(), q.getPrice());
            }
            while (fxIdx < fxRates.size() && !fxRates.get(fxIdx).getTimestamp().atZone(BRT_ZONE).toLocalDate().isAfter(date)) {
                latestFx = fxRates.get(fxIdx++).getRate();
            }

            BigDecimal investedBrl;
            BigDecimal grossBrl;

            if (date.equals(today)) {
                investedBrl = liveSummary.getTotalInvestedBrl();
                grossBrl = liveSummary.getTotalGrossEquityBrl();
            } else {
                investedBrl = BigDecimal.ZERO;
                grossBrl = BigDecimal.ZERO;
                for (PositionState state : positions.values()) {
                    if (state.quantity.compareTo(BigDecimal.ZERO) <= 0) {
                        continue;
                    }
                    BigDecimal quote = latestQuotes.getOrDefault(state.asset.getId(), state.avgPrice);
                    BigDecimal grossLocal = state.quantity.multiply(quote);
                    if (state.asset.getCurrency() == CurrencyType.USD) {
                        investedBrl = investedBrl.add(FinancialMathEngine.convertUsdToBrl(state.totalCostLocal, latestFx));
                        grossBrl = grossBrl.add(FinancialMathEngine.convertUsdToBrl(grossLocal, latestFx));
                    } else {
                        investedBrl = investedBrl.add(state.totalCostLocal);
                        grossBrl = grossBrl.add(grossLocal);
                    }
                }
                investedBrl = investedBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
                grossBrl = grossBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
            }

            BigDecimal pnl = grossBrl.subtract(investedBrl).setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
            BigDecimal retPct = investedBrl.compareTo(BigDecimal.ZERO) > 0
                    ? pnl.multiply(BigDecimal.valueOf(100)).divide(investedBrl, FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);

            points.add(PortfolioEvolutionPointDTO.builder()
                    .date(date.toString())
                    .label(date.format(DAY_LABEL_FMT))
                    .investedBrl(investedBrl)
                    .grossEquityBrl(grossBrl)
                    .profitLossBrl(pnl)
                    .returnPercent(retPct)
                    .build());
        }

        return points;
    }

    @Transactional(readOnly = true)
    public String exportPortfolioCsv(Long portfolioId) {
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);
        StringBuilder sb = new StringBuilder();
        sb.append('\uFEFF');
        sb.append("Ticker;Nome;Classe;Mercado;Moeda;Quantidade;Preco_Medio_Orig;Custo_Total_BRL;Cotacao_Atual;Saldo_Atual_BRL;Lucro_Prejuizo_BRL;Rentabilidade_Pct;Peso_Carteira_Pct\n");

        for (AssetPositionDTO pos : summary.getPositions()) {
            sb.append(escapeCsv(pos.getTicker())).append(';')
              .append(escapeCsv(pos.getName())).append(';')
              .append(pos.getAssetClass()).append(';')
              .append(pos.getMarket()).append(';')
              .append(pos.getCurrency()).append(';')
              .append(pos.getQuantity().toPlainString()).append(';')
              .append(pos.getAveragePrice().toPlainString()).append(';')
              .append(pos.getTotalInvestedBrl().toPlainString()).append(';')
              .append(pos.getCurrentPrice().toPlainString()).append(';')
              .append(pos.getCurrentGrossValueBrl().toPlainString()).append(';')
              .append(pos.getProfitLossBrl().toPlainString()).append(';')
              .append(pos.getReturnRatePercent().toPlainString()).append(';')
              .append(pos.getPortfolioSharePercent().toPlainString())
              .append('\n');
        }
        return sb.toString();
    }

    private void applyTransaction(PositionState state, Transaction tx) {
        if (tx.getType() == TransactionType.BUY) {
            state.avgPrice = FinancialMathEngine.calculateAveragePrice(
                    state.quantity, state.avgPrice, tx.getQuantity(), tx.getUnitPrice());
            state.quantity = state.quantity.add(tx.getQuantity());
            state.totalCostLocal = state.totalCostLocal.add(tx.getTotalAmount());
        } else if (tx.getType() == TransactionType.SELL) {
            state.quantity = state.quantity.subtract(tx.getQuantity());
            if (state.quantity.compareTo(BigDecimal.ZERO) <= 0) {
                state.quantity = BigDecimal.ZERO;
                state.avgPrice = BigDecimal.ZERO;
                state.totalCostLocal = BigDecimal.ZERO;
            } else {
                state.totalCostLocal = state.quantity.multiply(state.avgPrice)
                        .setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
            }
        } else if (tx.getType() == TransactionType.SPLIT && tx.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            state.quantity = state.quantity.multiply(tx.getQuantity())
                    .setScale(FinancialMathEngine.QUANTITY_SCALE, RoundingMode.HALF_UP);
            if (state.quantity.compareTo(BigDecimal.ZERO) > 0) {
                state.avgPrice = state.totalCostLocal.divide(state.quantity, FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
            }
        } else if (tx.getType() == TransactionType.REVERSE_SPLIT && tx.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            state.quantity = state.quantity.divide(tx.getQuantity(), FinancialMathEngine.QUANTITY_SCALE, RoundingMode.HALF_UP);
            if (state.quantity.compareTo(BigDecimal.ZERO) > 0) {
                state.avgPrice = state.totalCostLocal.divide(state.quantity, FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
            }
        }
    }

    private boolean isIncomeType(TransactionType type) {
        return type == TransactionType.DIVIDEND
                || type == TransactionType.JCP
                || type == TransactionType.AMORTIZATION;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        String cleaned = value.replace("\"", "\"\"");
        return cleaned.contains(";") ? "\"" + cleaned + "\"" : cleaned;
    }

    private static class MonthlyAccumulator {
        BigDecimal totalBrl = BigDecimal.ZERO;
        BigDecimal fromBrl = BigDecimal.ZERO;
        BigDecimal fromUsdInBrl = BigDecimal.ZERO;
        int count = 0;
    }

    private static class AssetDividendAccumulator {
        final Asset asset;
        BigDecimal totalNative = BigDecimal.ZERO;
        BigDecimal totalBrl = BigDecimal.ZERO;
        BigDecimal last12mBrl = BigDecimal.ZERO;
        int count = 0;
        Instant lastPaymentDate;

        AssetDividendAccumulator(Asset asset) {
            this.asset = asset;
        }
    }

    private static class PositionState {
        final Asset asset;
        BigDecimal quantity = BigDecimal.ZERO;
        BigDecimal avgPrice = BigDecimal.ZERO;
        BigDecimal totalCostLocal = BigDecimal.ZERO;

        PositionState(Asset asset) {
            this.asset = asset;
        }
    }
}
