package com.invest.controller;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.repository.AssetRepository;
import com.invest.service.AssetClassifier;
import com.invest.service.CurrencyService;
import com.invest.service.QuoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/quotes")
public class QuoteController {

    private final QuoteService quoteService;
    private final CurrencyService currencyService;
    private final AssetRepository assetRepository;

    public QuoteController(QuoteService quoteService,
                           CurrencyService currencyService,
                           AssetRepository assetRepository) {
        this.quoteService = quoteService;
        this.currencyService = currencyService;
        this.assetRepository = assetRepository;
    }

    @GetMapping("/{ticker}")
    public ResponseEntity<Map<String, Object>> getQuote(
            @PathVariable String ticker,
            @RequestParam(required = false) MarketType market,
            @RequestParam(required = false) CurrencyType currency,
            @RequestParam(required = false) AssetClass assetClass,
            @RequestParam(defaultValue = "false") boolean refresh) {
        String normalizedTicker = ticker.trim().toUpperCase();
        Asset asset = assetRepository.findByTicker(normalizedTicker)
                .orElseGet(() -> {
                    CurrencyType resolvedCurrency = AssetClassifier.resolveCurrency(
                            normalizedTicker, market, currency, assetClass);
                    AssetClass resolvedClass = AssetClassifier.resolveAssetClass(
                            normalizedTicker, resolvedCurrency, market, assetClass);
                    MarketType resolvedMarket = AssetClassifier.resolveMarket(
                            normalizedTicker, resolvedCurrency, market, resolvedClass);
                    return Asset.builder()
                            .ticker(normalizedTicker)
                            .name(normalizedTicker)
                            .market(resolvedMarket)
                            .currency(resolvedCurrency)
                            .assetClass(resolvedClass)
                            .build();
                });

        BigDecimal price = refresh ? quoteService.refreshAndCachePrice(asset) : quoteService.getLatestPrice(asset);
        return ResponseEntity.ok(Map.of(
                "ticker", asset.getTicker(),
                "name", asset.getName(),
                "price", price,
                "currency", asset.getCurrency(),
                "market", asset.getMarket(),
                "assetClass", asset.getAssetClass(),
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/fx/usd-brl")
    public ResponseEntity<Map<String, Object>> getUsdRate(
            @RequestParam(defaultValue = "false") boolean refresh) {
        BigDecimal rate = refresh ? currencyService.refreshUsdToBrlRate() : currencyService.getUsdToBrlRate();
        return ResponseEntity.ok(Map.of(
                "pair", "USD-BRL",
                "rate", rate,
                "timestamp", Instant.now().toString()
        ));
    }
}
