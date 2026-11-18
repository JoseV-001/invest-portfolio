package com.invest.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

class FinancialMathEngineTest {

    @Test
    @DisplayName("Deve calcular Preço Médio ponderado com compras consecutivas")
    void testAveragePriceStandard() {
        BigDecimal qty1 = new BigDecimal("10.00000000");
        BigDecimal price1 = new BigDecimal("10.0000");

        BigDecimal qty2 = new BigDecimal("10.00000000");
        BigDecimal price2 = new BigDecimal("20.0000");

        BigDecimal avgPrice = FinancialMathEngine.calculateAveragePrice(qty1, price1, qty2, price2);

        assertEquals(new BigDecimal("15.0000"), avgPrice);
    }

    @Test
    @DisplayName("Deve calcular Preço Médio com cotas fracionárias (Nomad)")
    void testAveragePriceFractional() {
        BigDecimal qty1 = new BigDecimal("0.50000000");
        BigDecimal price1 = new BigDecimal("150.0000");

        BigDecimal qty2 = new BigDecimal("0.25000000");
        BigDecimal price2 = new BigDecimal("180.0000");

        BigDecimal avgPrice = FinancialMathEngine.calculateAveragePrice(qty1, price1, qty2, price2);

        assertEquals(new BigDecimal("160.0000"), avgPrice);
    }

    @Test
    @DisplayName("Deve lidar com dízimas periódicas em cotas fracionárias sem ArithmeticException usando HALF_UP")
    void testNonTerminatingDecimalsPrecision() {
        // 0.1 + 0.2 = 0.3 cotas -> (0.1*100 + 0.2*105) / 0.3 = 31 / 0.3 = 103.333333...
        BigDecimal qty1 = new BigDecimal("0.10000000");
        BigDecimal price1 = new BigDecimal("100.0000");
        BigDecimal qty2 = new BigDecimal("0.20000000");
        BigDecimal price2 = new BigDecimal("105.0000");

        BigDecimal avgPrice = assertDoesNotThrow(() ->
                FinancialMathEngine.calculateAveragePrice(qty1, price1, qty2, price2));
        assertEquals(new BigDecimal("103.3333"), avgPrice);

        // Rentabilidade 2/3 -> 66.6666... -> 66.67 (HALF_UP)
        BigDecimal returnRate = assertDoesNotThrow(() ->
                FinancialMathEngine.calculateReturnRate(new BigDecimal("5.0000"), new BigDecimal("3.0000")));
        assertEquals(new BigDecimal("66.67"), returnRate);

        // Conversão BRL -> USD com dízima periódica: 100 / 5.73 = 17.45200698... -> 17.4520
        BigDecimal usdEquivalent = assertDoesNotThrow(() ->
                FinancialMathEngine.convertBrlToUsd(new BigDecimal("100.0000"), new BigDecimal("5.730000")));
        assertEquals(new BigDecimal("17.4520"), usdEquivalent);

        // Cálculo de quantidade fracionária: US$ 100 / US$ 3 = 33.33333333 cotas
        BigDecimal fractionalQty = assertDoesNotThrow(() ->
                FinancialMathEngine.calculateFractionalQuantity(new BigDecimal("100.00"), new BigDecimal("3.00")));
        assertEquals(new BigDecimal("33.33333333"), fractionalQty);
    }

    @Test
    @DisplayName("Deve aplicar RoundingMode.HALF_UP em fronteiras decimais (.5)")
    void testHalfUpRoundingBoundary() {
        // (1 * 10.0000 + 1 * 10.0001) / 2 = 10.00005 -> HALF_UP = 10.0001 (HALF_EVEN seria 10.0000)
        BigDecimal avgPrice = FinancialMathEngine.calculateAveragePrice(
                new BigDecimal("1"), new BigDecimal("10.0000"),
                new BigDecimal("1"), new BigDecimal("10.0001")
        );
        assertEquals(new BigDecimal("10.0001"), avgPrice);
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
