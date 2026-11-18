package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class PortfolioSummaryDTO {
    private Long portfolioId;
    private String portfolioName;
    private BigDecimal currentUsdBrlRate;
    private Instant lastUpdatedAt;

    // Valores consolidados em Reais e equivalente em USD
    private BigDecimal totalInvestedBrl;
    private BigDecimal totalGrossEquityBrl;
    private BigDecimal totalGrossEquityUsd;
    private BigDecimal totalProfitLossBrl;
    private BigDecimal totalReturnPercent;

    // Subdivisões B3 vs Nomad
    private BigDecimal totalEquityB3Brl;
    private BigDecimal totalEquityNomadUsd;
    private BigDecimal totalEquityNomadBrl;

    // Posições detalhadas
    private List<AssetPositionDTO> positions;

    // Distribuição por classe de ativos (Asset Allocation em % e em R$)
    private Map<AssetClass, BigDecimal> allocationByClassPercent;
    private Map<AssetClass, BigDecimal> allocationByClassBrl;
}
