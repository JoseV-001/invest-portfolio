package com.invest.provider.fallback;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.provider.QuoteProvider;
import com.invest.provider.QuoteResult;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Component
public class YahooFinanceFallbackAdapter implements QuoteProvider {

    private final RestClient restClient;

    public YahooFinanceFallbackAdapter(RestClient.Builder builder) {
        this.restClient = builder
                .baseUrl("https://query1.finance.yahoo.com/v8/finance/chart")
                .defaultHeader("User-Agent", "Mozilla/5.0")
                .build();
    }

    @Override
    public boolean supports(MarketType market) {
        return true; // Fallback universal para B3 e US
    }

    @Override
    public QuoteResult fetchQuote(Asset asset) {
        String queryTicker = asset.getMarket() == MarketType.B3 
                ? asset.getTicker() + ".SA" 
                : asset.getTicker();

        YahooChartResponse response = restClient.get()
                .uri("/{ticker}?interval=1d&range=1d", queryTicker)
                .retrieve()
                .body(YahooChartResponse.class);

        if (response != null && response.chart() != null && response.chart().result() != null && !response.chart().result().isEmpty()) {
            var meta = response.chart().result().get(0).meta();
            if (meta != null && meta.regularMarketPrice() != null) {
                return new QuoteResult(
                        asset.getTicker(),
                        meta.regularMarketPrice(),
                        asset.getCurrency().name(),
                        Instant.now(),
                        "YAHOO_FALLBACK"
                );
            }
        }
        throw new IllegalStateException("Falha no fallback Yahoo Finance para " + asset.getTicker());
    }

    @Override
    public int getPriority() {
        return 99; // Menor prioridade (fallback)
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record YahooChartResponse(Chart chart) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Chart(List<Result> result) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Result(Meta meta) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Meta(BigDecimal regularMarketPrice, String currency) {}
}
