package com.invest.provider.us;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.provider.QuoteProvider;
import com.invest.provider.QuoteResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;

@Component
public class FinnhubQuoteAdapter implements QuoteProvider {

    private final RestClient restClient;
    private final String apiKey;

    public FinnhubQuoteAdapter(
            RestClient.Builder builder,
            @Value("${app.providers.finnhub.base-url:https://finnhub.io/api/v1}") String baseUrl,
            @Value("${app.providers.finnhub.token:}") String apiKey) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    @Override
    public boolean supports(MarketType market) {
        return market == MarketType.NYSE || market == MarketType.NASDAQ;
    }

    @Override
    public QuoteResult fetchQuote(Asset asset) {
        FinnhubQuoteResponse response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/quote")
                        .queryParam("symbol", asset.getTicker())
                        .queryParam("token", apiKey)
                        .build())
                .retrieve()
                .body(FinnhubQuoteResponse.class);

        if (response != null && response.currentPrice() != null && response.currentPrice().compareTo(BigDecimal.ZERO) > 0) {
            return new QuoteResult(
                    asset.getTicker(),
                    response.currentPrice(),
                    "USD",
                    Instant.now(),
                    "FINNHUB"
            );
        }
        throw new IllegalStateException("Cotação inválida retornada pelo Finnhub para " + asset.getTicker());
    }

    @Override
    public int getPriority() {
        return 1;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FinnhubQuoteResponse(
            @JsonProperty("c") BigDecimal currentPrice,
            @JsonProperty("d") BigDecimal change,
            @JsonProperty("dp") BigDecimal percentChange,
            @JsonProperty("h") BigDecimal highPriceOfDay,
            @JsonProperty("l") BigDecimal lowPriceOfDay,
            @JsonProperty("o") BigDecimal openPriceOfDay,
            @JsonProperty("pc") BigDecimal previousClosePrice
    ) {}
}
