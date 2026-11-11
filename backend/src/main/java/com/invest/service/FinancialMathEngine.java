package com.invest.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class FinancialMathEngine {

    public static final int MONEY_SCALE = 4;
    public static final int QUANTITY_SCALE = 8;
    public static final int PERCENT_SCALE = 4;
    public static final int FX_SCALE = 6;

    private FinancialMathEngine() {}

    /**
     * Calcula o Preço Médio ponderado após uma nova compra:
     * PM_novo = (Qtd_antiga * PM_antigo + Qtd_nova * Preço_novo) / (Qtd_antiga + Qtd_nova)
     */
    public static BigDecimal calculateAveragePrice(
            BigDecimal currentQty, BigDecimal currentAvgPrice,
            BigDecimal incomingQty, BigDecimal incomingPrice) {

        if (currentQty == null || currentQty.compareTo(BigDecimal.ZERO) <= 0) {
            return incomingPrice.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
        }

        BigDecimal totalOld = currentQty.multiply(currentAvgPrice);
        BigDecimal totalNew = incomingQty.multiply(incomingPrice);
        BigDecimal newQty = currentQty.add(incomingQty);

        if (newQty.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
        }

        return totalOld.add(totalNew).divide(newQty, MONEY_SCALE, RoundingMode.HALF_EVEN);
    }

    /**
     * Converte o valor em USD para BRL usando a taxa de câmbio informada.
     */
    public static BigDecimal convertUsdToBrl(BigDecimal amountUsd, BigDecimal usdToBrlRate) {
        if (amountUsd == null || usdToBrlRate == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
        }
        return amountUsd.multiply(usdToBrlRate).setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
    }

    /**
     * Rentabilidade Percentual da Posição:
     * ((Preço_Atual - Preço_Médio) / Preço_Médio) * 100
     */
    public static BigDecimal calculateReturnRate(BigDecimal currentPrice, BigDecimal avgPrice) {
        if (avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) == 0 || currentPrice == null) {
            return BigDecimal.ZERO.setScale(PERCENT_SCALE, RoundingMode.HALF_EVEN);
        }
        return currentPrice.subtract(avgPrice)
                .divide(avgPrice, PERCENT_SCALE, RoundingMode.HALF_EVEN)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_EVEN);
    }

    /**
     * Calcula o total investido: (quantidade * preco) + taxas
     */
    public static BigDecimal calculateTotalAmount(BigDecimal quantity, BigDecimal unitPrice, BigDecimal fees) {
        BigDecimal base = quantity.multiply(unitPrice);
        if (fees != null) {
            base = base.add(fees);
        }
        return base.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
    }
}
