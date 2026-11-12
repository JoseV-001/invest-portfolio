package com.invest.service;

import com.invest.domain.enums.CurrencyType;
import com.invest.domain.model.CurrencyExchangeRate;
import com.invest.provider.fx.AwesomeApiFxAdapter;
import com.invest.repository.CurrencyExchangeRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    @Transactional
    @Cacheable(value = "currency_rates", key = "'USD_BRL'")
    public BigDecimal getUsdToBrlRate() {
        try {
            BigDecimal currentRate = fxAdapter.fetchUsdToBrlRate();
            log.info("Câmbio USD/BRL atualizado via AwesomeAPI: {}", currentRate);

            // Persistir histórico cambial
            CurrencyExchangeRate fx = CurrencyExchangeRate.builder()
                    .fromCurrency(CurrencyType.USD)
                    .toCurrency(CurrencyType.BRL)
                    .rate(currentRate)
                    .source("AWESOMEAPI")
                    .timestamp(Instant.now())
                    .build();
            fxRepository.save(fx);

            return currentRate;
        } catch (Exception e) {
            log.warn("Erro ao buscar câmbio ao vivo: {}. Buscando último registro em banco...", e.getMessage());
            Optional<CurrencyExchangeRate> lastRate = fxRepository
                    .findFirstByFromCurrencyAndToCurrencyOrderByTimestampDesc(CurrencyType.USD, CurrencyType.BRL);
            return lastRate.map(CurrencyExchangeRate::getRate).orElse(BigDecimal.valueOf(5.750000));
        }
    }
}
