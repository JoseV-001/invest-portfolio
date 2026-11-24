package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.PortfolioAllocation;
import com.invest.dto.*;
import com.invest.repository.PortfolioAllocationRepository;
import com.invest.repository.PortfolioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class AllocationService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioAllocationRepository allocationRepository;
    private final PortfolioService portfolioService;

    public AllocationService(PortfolioRepository portfolioRepository,
                             PortfolioAllocationRepository allocationRepository,
                             PortfolioService portfolioService) {
        this.portfolioRepository = portfolioRepository;
        this.allocationRepository = allocationRepository;
        this.portfolioService = portfolioService;
    }

    @Transactional(readOnly = true)
    public List<AllocationTargetDTO> getAllocations(Long portfolioId) {
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);
        return buildAllocationComparison(portfolioId, summary);
    }

    @Transactional
    public List<AllocationTargetDTO> updateAllocations(Long portfolioId, AllocationTargetsRequestDTO request) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new IllegalArgumentException("Portfolio não encontrado com id: " + portfolioId));

        Map<AssetClass, BigDecimal> normalized = new EnumMap<>(AssetClass.class);
        BigDecimal totalTarget = BigDecimal.ZERO;

        for (AllocationTargetsRequestDTO.TargetItem item : request.getTargets()) {
            if (normalized.containsKey(item.getAssetClass())) {
                throw new IllegalArgumentException("Classe duplicada na configuração de metas: " + item.getAssetClass());
            }
            BigDecimal pct = item.getTargetPercentage().setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
            if (pct.compareTo(BigDecimal.ZERO) < 0 || pct.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Cada meta deve estar entre 0% e 100%.");
            }
            normalized.put(item.getAssetClass(), pct);
            totalTarget = totalTarget.add(pct);
        }

        if (totalTarget.compareTo(new BigDecimal("100.00")) > 0) {
            throw new IllegalArgumentException("A soma das metas não pode ultrapassar 100% (atual: " + totalTarget + "%).");
        }

        allocationRepository.deleteByPortfolioId(portfolioId);
        allocationRepository.flush();

        List<PortfolioAllocation> entities = normalized.entrySet().stream()
                .filter(e -> e.getValue().compareTo(BigDecimal.ZERO) > 0)
                .map(e -> PortfolioAllocation.builder()
                        .portfolio(portfolio)
                        .assetClass(e.getKey())
                        .targetPercentage(e.getValue())
                        .build())
                .toList();

        allocationRepository.saveAll(entities);
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);
        return buildAllocationComparison(portfolioId, summary);
    }

    @Transactional(readOnly = true)
    public RebalanceSuggestionDTO suggestRebalance(Long portfolioId, BigDecimal contributionBrl) {
        if (contributionBrl == null || contributionBrl.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Informe um valor de aporte maior que zero.");
        }

        BigDecimal normalizedContribution = contributionBrl.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);
        List<AllocationTargetDTO> targets = buildAllocationComparison(portfolioId, summary);

        BigDecimal usdRate = summary.getCurrentUsdBrlRate() != null && summary.getCurrentUsdBrlRate().compareTo(BigDecimal.ZERO) > 0
                ? summary.getCurrentUsdBrlRate()
                : BigDecimal.valueOf(5.75);
        BigDecimal totalCurrent = summary.getTotalGrossEquityBrl() != null ? summary.getTotalGrossEquityBrl() : BigDecimal.ZERO;
        BigDecimal projectedTotal = totalCurrent.add(normalizedContribution);

        Map<AssetClass, BigDecimal> weights = new EnumMap<>(AssetClass.class);
        BigDecimal totalDeficit = BigDecimal.ZERO;
        BigDecimal totalTargetWeight = BigDecimal.ZERO;

        for (AllocationTargetDTO t : targets) {
            if (t.getTargetPercentage().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal idealValue = projectedTotal.multiply(t.getTargetPercentage())
                        .divide(BigDecimal.valueOf(100), FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);
                BigDecimal deficit = idealValue.subtract(t.getCurrentValueBrl()).max(BigDecimal.ZERO);
                weights.put(t.getAssetClass(), deficit);
                totalDeficit = totalDeficit.add(deficit);
                totalTargetWeight = totalTargetWeight.add(t.getTargetPercentage());
            }
        }

        boolean useTargetFallback = totalDeficit.compareTo(BigDecimal.ZERO) <= 0;
        BigDecimal denominator = useTargetFallback ? totalTargetWeight : totalDeficit;

        if (denominator.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Configure ao menos uma meta de alocação acima de 0% antes de simular o aporte.");
        }

        Map<AssetClass, BigDecimal> allocationsBrl = new EnumMap<>(AssetClass.class);
        BigDecimal allocatedSum = BigDecimal.ZERO;
        AssetClass largestClass = null;
        BigDecimal largestAmount = BigDecimal.valueOf(-1);

        for (AllocationTargetDTO t : targets) {
            if (t.getTargetPercentage().compareTo(BigDecimal.ZERO) <= 0) {
                allocationsBrl.put(t.getAssetClass(), BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
                continue;
            }
            BigDecimal weight = useTargetFallback ? t.getTargetPercentage() : weights.getOrDefault(t.getAssetClass(), BigDecimal.ZERO);
            BigDecimal amount = normalizedContribution.multiply(weight)
                    .divide(denominator, FinancialMathEngine.DISPLAY_SCALE, RoundingMode.DOWN);
            allocationsBrl.put(t.getAssetClass(), amount);
            allocatedSum = allocatedSum.add(amount);
            if (weight.compareTo(BigDecimal.ZERO) > 0 && amount.compareTo(largestAmount) > 0) {
                largestAmount = amount;
                largestClass = t.getAssetClass();
            }
        }

        BigDecimal remainder = normalizedContribution.subtract(allocatedSum);
        if (largestClass != null && remainder.compareTo(BigDecimal.ZERO) != 0) {
            allocationsBrl.put(largestClass, allocationsBrl.get(largestClass).add(remainder));
        }

        List<RebalanceSuggestionDTO.RebalanceItemDTO> items = new ArrayList<>();
        for (AllocationTargetDTO t : targets) {
            if (t.getTargetPercentage().compareTo(BigDecimal.ZERO) <= 0
                    && t.getCurrentValueBrl().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal suggestedBrl = allocationsBrl.getOrDefault(t.getAssetClass(), BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
            BigDecimal suggestedUsd = FinancialMathEngine.convertBrlToUsd(suggestedBrl, usdRate)
                    .setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);
            BigDecimal projectedValue = t.getCurrentValueBrl().add(suggestedBrl);
            BigDecimal projectedPct = FinancialMathEngine.calculatePercentageShare(projectedValue, projectedTotal);

            List<String> suggestedTickers = summary.getPositions().stream()
                    .filter(p -> p.getAssetClass() == t.getAssetClass())
                    .sorted(Comparator.comparing(AssetPositionDTO::getPortfolioSharePercent))
                    .limit(3)
                    .map(AssetPositionDTO::getTicker)
                    .toList();

            items.add(RebalanceSuggestionDTO.RebalanceItemDTO.builder()
                    .assetClass(t.getAssetClass())
                    .currentPercentage(t.getCurrentPercentage())
                    .targetPercentage(t.getTargetPercentage())
                    .currentValueBrl(t.getCurrentValueBrl())
                    .projectedValueBrl(projectedValue)
                    .projectedPercentage(projectedPct)
                    .suggestedAmountBrl(suggestedBrl)
                    .suggestedAmountUsd(suggestedUsd)
                    .suggestedTickers(suggestedTickers)
                    .build());
        }

        items.sort(Comparator.comparing(RebalanceSuggestionDTO.RebalanceItemDTO::getSuggestedAmountBrl).reversed());

        return RebalanceSuggestionDTO.builder()
                .contributionBrl(normalizedContribution)
                .usdBrlRate(usdRate)
                .totalCurrentEquityBrl(totalCurrent)
                .projectedTotalEquityBrl(projectedTotal)
                .items(items)
                .build();
    }

    private List<AllocationTargetDTO> buildAllocationComparison(Long portfolioId, PortfolioSummaryDTO summary) {
        Map<AssetClass, BigDecimal> savedTargets = new EnumMap<>(AssetClass.class);
        for (PortfolioAllocation alloc : allocationRepository.findByPortfolioIdOrderByAssetClassAsc(portfolioId)) {
            savedTargets.put(alloc.getAssetClass(), alloc.getTargetPercentage());
        }

        Map<AssetClass, BigDecimal> currentPctMap = summary.getAllocationByClassPercent() != null
                ? summary.getAllocationByClassPercent()
                : Collections.emptyMap();
        Map<AssetClass, BigDecimal> currentBrlMap = summary.getAllocationByClassBrl() != null
                ? summary.getAllocationByClassBrl()
                : Collections.emptyMap();

        List<AllocationTargetDTO> result = new ArrayList<>();
        for (AssetClass cls : AssetClass.values()) {
            BigDecimal target = savedTargets.getOrDefault(cls, BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
            BigDecimal currentPct = currentPctMap.getOrDefault(cls, BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
            BigDecimal currentBrl = currentBrlMap.getOrDefault(cls, BigDecimal.ZERO.setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP));
            BigDecimal deviation = currentPct.subtract(target).setScale(FinancialMathEngine.DISPLAY_SCALE, RoundingMode.HALF_UP);

            result.add(AllocationTargetDTO.builder()
                    .assetClass(cls)
                    .targetPercentage(target)
                    .currentPercentage(currentPct)
                    .currentValueBrl(currentBrl)
                    .deviationPercent(deviation)
                    .build());
        }
        return result;
    }
}
