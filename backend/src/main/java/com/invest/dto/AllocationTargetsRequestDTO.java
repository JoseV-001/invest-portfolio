package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class AllocationTargetsRequestDTO {

    @Valid
    @NotNull(message = "A lista de metas é obrigatória")
    private List<TargetItem> targets;

    @Data
    public static class TargetItem {
        @NotNull(message = "Classe do ativo é obrigatória")
        private AssetClass assetClass;

        @NotNull(message = "Percentual meta é obrigatório")
        @DecimalMin(value = "0.00", message = "Meta mínima é 0%")
        @DecimalMax(value = "100.00", message = "Meta máxima é 100%")
        private BigDecimal targetPercentage;
    }
}
