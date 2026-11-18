package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.enums.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class TransactionRequestDTO {
    @NotNull(message = "portfolioId é obrigatório")
    private Long portfolioId;

    @NotBlank(message = "ticker é obrigatório")
    private String ticker;

    private String assetName;

    private AssetClass assetClass;

    private MarketType market;

    @NotNull(message = "type é obrigatório")
    private TransactionType type;

    @NotNull(message = "quantity é obrigatória")
    @DecimalMin(value = "0.00000001", message = "Quantidade mínima é 0.00000001")
    private BigDecimal quantity;

    @DecimalMin(value = "0.0001", message = "Preço unitário mínimo é 0.0001")
    private BigDecimal unitPrice;

    private BigDecimal fees = BigDecimal.ZERO;

    @NotNull(message = "currency é obrigatória")
    private CurrencyType currency;

    private BigDecimal exchangeRate;

    @NotNull(message = "transactionDate é obrigatória")
    private Instant transactionDate;

    @NotBlank(message = "broker é obrigatório")
    private String broker;

    private String notes;
}
