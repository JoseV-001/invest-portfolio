package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.Transaction;
import com.invest.dto.AssetPositionDTO;
import com.invest.dto.PortfolioSummaryDTO;
import com.invest.dto.PositionUpdateRequestDTO;
import com.invest.repository.AssetRepository;
import com.invest.repository.PortfolioRepository;
import com.invest.repository.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioService.class);

    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final AssetRepository assetRepository;
    private final QuoteService quoteService;
    private final CurrencyService currencyService;

    @Autowired
    public PortfolioService(PortfolioRepository portfolioRepository,
                            TransactionRepository transactionRepository,
                            AssetRepository assetRepository,
                            QuoteService quoteService,
                            CurrencyService currencyService) {
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
        this.assetRepository = assetRepository;
        this.quoteService = quoteService;
        this.currencyService = currencyService;
    }

    public PortfolioService(PortfolioRepository portfolioRepository,
                            TransactionRepository transactionRepository,
                            QuoteService quoteService,
                            CurrencyService currencyService) {
        this(portfolioRepository, transactionRepository, null, quoteService, currencyService);
    }

    public PortfolioSummaryDTO getPortfolioSummary(Long portfolioId) {
        return getPortfolioSummary(portfolioId, false);
    }

    public PortfolioSummaryDTO getPortfolioSummary(Long portfolioId, boolean refreshQuotes) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId));

        BigDecimal usdRate = resolveUsdRate(refreshQuotes);
        List<Transaction> transactions = transactionRepository.findByPortfolioIdWithAssetAsc(portfolioId);

        // Agrupar transações por Ativo preservando ordem determinística
        Map<Asset, List<Transaction>> txByAsset = transactions.stream()
                .collect(Collectors.groupingBy(Transaction::getAsset, LinkedHashMap::new, Collectors.toList()));

        List<AssetPositionDTO> positions = new ArrayList<>();
        BigDecimal totalInvestedBrl = BigDecimal.ZERO;
        BigDecimal totalGrossEquityBrl = BigDecimal.ZERO;
        BigDecimal totalEquityB3Brl = BigDecimal.ZERO;
        BigDecimal totalEquityNomadUsd = BigDecimal.ZERO;
        BigDecimal totalEquityNomadBrl = BigDecimal.ZERO;

        // Processamento sequencial resiliente (evita 429 na Brapi e não quebra resumo se 1 ativo falhar)
        for (Map.Entry<Asset, List<Transaction>> entry : txByAsset.entrySet()) {
            Asset asset = entry.getKey();
            List<Transaction> assetTxs = entry.getValue();

            BigDecimal currentQty = BigDecimal.ZERO;
            BigDecimal avgPrice = BigDecimal.ZERO;
            BigDecimal totalCostLocal = BigDecimal.ZERO;

            for (Transaction tx : assetTxs) {
                if (tx.getType() == TransactionType.BUY) {
                    avgPrice = FinancialMathEngine.calculateAveragePrice(
                            currentQty, avgPrice, tx.getQuantity(), tx.getUnitPrice());
                    currentQty = currentQty.add(tx.getQuantity());
                    totalCostLocal = totalCostLocal.add(tx.getTotalAmount());
                } else if (tx.getType() == TransactionType.SELL) {
                    currentQty = currentQty.subtract(tx.getQuantity());
                    if (currentQty.compareTo(BigDecimal.ZERO) <= 0) {
                        currentQty = BigDecimal.ZERO;
                        avgPrice = BigDecimal.ZERO;
                        totalCostLocal = BigDecimal.ZERO;
                    } else {
                        totalCostLocal = currentQty.multiply(avgPrice)
                                .setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
                    }
                }
            }

            if (currentQty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal currentPrice = resolveAssetPriceResiliently(asset, refreshQuotes, avgPrice);
                BigDecimal currentGrossValue = currentQty.multiply(currentPrice)
                        .setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);

                BigDecimal investedBrl;
                BigDecimal grossBrl;

                if (asset.getCurrency() == CurrencyType.USD) {
                    investedBrl = FinancialMathEngine.convertUsdToBrl(totalCostLocal, usdRate);
                    grossBrl = FinancialMathEngine.convertUsdToBrl(currentGrossValue, usdRate);
                    totalEquityNomadUsd = totalEquityNomadUsd.add(currentGrossValue);
                    totalEquityNomadBrl = totalEquityNomadBrl.add(grossBrl);
                } else {
                    investedBrl = totalCostLocal.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
                    grossBrl = currentGrossValue;
                    totalEquityB3Brl = totalEquityB3Brl.add(grossBrl);
                }

                BigDecimal profitLossBrl = grossBrl.subtract(investedBrl)
                        .setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
                BigDecimal returnRate = FinancialMathEngine.calculateReturnRate(currentPrice, avgPrice);

                totalInvestedBrl = totalInvestedBrl.add(investedBrl);
                totalGrossEquityBrl = totalGrossEquityBrl.add(grossBrl);

                positions.add(AssetPositionDTO.builder()
                        .assetId(asset.getId())
                        .ticker(asset.getTicker())
                        .name(asset.getName())
                        .assetClass(asset.getAssetClass())
                        .market(asset.getMarket())
                        .currency(asset.getCurrency())
                        .quantity(currentQty.setScale(FinancialMathEngine.QUANTITY_SCALE, RoundingMode.HALF_UP))
                        .averagePrice(avgPrice.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP))
                        .currentPrice(currentPrice.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP))
                        .totalInvested(totalCostLocal.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP))
                        .currentGrossValue(currentGrossValue)
                        .totalInvestedBrl(investedBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                        .currentGrossValueBrl(grossBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                        .profitLossBrl(profitLossBrl)
                        .returnRatePercent(returnRate)
                        .build());
            }
        }

        // Calcular percentual de participação de cada ativo e Asset Allocation
        Map<AssetClass, BigDecimal> allocationPercentMap = new EnumMap<>(AssetClass.class);
        Map<AssetClass, BigDecimal> allocationBrlMap = new EnumMap<>(AssetClass.class);

        for (AssetPositionDTO pos : positions) {
            BigDecimal share = FinancialMathEngine.calculatePercentageShare(
                    pos.getCurrentGrossValueBrl(), totalGrossEquityBrl);
            pos.setPortfolioSharePercent(share);

            allocationPercentMap.merge(pos.getAssetClass(), share,
                    (a, b) -> a.add(b).setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
            allocationBrlMap.merge(pos.getAssetClass(), pos.getCurrentGrossValueBrl(),
                    (a, b) -> a.add(b).setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
        }

        BigDecimal totalProfitLossBrl = totalGrossEquityBrl.subtract(totalInvestedBrl);
        BigDecimal totalReturnPercent = totalInvestedBrl.compareTo(BigDecimal.ZERO) > 0
                ? totalProfitLossBrl.multiply(BigDecimal.valueOf(100))
                        .divide(totalInvestedBrl, FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);

        BigDecimal totalGrossEquityUsd = FinancialMathEngine.convertBrlToUsd(totalGrossEquityBrl, usdRate)
                .setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);

        Instant lastUpdatedAt = refreshQuotes ? Instant.now() : quoteService.getLatestQuoteTimestamp();
        if (lastUpdatedAt == null) {
            lastUpdatedAt = Instant.now();
        }

        return PortfolioSummaryDTO.builder()
                .portfolioId(portfolio.getId())
                .portfolioName(portfolio.getName())
                .currentUsdBrlRate(usdRate)
                .lastUpdatedAt(lastUpdatedAt)
                .totalInvestedBrl(totalInvestedBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .totalGrossEquityBrl(totalGrossEquityBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .totalGrossEquityUsd(totalGrossEquityUsd)
                .totalProfitLossBrl(totalProfitLossBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .totalReturnPercent(totalReturnPercent)
                .totalEquityB3Brl(totalEquityB3Brl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .totalEquityNomadUsd(totalEquityNomadUsd.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .totalEquityNomadBrl(totalEquityNomadBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP))
                .positions(positions)
                .allocationByClassPercent(allocationPercentMap)
                .allocationByClassBrl(allocationBrlMap)
                .build();
    }

    private BigDecimal resolveUsdRate(boolean refreshQuotes) {
        if (refreshQuotes) {
            try {
                BigDecimal refreshed = currencyService.refreshUsdToBrlRate();
                if (refreshed != null && refreshed.compareTo(BigDecimal.ZERO) > 0) {
                    return refreshed;
                }
            } catch (Exception ex) {
                log.warn("Falha ao atualizar câmbio no refresh forçado: {}", ex.getMessage());
            }
        }
        BigDecimal rate = currencyService.getUsdToBrlRate();
        return (rate != null && rate.compareTo(BigDecimal.ZERO) > 0)
                ? rate
                : BigDecimal.valueOf(5.75).setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveAssetPriceResiliently(Asset asset, boolean refreshQuotes, BigDecimal fallbackAvgPrice) {
        try {
            BigDecimal price = refreshQuotes
                    ? quoteService.refreshAndCachePrice(asset)
                    : quoteService.getLatestPrice(asset);
            if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
                return price;
            }
        } catch (Exception ex) {
            log.warn("Falha isolada ao buscar preço para {}: {}. Mantendo preço de fallback.", asset.getTicker(), ex.getMessage());
            if (refreshQuotes) {
                try {
                    BigDecimal cached = quoteService.getLatestPrice(asset);
                    if (cached != null && cached.compareTo(BigDecimal.ZERO) > 0) {
                        return cached;
                    }
                } catch (Exception ignored) {
                    // fallback para preço médio abaixo
                }
            }
        }
        return fallbackAvgPrice != null ? fallbackAvgPrice : BigDecimal.ZERO;
    }

    @Transactional
    public void removePosition(Long portfolioId, Long assetId) {
        if (!portfolioRepository.existsById(portfolioId)) {
            throw new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId);
        }
        transactionRepository.deleteByPortfolioIdAndAssetId(portfolioId, assetId);
    }

    @Transactional
    public PortfolioSummaryDTO updatePosition(Long portfolioId, Long assetId, PositionUpdateRequestDTO request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId));
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("Ativo não encontrado com id: " + assetId));

        // Permitir atualização explícita de Classe, Mercado e Nome do ativo
        boolean assetUpdated = false;
        if (request.getAssetName() != null && !request.getAssetName().isBlank()) {
            asset.setName(request.getAssetName().trim());
            assetUpdated = true;
        }
        if (request.getMarket() != null && request.getMarket() != asset.getMarket()) {
            asset.setMarket(request.getMarket());
            CurrencyType newCurrency = request.getMarket() == MarketType.B3 ? CurrencyType.BRL : CurrencyType.USD;
            asset.setCurrency(newCurrency);
            asset.setIsFractional(request.getMarket() != MarketType.B3);
            assetUpdated = true;
        }
        if (request.getAssetClass() != null && request.getAssetClass() != asset.getAssetClass()) {
            asset.setAssetClass(request.getAssetClass());
            if (request.getAssetClass() == AssetClass.CRYPTO) {
                asset.setIsFractional(true);
            }
            assetUpdated = true;
        }
        if (assetUpdated) {
            assetRepository.save(asset);
        }

        List<Transaction> existing = transactionRepository
                .findByPortfolioIdAndAssetIdOrderByTransactionDateAsc(portfolioId, assetId);
        String defaultBroker = existing.isEmpty()
                ? (asset.getCurrency() == CurrencyType.USD ? "Nomad" : "Banco Inter")
                : existing.get(existing.size() - 1).getBroker();
        String broker = (request.getBroker() != null && !request.getBroker().isBlank())
                ? request.getBroker().trim()
                : defaultBroker;

        transactionRepository.deleteByPortfolioIdAndAssetId(portfolioId, assetId);
        transactionRepository.flush();

        BigDecimal totalAmount = FinancialMathEngine.calculateTotalAmount(
                request.getQuantity(), request.getAveragePrice(), BigDecimal.ZERO);
        BigDecimal exchangeRate = asset.getCurrency() == CurrencyType.USD
                ? resolveUsdRate(false)
                : BigDecimal.ONE.setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);

        Transaction consolidated = Transaction.builder()
                .portfolio(portfolio)
                .asset(asset)
                .type(TransactionType.BUY)
                .quantity(request.getQuantity().setScale(FinancialMathEngine.QUANTITY_SCALE, RoundingMode.HALF_UP))
                .unitPrice(request.getAveragePrice().setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP))
                .fees(BigDecimal.ZERO.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP))
                .totalAmount(totalAmount)
                .currency(asset.getCurrency())
                .exchangeRateOnDate(exchangeRate)
                .transactionDate(Instant.now())
                .broker(broker)
                .notes(request.getNotes() != null && !request.getNotes().isBlank()
                        ? request.getNotes().trim()
                        : "Posição atualizada manualmente")
                .build();

        transactionRepository.save(consolidated);
        return getPortfolioSummary(portfolioId, false);
    }
}
