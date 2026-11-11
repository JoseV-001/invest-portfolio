package com.invest.provider;

import java.math.BigDecimal;
import java.time.Instant;

public record QuoteResult(
        String ticker,
        BigDecimal price,
        String currency,
        Instant timestamp,
        String providerName
) {}
