package com.invest.provider.b3;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.provider.QuoteProvider;
import com.invest.provider.QuoteResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Component
public class BrapiQuoteAdapter implements QuoteProvider {

    private static final Logger log = LoggerFactory.getLogger(BrapiQuoteAdapter.class);

    private final RestClient restClient;
    private final String apiToken;
    private final long minIntervalMs;
    private final ReentrantLock rateLimitLock = new ReentrantLock(true);
    private long lastRequestTimeMs = 0L;

    @Autowired
    public BrapiQuoteAdapter(
            RestClient.Builder builder,
            @Value("${app.providers.brapi.base-url:https://brapi.dev/api}") String baseUrl,
            @Value("${app.providers.brapi.token:}") String apiToken,
            @Value("${app.providers.brapi.min-interval-ms:400}") long minIntervalMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));

        this.restClient = builder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.apiToken = apiToken;
        this.minIntervalMs = Math.max(0L, minIntervalMs);
    }

    @Override
    public boolean supports(MarketType market) {
        return market == MarketType.B3;
    }

    @Override
    public QuoteResult fetchQuote(Asset asset) {
        rateLimitLock.lock();
        try {
            throttleIfNeeded();
            return executeQuoteRequest(asset);
        } catch (HttpStatusCodeException ex) {
            if (ex.getStatusCode().value() == 429) {
                log.warn("Rate limit (429) atingido na Brapi para {}. Aplicando backoff curto antes de acionar fallback.", asset.getTicker());
                sleepQuietly(Math.max(600L, minIntervalMs * 2));
                throw new IllegalStateException("Brapi rate limit (429) para " + asset.getTicker(), ex);
            }
            throw new IllegalStateException("Erro HTTP " + ex.getStatusCode().value() + " na Brapi para " + asset.getTicker(), ex);
        } finally {
            lastRequestTimeMs = System.currentTimeMillis();
            rateLimitLock.unlock();
        }
    }

    private QuoteResult executeQuoteRequest(Asset asset) {
        BrapiResponse response = restClient.get()
                .uri(uriBuilder -> {
                    var b = uriBuilder.path("/quote/{ticker}");
                    if (apiToken != null && !apiToken.isBlank()) {
                        b.queryParam("token", apiToken);
                    }
                    return b.build(asset.getTicker());
                })
                .retrieve()
                .body(BrapiResponse.class);

        if (response != null && response.results() != null && !response.results().isEmpty()) {
            BrapiItem item = response.results().get(0);
            if (item.regularMarketPrice() != null && item.regularMarketPrice().compareTo(BigDecimal.ZERO) > 0) {
                return new QuoteResult(
                        asset.getTicker(),
                        item.regularMarketPrice(),
                        "BRL",
                        Instant.now(),
                        "BRAPI"
                );
            }
        }
        throw new IllegalStateException("Cotação não encontrada na Brapi para " + asset.getTicker());
    }

    private void throttleIfNeeded() {
        if (minIntervalMs <= 0 || lastRequestTimeMs == 0L) {
            return;
        }
        long elapsed = System.currentTimeMillis() - lastRequestTimeMs;
        long waitMs = minIntervalMs - elapsed;
        if (waitMs > 0) {
            sleepQuietly(waitMs);
        }
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public int getPriority() {
        return 1;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiResponse(List<BrapiItem> results) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrapiItem(String symbol, BigDecimal regularMarketPrice) {}
}
