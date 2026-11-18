package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.Transaction;
import com.invest.dto.PortfolioSummaryDTO;
import com.invest.dto.PositionUpdateRequestDTO;
import com.invest.repository.AssetRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AssetRepository assetRepository;

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

        // Total Equity BRL = 50.71 + 606.6825 = 657.3925 -> 657.39 BRL
        assertEquals(new BigDecimal("657.39"), summary.getTotalGrossEquityBrl());
        assertNotNull(summary.getTotalGrossEquityUsd());
        assertNotNull(summary.getAllocationByClassBrl());

        // Posições
        assertEquals(2, summary.getPositions().size());
        assertTrue(summary.getAllocationByClassPercent().containsKey(AssetClass.STOCKS_BR));
        assertTrue(summary.getAllocationByClassPercent().containsKey(AssetClass.ETFS_US));
    }

    @Test
    @DisplayName("Não deve quebrar consolidação quando refresh=true falha para um ativo específico")
    void testResilientRefreshWhenSingleAssetFails() {
        Portfolio portfolio = Portfolio.builder()
                .id(1L)
                .name("Carteira Resiliente")
                .userId(UUID.randomUUID())
                .baseCurrency(CurrencyType.BRL)
                .build();

        Asset itub4 = Asset.builder()
                .id(11L)
                .ticker("ITUB4")
                .name("Itaú Unibanco PN")
                .assetClass(AssetClass.STOCKS_BR)
                .market(MarketType.B3)
                .currency(CurrencyType.BRL)
                .build();

        Transaction tx = Transaction.builder()
                .id(200L)
                .portfolio(portfolio)
                .asset(itub4)
                .type(TransactionType.BUY)
                .quantity(new BigDecimal("10.00000000"))
                .unitPrice(new BigDecimal("30.0000"))
                .totalAmount(new BigDecimal("300.0000"))
                .currency(CurrencyType.BRL)
                .exchangeRateOnDate(BigDecimal.ONE)
                .transactionDate(Instant.now())
                .broker("Banco Inter")
                .build();

        when(portfolioRepository.findById(1L)).thenReturn(Optional.of(portfolio));
        when(transactionRepository.findByPortfolioIdWithAssetAsc(1L)).thenReturn(List.of(tx));
        when(currencyService.refreshUsdToBrlRate()).thenReturn(new BigDecimal("5.800000"));
        when(quoteService.refreshAndCachePrice(itub4)).thenThrow(new IllegalStateException("Brapi 429"));
        when(quoteService.getLatestPrice(itub4)).thenReturn(new BigDecimal("33.0000"));

        PortfolioSummaryDTO summary = assertDoesNotThrow(() -> portfolioService.getPortfolioSummary(1L, true));
        assertEquals(new BigDecimal("330.00"), summary.getTotalGrossEquityBrl());
    }

    @Test
    @DisplayName("Deve remover posição deletando todas as transações do ativo no portfolio")
    void testRemovePosition() {
        when(portfolioRepository.existsById(1L)).thenReturn(true);

        portfolioService.removePosition(1L, 10L);

        verify(transactionRepository).deleteByPortfolioIdAndAssetId(1L, 10L);
    }

    @Test
    @DisplayName("Deve atualizar posição consolidando quantidade e preço médio")
    void testUpdatePosition() {
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

        PositionUpdateRequestDTO req = new PositionUpdateRequestDTO();
        req.setQuantity(new BigDecimal("10"));
        req.setAveragePrice(new BigDecimal("35.00"));
        req.setBroker("Banco Inter");

        when(portfolioRepository.findById(1L)).thenReturn(Optional.of(portfolio));
        when(assetRepository.findById(10L)).thenReturn(Optional.of(petr4));
        when(transactionRepository.findByPortfolioIdAndAssetIdOrderByTransactionDateAsc(1L, 10L))
                .thenReturn(List.of());
        when(transactionRepository.findByPortfolioIdWithAssetAsc(1L)).thenReturn(List.of());
        when(currencyService.getUsdToBrlRate()).thenReturn(new BigDecimal("5.75"));

        PortfolioSummaryDTO result = portfolioService.updatePosition(1L, 10L, req);

        assertNotNull(result);
        verify(transactionRepository).deleteByPortfolioIdAndAssetId(1L, 10L);
        verify(transactionRepository).save(any(Transaction.class));
    }
}
