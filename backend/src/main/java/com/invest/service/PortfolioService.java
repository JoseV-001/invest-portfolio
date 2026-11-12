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
import com.invest.repository.PortfolioRepository;
import com.invest.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final QuoteService quoteService;
    private final CurrencyService currencyService;

    public PortfolioService(PortfolioRepository portfolioRepository,
                            TransactionRepository transactionRepository,
                            QuoteService quoteService,
                            CurrencyService currencyService) {
        this.portfolioRepository = portfolioRepository;
        this.transactionRepository = transactionRepository;
        this.quoteService = quoteService;
        this.currencyService = currencyService;
    }

    @Transactional
    public PortfolioSummaryDTO getPortfolioSummary(Long portfolioId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId));

        BigDecimal usdRate = currencyService.getUsdToBrlRate();
        List<Transaction> transactions = transactionRepository.findByPortfolioIdWithAssetAsc(portfolioId);

        // Agrupar transações por Ativo
        Map<Asset, List<Transaction>> txByAsset = transactions.stream()
                .collect(Collectors.groupingBy(Transaction::getAsset));

        List<AssetPositionDTO> positions = new ArrayList<>();
        BigDecimal totalInvestedBrl = BigDecimal.ZERO;
        BigDecimal totalGrossEquityBrl = BigDecimal.ZERO;
        BigDecimal totalEquityB3Brl = BigDecimal.ZERO;
        BigDecimal totalEquityNomadUsd = BigDecimal.ZERO;
        BigDecimal totalEquityNomadBrl = BigDecimal.ZERO;

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
                    }
                }
            }

            if (currentQty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal currentPrice = quoteService.getLatestPrice(asset);
                BigDecimal currentGrossValue = currentQty.multiply(currentPrice).setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_EVEN);

                BigDecimal investedBrl;
                BigDecimal grossBrl;

                if (asset.getCurrency() == CurrencyType.USD) {
                    investedBrl = totalCostLocal.multiply(usdRate).setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_EVEN);
                    grossBrl = currentGrossValue.multiply(usdRate).setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_EVEN);
                    totalEquityNomadUsd = totalEquityNomadUsd.add(currentGrossValue);
                    totalEquityNomadBrl = totalEquityNomadBrl.add(grossBrl);
                } else {
                    investedBrl = totalCostLocal;
                    grossBrl = currentGrossValue;
                    totalEquityB3Brl = totalEquityB3Brl.add(grossBrl);
                }

                BigDecimal profitLossBrl = grossBrl.subtract(investedBrl);
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
                        .quantity(currentQty)
                        .averagePrice(avgPrice)
                        .currentPrice(currentPrice)
                        .totalInvested(totalCostLocal)
                        .currentGrossValue(currentGrossValue)
                        .totalInvestedBrl(investedBrl)
                        .currentGrossValueBrl(grossBrl)
                        .profitLossBrl(profitLossBrl)
                        .returnRatePercent(returnRate)
                        .build());
            }
        }

        // Calcular percentual de participação de cada ativo e Asset Allocation
        final BigDecimal finalTotalGrossEquityBrl = totalGrossEquityBrl;
        Map<AssetClass, BigDecimal> allocationMap = new EnumMap<>(AssetClass.class);

        for (AssetPositionDTO pos : positions) {
            BigDecimal share = BigDecimal.ZERO;
            if (finalTotalGrossEquityBrl.compareTo(BigDecimal.ZERO) > 0) {
                share = pos.getCurrentGrossValueBrl()
                        .divide(finalTotalGrossEquityBrl, 4, RoundingMode.HALF_EVEN)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_EVEN);
            }
            pos.setPortfolioSharePercent(share);

            allocationMap.merge(pos.getAssetClass(), share, BigDecimal::add);
        }

        BigDecimal totalProfitLossBrl = totalGrossEquityBrl.subtract(totalInvestedBrl);
        BigDecimal totalReturnPercent = BigDecimal.ZERO;
        if (totalInvestedBrl.compareTo(BigDecimal.ZERO) > 0) {
            totalReturnPercent = totalProfitLossBrl
                    .divide(totalInvestedBrl, 4, RoundingMode.HALF_EVEN)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_EVEN);
        }

        return PortfolioSummaryDTO.builder()
                .portfolioId(portfolio.getId())
                .portfolioName(portfolio.getName())
                .currentUsdBrlRate(usdRate)
                .totalInvestedBrl(totalInvestedBrl.setScale(2, RoundingMode.HALF_EVEN))
                .totalGrossEquityBrl(totalGrossEquityBrl.setScale(2, RoundingMode.HALF_EVEN))
                .totalProfitLossBrl(totalProfitLossBrl.setScale(2, RoundingMode.HALF_EVEN))
                .totalReturnPercent(totalReturnPercent)
                .totalEquityB3Brl(totalEquityB3Brl.setScale(2, RoundingMode.HALF_EVEN))
                .totalEquityNomadUsd(totalEquityNomadUsd.setScale(2, RoundingMode.HALF_EVEN))
                .totalEquityNomadBrl(totalEquityNomadBrl.setScale(2, RoundingMode.HALF_EVEN))
                .positions(positions)
                .allocationByClassPercent(allocationMap)
                .build();
    }
}
