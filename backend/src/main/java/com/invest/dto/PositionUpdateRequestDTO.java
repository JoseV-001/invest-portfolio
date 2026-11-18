package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.MarketType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PositionUpdateRequestDTO {

    @NotNull(message = "quantity é obrigatória")
    @DecimalMin(value = "0.00000001", message = "Quantidade mínima é 0.00000001")
    private BigDecimal quantity;

    @NotNull(message = "averagePrice é obrigatório")
    @DecimalMin(value = "0.0001", message = "Preço médio mínimo é 0.0001")
    private BigDecimal averagePrice;

    private String assetName;

    private AssetClass assetClass;

    private MarketType market;

    private String broker;

    private String notes;
}
