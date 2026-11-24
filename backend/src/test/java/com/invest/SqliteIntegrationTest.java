package com.invest;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.TransactionType;
import com.invest.domain.model.Asset;
import com.invest.dto.*;
import com.invest.service.AllocationService;
import com.invest.service.AnalyticsService;
import com.invest.service.CurrencyService;
import com.invest.service.PortfolioService;
import com.invest.service.QuoteService;
import com.invest.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("sqlite")
class SqliteIntegrationTest {

    private static Path tempDbPath;

    @DynamicPropertySource
    static void registerSqliteProps(DynamicPropertyRegistry registry) throws IOException {
        tempDbPath = Files.createTempFile("invest-portfolio-test-", ".db");
        tempDbPath.toFile().deleteOnExit();
        registry.add("spring.datasource.url",
                () -> "jdbc:sqlite:" + tempDbPath.toAbsolutePath() + "?journal_mode=WAL&busy_timeout=5000&foreign_keys=on&date_string_format=yyyy-MM-dd HH:mm:ss");
    }

    @Autowired
    private PortfolioService portfolioService;

    @Autowired
    private AllocationService allocationService;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TransactionService transactionService;

    @MockBean
    private QuoteService quoteService;

    @MockBean
    private CurrencyService currencyService;

    @BeforeEach
    void setupMocks() {
        when(currencyService.getUsdToBrlRate()).thenReturn(new BigDecimal("5.750000"));
        when(quoteService.getLatestPrice(any(Asset.class))).thenReturn(new BigDecimal("50.0000"));
        when(quoteService.getLatestQuoteTimestamp()).thenReturn(Instant.now());
    }

    @Test
    @DisplayName("Deve migrar seed SQLite, consolidar 30 ativos, salvar metas, proventos e evolução")
    void testFullLifecycleOnSqlite() {
        // 1. Verificar resumo inicial dos 30 ativos seedados pelo Flyway no SQLite
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(1L, false);
        assertEquals(30, summary.getPositions().size());
        assertTrue(summary.getTotalInvestedBrl().compareTo(BigDecimal.ZERO) > 0);

        // 2. Configurar metas de alocação e simular rebalanceamento ("Onde Aportar")
        AllocationTargetsRequestDTO req = new AllocationTargetsRequestDTO();
        AllocationTargetsRequestDTO.TargetItem t1 = new AllocationTargetsRequestDTO.TargetItem();
        t1.setAssetClass(AssetClass.ETFS_US);
        t1.setTargetPercentage(new BigDecimal("50.00"));
        AllocationTargetsRequestDTO.TargetItem t2 = new AllocationTargetsRequestDTO.TargetItem();
        t2.setAssetClass(AssetClass.FIIS);
        t2.setTargetPercentage(new BigDecimal("25.00"));
        AllocationTargetsRequestDTO.TargetItem t3 = new AllocationTargetsRequestDTO.TargetItem();
        t3.setAssetClass(AssetClass.STOCKS_BR);
        t3.setTargetPercentage(new BigDecimal("25.00"));
        req.setTargets(List.of(t1, t2, t3));

        List<AllocationTargetDTO> targets = allocationService.updateAllocations(1L, req);
        assertFalse(targets.isEmpty());

        RebalanceSuggestionDTO suggestion = allocationService.suggestRebalance(1L, new BigDecimal("1000.00"));
        BigDecimal totalSuggested = suggestion.getItems().stream()
                .map(RebalanceSuggestionDTO.RebalanceItemDTO::getSuggestedAmountBrl)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("1000.00"), totalSuggested);

        // 3. Registrar provento (DIVIDEND) e consultar painel de proventos
        TransactionRequestDTO divReq = new TransactionRequestDTO();
        divReq.setPortfolioId(1L);
        divReq.setTicker("MXRF11");
        divReq.setType(TransactionType.DIVIDEND);
        divReq.setQuantity(BigDecimal.ONE);
        divReq.setUnitPrice(new BigDecimal("4.50"));
        divReq.setCurrency(CurrencyType.BRL);
        divReq.setTransactionDate(Instant.now());
        divReq.setBroker("Banco Inter");
        divReq.setNotes("Rendimento mensal FII");

        TransactionResponseDTO savedDiv = transactionService.createTransaction(divReq);
        assertNotNull(savedDiv.getId());

        DividendSummaryDTO divSummary = analyticsService.getDividendSummary(1L);
        assertEquals(new BigDecimal("4.50"), divSummary.getTotalReceivedBrl());
        assertEquals(1, divSummary.getByAsset().size());
        assertEquals("MXRF11", divSummary.getByAsset().get(0).getTicker());

        // 4. Consultar evolução patrimonial e exportação CSV
        List<PortfolioEvolutionPointDTO> evolution = analyticsService.getPortfolioEvolution(1L);
        assertFalse(evolution.isEmpty());

        String csv = analyticsService.exportPortfolioCsv(1L);
        assertTrue(csv.contains("MXRF11"));
        assertTrue(csv.contains("SCHD"));

        // 5. Importação em lote + listagem do extrato
        TransactionRequestDTO batchItem = new TransactionRequestDTO();
        batchItem.setPortfolioId(1L);
        batchItem.setTicker("TAEE4");
        batchItem.setType(TransactionType.BUY);
        batchItem.setQuantity(new BigDecimal("2"));
        batchItem.setUnitPrice(new BigDecimal("12.00"));
        batchItem.setCurrency(CurrencyType.BRL);
        batchItem.setTransactionDate(Instant.now());
        batchItem.setBroker("Banco Inter");
        batchItem.setNotes("Lote teste");

        List<TransactionResponseDTO> batchResult = transactionService.createTransactionsBatch(List.of(batchItem));
        assertEquals(1, batchResult.size());
        assertFalse(transactionService.listTransactionsByPortfolio(1L).isEmpty());

        // Limpar registros de teste
        transactionService.deleteTransaction(batchResult.get(0).getId());
        transactionService.deleteTransaction(savedDiv.getId());
    }
}
