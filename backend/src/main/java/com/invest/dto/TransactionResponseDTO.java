package com.invest.dto;

import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class TransactionResponseDTO {
    private Long id;
    private Long portfolioId;
    private String ticker;
    private String assetName;
    private TransactionType type;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal fees;
    private BigDecimal totalAmount;
    private CurrencyType currency;
    private BigDecimal exchangeRateOnDate;
    private Instant transactionDate;
    private String broker;
    private String notes;
}
