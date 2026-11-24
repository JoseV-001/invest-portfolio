package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RebalanceSuggestionDTO {
    private BigDecimal contributionBrl;
    private BigDecimal usdBrlRate;
    private BigDecimal totalCurrentEquityBrl;
    private BigDecimal projectedTotalEquityBrl;
    private List<RebalanceItemDTO> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RebalanceItemDTO {
        private AssetClass assetClass;
        private BigDecimal currentPercentage;
        private BigDecimal targetPercentage;
        private BigDecimal currentValueBrl;
        private BigDecimal projectedValueBrl;
        private BigDecimal projectedPercentage;
        private BigDecimal suggestedAmountBrl;
        private BigDecimal suggestedAmountUsd;
        private List<String> suggestedTickers;
    }
}
