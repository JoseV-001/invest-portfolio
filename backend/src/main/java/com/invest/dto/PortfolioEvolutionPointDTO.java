package com.invest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioEvolutionPointDTO {
    private String date;
    private String label;
    private BigDecimal investedBrl;
    private BigDecimal grossEquityBrl;
    private BigDecimal profitLossBrl;
    private BigDecimal returnPercent;
}
