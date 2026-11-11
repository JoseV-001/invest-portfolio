package com.invest.provider.b3;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.provider.QuoteProvider;
import com.invest.provider.QuoteResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Component
public class BrapiQuoteAdapter implements QuoteProvider {

    private final RestClient restClient;
    private final String apiToken;

    public BrapiQuoteAdapter(
            RestClient.Builder builder,
            @Value("${app.providers.brapi.base-url:https://brapi.dev/api}") String baseUrl,
            @Value("${app.providers.brapi.token:}") String apiToken) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.apiToken = apiToken;
    }

    @Override
    public boolean supports(MarketType market) {
        return market == MarketType.B3;
    }

    @Override
    public QuoteResult fetchQuote(Asset asset) {
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
            return new QuoteResult(
                    asset.getTicker(),
                    item.regularMarketPrice(),
                    "BRL",
                    Instant.now(),
                    "BRAPI"
            );
        }
        throw new IllegalStateException("Cotação não encontrada na Brapi para " + asset.getTicker());
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
