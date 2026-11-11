package com.invest.provider.fx;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Component
public class AwesomeApiFxAdapter {

    private final RestClient restClient;

    public AwesomeApiFxAdapter(
            RestClient.Builder builder,
            @Value("${app.providers.awesomeapi.base-url:https://economia.awesomeapi.com.br/last}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public BigDecimal fetchUsdToBrlRate() {
        AwesomeFxResponse response = restClient.get()
                .uri("/USD-BRL")
                .retrieve()
                .body(AwesomeFxResponse.class);

        if (response != null && response.usdBrl() != null && response.usdBrl().bid() != null) {
            return new BigDecimal(response.usdBrl().bid());
        }
        throw new IllegalStateException("Falha ao obter taxa USD/BRL via AwesomeAPI");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AwesomeFxResponse(@JsonProperty("USDBRL") CurrencyDetail usdBrl) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CurrencyDetail(String bid, String ask, String high, String low) {}
}
