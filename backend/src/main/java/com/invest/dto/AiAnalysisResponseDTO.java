package com.invest.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAnalysisResponseDTO {
    private String ticker;
    private String date;
    private List<String> analysts;
    private String model;

    @JsonAlias("final_rating")
    private String finalRating;

    @JsonAlias("final_trade_decision")
    private String finalTradeDecision;

    private AiAnalysisSummaryDTO summary;
}
