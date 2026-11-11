package com.invest.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FinancialMathEngineTest {

    @Test
    @DisplayName("Deve calcular Preço Médio ponderado com compras consecutivas")
    void testAveragePriceStandard() {
        // Compra 1: 10 cotas a R$ 10.00
        BigDecimal qty1 = new BigDecimal("10.00000000");
        BigDecimal price1 = new BigDecimal("10.0000");

        // Compra 2: 10 cotas a R$ 20.00
        BigDecimal qty2 = new BigDecimal("10.00000000");
        BigDecimal price2 = new BigDecimal("20.0000");

        BigDecimal avgPrice = FinancialMathEngine.calculateAveragePrice(qty1, price1, qty2, price2);

        // Esperado: (10*10 + 10*20) / 20 = 300 / 20 = 15.0000
        assertEquals(new BigDecimal("15.0000"), avgPrice);
    }

    @Test
    @DisplayName("Deve calcular Preço Médio com cotas fracionárias (Nomad)")
    void testAveragePriceFractional() {
        // Compra 1: 0.50000000 ações a $ 150.0000
        BigDecimal qty1 = new BigDecimal("0.50000000");
        BigDecimal price1 = new BigDecimal("150.0000");

        // Compra 2: 0.25000000 ações a $ 180.0000
        BigDecimal qty2 = new BigDecimal("0.25000000");
        BigDecimal price2 = new BigDecimal("180.0000");

        // Total = 0.5 * 150 (75) + 0.25 * 180 (45) = 120 / 0.75 = 160.0000
        BigDecimal avgPrice = FinancialMathEngine.calculateAveragePrice(qty1, price1, qty2, price2);

        assertEquals(new BigDecimal("160.0000"), avgPrice);
    }

    @Test
    @DisplayName("Deve calcular rentabilidade percentual corretamente")
    void testCalculateReturnRate() {
        BigDecimal avgPrice = new BigDecimal("100.0000");
        BigDecimal currentPrice = new BigDecimal("125.5000");

        BigDecimal returnRate = FinancialMathEngine.calculateReturnRate(currentPrice, avgPrice);

        assertEquals(new BigDecimal("25.50"), returnRate);
    }

    @Test
    @DisplayName("Deve converter valor USD para BRL na precisão monetária correta")
    void testConvertUsdToBrl() {
        BigDecimal amountUsd = new BigDecimal("100.0000");
        BigDecimal fxRate = new BigDecimal("5.750000");

        BigDecimal amountBrl = FinancialMathEngine.convertUsdToBrl(amountUsd, fxRate);

        assertEquals(new BigDecimal("575.0000"), amountBrl);
    }
}
