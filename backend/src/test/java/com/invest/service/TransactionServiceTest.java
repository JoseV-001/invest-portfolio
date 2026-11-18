package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.Transaction;
import com.invest.dto.TransactionRequestDTO;
import com.invest.repository.AssetRepository;
import com.invest.repository.PortfolioRepository;
import com.invest.repository.TransactionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private AssetRepository assetRepository;

    @Mock
    private CurrencyService currencyService;

    @Mock
    private QuoteService quoteService;

    @InjectMocks
    private TransactionService transactionService;

    private Portfolio mockPortfolio() {
        return Portfolio.builder()
                .id(1L)
                .userId(UUID.randomUUID())
                .name("Carteira Principal")
                .baseCurrency(CurrencyType.BRL)
                .build();
    }

    @Test
    @DisplayName("Deve respeitar explicitamente o assetClass enviado no payload mesmo para ticker terminado em 11")
    void testExplicitAssetClassOverride() {
        when(portfolioRepository.findById(1L)).thenReturn(Optional.of(mockPortfolio()));
        when(assetRepository.findByTicker("CUSTOM11")).thenReturn(Optional.empty());
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction tx = inv.getArgument(0);
            tx.setId(99L);
            return tx;
        });

        TransactionRequestDTO req = new TransactionRequestDTO();
        req.setPortfolioId(1L);
        req.setTicker("CUSTOM11");
        req.setAssetClass(AssetClass.ETFS_BR);
        req.setMarket(MarketType.B3);
        req.setType(TransactionType.BUY);
        req.setQuantity(new BigDecimal("5"));
        req.setUnitPrice(new BigDecimal("110.00"));
        req.setCurrency(CurrencyType.BRL);
        req.setTransactionDate(Instant.now());
        req.setBroker("Banco Inter");

        transactionService.createTransaction(req);

        ArgumentCaptor<Asset> assetCaptor = ArgumentCaptor.forClass(Asset.class);
        verify(assetRepository).save(assetCaptor.capture());
        assertEquals(AssetClass.ETFS_BR, assetCaptor.getValue().getAssetClass());
        assertEquals(MarketType.B3, assetCaptor.getValue().getMarket());
    }

    @Test
    @DisplayName("Deve deduzir corretamente ETFs B3 (IVVB11, HASH11), Units (TAEE11, SANB11, KLBN11) e FIIs (HGLG11)")
    void testSmartHeuristicForB3TickersEndingIn11() {
        assertEquals(AssetClass.ETFS_BR,
                AssetClassifier.resolveAssetClass("IVVB11", CurrencyType.BRL, MarketType.B3, null));
        assertEquals(AssetClass.ETFS_BR,
                AssetClassifier.resolveAssetClass("HASH11", CurrencyType.BRL, MarketType.B3, null));
        assertEquals(AssetClass.STOCKS_BR,
                AssetClassifier.resolveAssetClass("TAEE11", CurrencyType.BRL, MarketType.B3, null));
        assertEquals(AssetClass.STOCKS_BR,
                AssetClassifier.resolveAssetClass("SANB11", CurrencyType.BRL, MarketType.B3, null));
        assertEquals(AssetClass.STOCKS_BR,
                AssetClassifier.resolveAssetClass("KLBN11", CurrencyType.BRL, MarketType.B3, null));
        assertEquals(AssetClass.FIIS,
                AssetClassifier.resolveAssetClass("HGLG11", CurrencyType.BRL, MarketType.B3, null));
    }
}
