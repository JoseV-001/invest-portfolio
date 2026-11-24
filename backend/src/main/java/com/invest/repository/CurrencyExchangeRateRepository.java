package com.invest.repository;

import com.invest.domain.enums.CurrencyType;
import com.invest.domain.model.CurrencyExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CurrencyExchangeRateRepository extends JpaRepository<CurrencyExchangeRate, Long> {
    Optional<CurrencyExchangeRate> findFirstByFromCurrencyAndToCurrencyOrderByTimestampDesc(
            CurrencyType fromCurrency, CurrencyType toCurrency);

    List<CurrencyExchangeRate> findByFromCurrencyAndToCurrencyOrderByTimestampAsc(
            CurrencyType fromCurrency, CurrencyType toCurrency);
}
