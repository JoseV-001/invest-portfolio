package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AssetPositionDTO {
    private Long assetId;
    private String ticker;
    private String name;
    private AssetClass assetClass;
    private MarketType market;
    private CurrencyType currency;
    private BigDecimal quantity;
    private BigDecimal averagePrice;
    private BigDecimal currentPrice;
    private BigDecimal totalInvested;
    private BigDecimal currentGrossValue;
    private BigDecimal totalInvestedBrl;
    private BigDecimal currentGrossValueBrl;
    private BigDecimal profitLossBrl;
    private BigDecimal returnRatePercent;
    private BigDecimal portfolioSharePercent;
}
