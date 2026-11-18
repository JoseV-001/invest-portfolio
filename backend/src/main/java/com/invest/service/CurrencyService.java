package com.invest.service;

import com.invest.domain.enums.CurrencyType;
import com.invest.domain.model.CurrencyExchangeRate;
import com.invest.provider.fx.AwesomeApiFxAdapter;
import com.invest.repository.CurrencyExchangeRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;

@Service
public class CurrencyService {

    private static final Logger log = LoggerFactory.getLogger(CurrencyService.class);

    private final AwesomeApiFxAdapter fxAdapter;
    private final CurrencyExchangeRateRepository fxRepository;

    public CurrencyService(AwesomeApiFxAdapter fxAdapter, CurrencyExchangeRateRepository fxRepository) {
        this.fxAdapter = fxAdapter;
        this.fxRepository = fxRepository;
    }

    @Cacheable(value = "currency_rates", key = "'USD_BRL'")
    public BigDecimal getUsdToBrlRate() {
        return fetchAndPersistUsdToBrlRate();
    }

    @CachePut(value = "currency_rates", key = "'USD_BRL'")
    public BigDecimal refreshUsdToBrlRate() {
        return fetchAndPersistUsdToBrlRate();
    }

    private BigDecimal fetchAndPersistUsdToBrlRate() {
        try {
            BigDecimal currentRate = fxAdapter.fetchUsdToBrlRate()
                    .setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);
            log.info("Câmbio USD/BRL atualizado via AwesomeAPI: {}", currentRate);

            saveRateSafely(currentRate);
            return currentRate;
        } catch (Exception e) {
            log.warn("Erro ao buscar câmbio ao vivo: {}. Buscando último registro em banco...", e.getMessage());
            try {
                Optional<CurrencyExchangeRate> lastRate = fxRepository
                        .findFirstByFromCurrencyAndToCurrencyOrderByTimestampDesc(CurrencyType.USD, CurrencyType.BRL);
                if (lastRate.isPresent()) {
                    return lastRate.get().getRate();
                }
            } catch (Exception dbEx) {
                log.error("Erro ao consultar câmbio em banco: {}", dbEx.getMessage());
            }
            return BigDecimal.valueOf(5.75).setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);
        }
    }

    private void saveRateSafely(BigDecimal currentRate) {
        try {
            CurrencyExchangeRate fx = CurrencyExchangeRate.builder()
                    .fromCurrency(CurrencyType.USD)
                    .toCurrency(CurrencyType.BRL)
                    .rate(currentRate)
                    .source("AWESOMEAPI")
                    .timestamp(Instant.now())
                    .build();
            fxRepository.save(fx);
        } catch (Exception ex) {
            log.warn("Não foi possível persistir histórico cambial: {}", ex.getMessage());
        }
    }
}
