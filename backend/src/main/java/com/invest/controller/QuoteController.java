package com.invest.controller;

import com.invest.domain.model.Asset;
import com.invest.repository.AssetRepository;
import com.invest.service.CurrencyService;
import com.invest.service.QuoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/quotes")
@CrossOrigin(origins = "*")
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
    public ResponseEntity<Map<String, Object>> getQuote(@PathVariable String ticker) {
        Asset asset = assetRepository.findByTicker(ticker.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Ativo não encontrado: " + ticker));

        BigDecimal price = quoteService.getLatestPrice(asset);
        return ResponseEntity.ok(Map.of(
                "ticker", asset.getTicker(),
                "price", price,
                "currency", asset.getCurrency()
        ));
    }

    @GetMapping("/fx/usd-brl")
    public ResponseEntity<Map<String, Object>> getUsdRate() {
        BigDecimal rate = currencyService.getUsdToBrlRate();
        return ResponseEntity.ok(Map.of(
                "pair", "USD-BRL",
                "rate", rate
        ));
    }
}
