package com.invest.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class FinancialMathEngine {

    public static final int MONEY_SCALE = 4;
    public static final int DISPLAY_SCALE = 2;
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

        if (incomingPrice == null || incomingPrice.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        if (incomingQty == null || incomingQty.compareTo(BigDecimal.ZERO) <= 0) {
            return (currentAvgPrice != null ? currentAvgPrice : BigDecimal.ZERO)
                    .setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        if (currentQty == null || currentQty.compareTo(BigDecimal.ZERO) <= 0 || currentAvgPrice == null) {
            return incomingPrice.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }

        BigDecimal totalOld = currentQty.multiply(currentAvgPrice);
        BigDecimal totalNew = incomingQty.multiply(incomingPrice);
        BigDecimal newQty = currentQty.add(incomingQty);

        if (newQty.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }

        return totalOld.add(totalNew).divide(newQty, MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Converte o valor em USD para BRL usando a taxa de câmbio informada.
     */
    public static BigDecimal convertUsdToBrl(BigDecimal amountUsd, BigDecimal usdToBrlRate) {
        if (amountUsd == null || usdToBrlRate == null || usdToBrlRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        return amountUsd.multiply(usdToBrlRate).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Converte o valor em BRL para USD usando a taxa de câmbio informada com escala e RoundingMode.HALF_UP explícitos.
     */
    public static BigDecimal convertBrlToUsd(BigDecimal amountBrl, BigDecimal usdToBrlRate) {
        if (amountBrl == null || usdToBrlRate == null || usdToBrlRate.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        return amountBrl.divide(usdToBrlRate, MONEY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Rentabilidade Percentual da Posição:
     * ((Preço_Atual - Preço_Médio) / Preço_Médio) * 100
     */
    public static BigDecimal calculateReturnRate(BigDecimal currentPrice, BigDecimal avgPrice) {
        if (avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) <= 0 || currentPrice == null) {
            return BigDecimal.ZERO.setScale(DISPLAY_SCALE, RoundingMode.HALF_UP);
        }
        return currentPrice.subtract(avgPrice)
                .multiply(BigDecimal.valueOf(100))
                .divide(avgPrice, DISPLAY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Calcula participação percentual: (parte / total) * 100 com escala e RoundingMode.HALF_UP explícitos.
     */
    public static BigDecimal calculatePercentageShare(BigDecimal part, BigDecimal total) {
        if (part == null || total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(DISPLAY_SCALE, RoundingMode.HALF_UP);
        }
        return part.multiply(BigDecimal.valueOf(100))
                .divide(total, DISPLAY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Calcula quantidade fracionária a partir de valor financeiro: valor / preço_unitário (8 casas decimais).
     */
    public static BigDecimal calculateFractionalQuantity(BigDecimal amount, BigDecimal unitPrice) {
        if (amount == null || unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(QUANTITY_SCALE, RoundingMode.HALF_UP);
        }
        return amount.divide(unitPrice, QUANTITY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Calcula o total investido: (quantidade * preco) + taxas
     */
    public static BigDecimal calculateTotalAmount(BigDecimal quantity, BigDecimal unitPrice, BigDecimal fees) {
        if (quantity == null || unitPrice == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal base = quantity.multiply(unitPrice);
        if (fees != null) {
            base = base.add(fees);
        }
        return base.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
