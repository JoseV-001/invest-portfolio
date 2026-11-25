package com.invest.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAnalysisSummaryDTO {
    @JsonAlias("market_report")
    private String marketReport;

    @JsonAlias("sentiment_report")
    private String sentimentReport;

    @JsonAlias("news_report")
    private String newsReport;

    @JsonAlias("fundamentals_report")
    private String fundamentalsReport;

    @JsonAlias("investment_plan")
    private String investmentPlan;

    @JsonAlias("trader_investment_plan")
    private String traderInvestmentPlan;

    @JsonAlias("bull_history")
    private String bullHistory;

    @JsonAlias("bear_history")
    private String bearHistory;

    @JsonAlias("risk_history")
    private String riskHistory;
}
