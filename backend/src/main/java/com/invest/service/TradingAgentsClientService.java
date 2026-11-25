package com.invest.service;

import com.invest.domain.enums.MarketType;
import com.invest.dto.*;
import com.invest.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class TradingAgentsClientService {

    private static final Logger log = LoggerFactory.getLogger(TradingAgentsClientService.class);
    private static final Pattern B3_TICKER_PATTERN = Pattern.compile("^[A-Z]{4}(3|4|5|6|11|34)$");

    private final RestClient restClient;
    private final PortfolioService portfolioService;
    private final AssetRepository assetRepository;

    @Autowired
    public TradingAgentsClientService(
            RestClient.Builder builder,
            PortfolioService portfolioService,
            AssetRepository assetRepository,
            @Value("${app.trading-agents.base-url:http://localhost:8000}") String baseUrl,
            @Value("${app.trading-agents.connect-timeout-seconds:10}") int connectTimeoutSeconds,
            @Value("${app.trading-agents.read-timeout-seconds:180}") int readTimeoutSeconds) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(Math.max(2, connectTimeoutSeconds)));
        requestFactory.setReadTimeout(Duration.ofSeconds(Math.max(15, readTimeoutSeconds)));

        this.restClient = builder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.portfolioService = portfolioService;
        this.assetRepository = assetRepository;
    }

    public AiChatResponseDTO chatWithCopilot(AiChatRequestDTO request) {
        Long portfolioId = request.getPortfolioId() != null ? request.getPortfolioId() : 1L;
        PortfolioSummaryDTO summary = portfolioService.getPortfolioSummary(portfolioId, false);

        Map<String, Object> portfolioContext = buildPortfolioContext(summary);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("message", request.getMessage());
        payload.put("history", request.getHistory() != null ? request.getHistory() : List.of());
        payload.put("portfolio_context", portfolioContext);

        try {
            AiChatResponseDTO response = restClient.post()
                    .uri("/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(AiChatResponseDTO.class);

            if (response == null || response.getReply() == null) {
                throw new IllegalStateException("Resposta vazia recebida do Copiloto TradingAgents.");
            }
            return response;
        } catch (HttpStatusCodeException ex) {
            log.warn("Erro HTTP {} ao consultar /api/chat do TradingAgents: {}", ex.getStatusCode().value(), ex.getResponseBodyAsString());
            throw new IllegalStateException("Falha ao consultar Copiloto IA (HTTP " + ex.getStatusCode().value() + ").", ex);
        } catch (ResourceAccessException ex) {
            log.warn("TradingAgents API inacessível em /api/chat: {}", ex.getMessage());
            throw new IllegalStateException("Serviço TradingAgents (porta 8000) está inacessível no momento.", ex);
        }
    }

    public AiAnalysisResponseDTO analyzeTicker(String rawTicker, AiAnalyzeRequestDTO request) {
        String normalizedTicker = normalizeTickerForTradingAgents(rawTicker);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ticker", normalizedTicker);
        if (request != null) {
            if (request.getDate() != null && !request.getDate().isBlank()) {
                payload.put("date", request.getDate().trim());
            }
            if (request.getAnalysts() != null && !request.getAnalysts().isEmpty()) {
                payload.put("analysts", request.getAnalysts());
            }
            if (request.getFast() != null) {
                payload.put("fast", request.getFast());
            }
        }

        try {
            AiAnalysisResponseDTO response = restClient.post()
                    .uri("/api/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(AiAnalysisResponseDTO.class);

            if (response == null) {
                throw new IllegalStateException("Resposta vazia recebida da análise multi-agente.");
            }
            return response;
        } catch (HttpStatusCodeException ex) {
            log.warn("Erro HTTP {} ao consultar /api/analyze do TradingAgents para {}: {}",
                    ex.getStatusCode().value(), normalizedTicker, ex.getResponseBodyAsString());
            throw new IllegalStateException("Falha na análise multi-agente para " + normalizedTicker + " (HTTP " + ex.getStatusCode().value() + ").", ex);
        } catch (ResourceAccessException ex) {
            log.warn("TradingAgents API inacessível em /api/analyze: {}", ex.getMessage());
            throw new IllegalStateException("Serviço TradingAgents (porta 8000) está inacessível ou excedeu o tempo limite.", ex);
        }
    }

    String normalizeTickerForTradingAgents(String rawTicker) {
        if (rawTicker == null || rawTicker.isBlank()) {
            throw new IllegalArgumentException("Ticker é obrigatório para análise.");
        }
        String clean = rawTicker.trim().toUpperCase();
        if (clean.contains(".") || clean.contains("-") || clean.startsWith("^")) {
            return clean;
        }
        boolean isB3InPortfolio = assetRepository.findByTicker(clean)
                .map(asset -> asset.getMarket() == MarketType.B3)
                .orElseGet(() -> B3_TICKER_PATTERN.matcher(clean).matches());

        return isB3InPortfolio ? clean + ".SA" : clean;
    }

    private Map<String, Object> buildPortfolioContext(PortfolioSummaryDTO summary) {
        BigDecimal totalGross = summary.getTotalGrossEquityBrl() != null ? summary.getTotalGrossEquityBrl() : BigDecimal.ZERO;
        BigDecimal b3Brl = summary.getTotalEquityB3Brl() != null ? summary.getTotalEquityB3Brl() : BigDecimal.ZERO;
        BigDecimal nomadBrl = summary.getTotalEquityNomadBrl() != null ? summary.getTotalEquityNomadBrl() : BigDecimal.ZERO;

        BigDecimal b3ExposurePct = totalGross.compareTo(BigDecimal.ZERO) > 0
                ? b3Brl.multiply(BigDecimal.valueOf(100)).divide(totalGross, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal usdExposurePct = totalGross.compareTo(BigDecimal.ZERO) > 0
                ? nomadBrl.multiply(BigDecimal.valueOf(100)).divide(totalGross, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> fxAndMarketSplit = new LinkedHashMap<>();
        fxAndMarketSplit.put("b3EquityBrl", b3Brl);
        fxAndMarketSplit.put("b3SharePercent", b3ExposurePct);
        fxAndMarketSplit.put("nomadEquityUsd", summary.getTotalEquityNomadUsd());
        fxAndMarketSplit.put("nomadEquityBrl", nomadBrl);
        fxAndMarketSplit.put("usdExchangeExposurePercent", usdExposurePct);

        Map<String, Object> context = new LinkedHashMap<>();
        context.put("portfolioId", summary.getPortfolioId());
        context.put("portfolioName", summary.getPortfolioName());
        context.put("usdBrlRate", summary.getCurrentUsdBrlRate());
        context.put("lastUpdatedAt", summary.getLastUpdatedAt());
        context.put("totalInvestedBrl", summary.getTotalInvestedBrl());
        context.put("totalGrossEquityBrl", totalGross);
        context.put("totalGrossEquityUsd", summary.getTotalGrossEquityUsd());
        context.put("totalProfitLossBrl", summary.getTotalProfitLossBrl());
        context.put("totalReturnPercent", summary.getTotalReturnPercent());
        context.put("marketAndCurrencyExposure", fxAndMarketSplit);
        context.put("allocationByClassPercent", summary.getAllocationByClassPercent());
        context.put("allocationByClassBrl", summary.getAllocationByClassBrl());
        context.put("positions", summary.getPositions());
        return context;
    }
}
