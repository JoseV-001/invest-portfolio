package com.invest.dto;

import com.invest.domain.enums.AssetClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllocationTargetDTO {
    private AssetClass assetClass;
    private BigDecimal targetPercentage;
    private BigDecimal currentPercentage;
    private BigDecimal currentValueBrl;
    private BigDecimal deviationPercent;
}
