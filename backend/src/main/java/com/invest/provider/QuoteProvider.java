package com.invest.provider;

import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;

public interface QuoteProvider {
    boolean supports(MarketType market);
    QuoteResult fetchQuote(Asset asset);
    int getPriority();
}
