package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.Transaction;
import com.invest.dto.PortfolioSummaryDTO;
import com.invest.repository.PortfolioRepository;
import com.invest.repository.TransactionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private QuoteService quoteService;

    @Mock
    private CurrencyService currencyService;

    @InjectMocks
    private PortfolioService portfolioService;

    @Test
    @DisplayName("Deve consolidar portfolio com ativos B3 e Nomad e converter moedas")
    void testGetPortfolioSummary() {
        // Arrange
        Portfolio portfolio = Portfolio.builder()
                .id(1L)
                .name("Carteira Teste")
                .userId(UUID.randomUUID())
                .baseCurrency(CurrencyType.BRL)
                .build();

        Asset petr4 = Asset.builder()
                .id(10L)
                .ticker("PETR4")
                .name("Petrobras PN")
                .assetClass(AssetClass.STOCKS_BR)
                .market(MarketType.B3)
                .currency(CurrencyType.BRL)
                .build();

        Asset voo = Asset.builder()
                .id(20L)
                .ticker("VOO")
                .name("Vanguard S&P 500 ETF")
                .assetClass(AssetClass.ETFS_US)
                .market(MarketType.NYSE)
                .currency(CurrencyType.USD)
                .isFractional(true)
                .build();

        // Transação PETR4: 1 cota comprada a R$ 31.39
        Transaction tx1 = Transaction.builder()
                .id(100L)
                .portfolio(portfolio)
                .asset(petr4)
                .type(TransactionType.BUY)
                .quantity(new BigDecimal("1.00000000"))
                .unitPrice(new BigDecimal("31.3900"))
                .totalAmount(new BigDecimal("31.3900"))
                .currency(CurrencyType.BRL)
                .exchangeRateOnDate(BigDecimal.ONE)
                .transactionDate(Instant.now())
                .broker("Banco Inter")
                .build();

        // Transação VOO: 1 cota comprada a US$ 93.55
        Transaction tx2 = Transaction.builder()
                .id(101L)
                .portfolio(portfolio)
                .asset(voo)
                .type(TransactionType.BUY)
                .quantity(new BigDecimal("1.00000000"))
                .unitPrice(new BigDecimal("93.5500"))
                .totalAmount(new BigDecimal("93.5500"))
                .currency(CurrencyType.USD)
                .exchangeRateOnDate(new BigDecimal("5.750000"))
                .transactionDate(Instant.now())
                .broker("Nomad")
                .build();

        when(portfolioRepository.findById(1L)).thenReturn(Optional.of(portfolio));
        when(transactionRepository.findByPortfolioIdWithAssetAsc(1L)).thenReturn(List.of(tx1, tx2));
        when(currencyService.getUsdToBrlRate()).thenReturn(new BigDecimal("5.750000"));
        
        // Cotações atuais: PETR4 subiu para 50.71, VOO subiu para 105.51
        when(quoteService.getLatestPrice(petr4)).thenReturn(new BigDecimal("50.7100"));
        when(quoteService.getLatestPrice(voo)).thenReturn(new BigDecimal("105.5100"));

        // Act
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(1L);

        // Assert
        assertNotNull(summary);
        assertEquals(1L, summary.getPortfolioId());
        assertEquals(new BigDecimal("5.750000"), summary.getCurrentUsdBrlRate());

        // B3: 50.71 BRL
        assertEquals(new BigDecimal("50.71"), summary.getTotalEquityB3Brl());

        // Nomad: 105.51 USD -> em BRL: 105.51 * 5.75 = 606.6825 -> 606.68 BRL
        assertEquals(new BigDecimal("105.51"), summary.getTotalEquityNomadUsd());
        assertEquals(new BigDecimal("606.68"), summary.getTotalEquityNomadBrl());

        // Total Equity BRL = 50.71 + 606.68 = 657.39 BRL
        assertEquals(new BigDecimal("657.39"), summary.getTotalGrossEquityBrl());

        // Posições
        assertEquals(2, summary.getPositions().size());
        assertTrue(summary.getAllocationByClassPercent().containsKey(AssetClass.STOCKS_BR));
        assertTrue(summary.getAllocationByClassPercent().containsKey(AssetClass.ETFS_US));
    }
}
