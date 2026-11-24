package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DividendSummaryDTO {
    private BigDecimal totalReceivedBrl;
    private BigDecimal currentMonthBrl;
    private BigDecimal last12MonthsBrl;
    private BigDecimal monthlyAverageBrl;
    private BigDecimal portfolioYieldOnCostPercent;
    private List<MonthlyDividendDTO> monthlyHistory;
    private List<AssetDividendDTO> byAsset;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyDividendDTO {
        private String month;
        private String label;
        private BigDecimal totalBrl;
        private BigDecimal fromBrl;
        private BigDecimal fromUsdInBrl;
        private int paymentsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssetDividendDTO {
        private String ticker;
        private String assetName;
        private AssetClass assetClass;
        private CurrencyType currency;
        private BigDecimal totalReceivedNative;
        private BigDecimal totalReceivedBrl;
        private int paymentsCount;
        private BigDecimal yieldOnCostPercent;
        private Instant lastPaymentDate;
    }
}
