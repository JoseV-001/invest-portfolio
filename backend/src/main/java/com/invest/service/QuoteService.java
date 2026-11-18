package com.invest.service;

import com.invest.domain.model.Asset;
import com.invest.domain.model.QuoteHistory;
import com.invest.provider.QuoteProvider;
import com.invest.provider.QuoteResult;
import com.invest.repository.AssetRepository;
import com.invest.repository.QuoteHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);

    private final List<QuoteProvider> providers;
    private final AssetRepository assetRepository;
    private final QuoteHistoryRepository quoteHistoryRepository;
    private final ReentrantLock sequentialRefreshLock = new ReentrantLock(true);

    public QuoteService(List<QuoteProvider> providers,
                        AssetRepository assetRepository,
                        QuoteHistoryRepository quoteHistoryRepository) {
        this.providers = providers.stream()
                .sorted(Comparator.comparingInt(QuoteProvider::getPriority))
                .toList();
        this.assetRepository = assetRepository;
        this.quoteHistoryRepository = quoteHistoryRepository;
    }

    @Cacheable(value = "quotes", key = "#asset.ticker", unless = "#result == null || #result.compareTo(T(java.math.BigDecimal).ZERO) <= 0")
    public BigDecimal getLatestPrice(Asset asset) {
        return fetchFromProvidersWithFallback(asset);
    }

    @CachePut(value = "quotes", key = "#asset.ticker", unless = "#result == null || #result.compareTo(T(java.math.BigDecimal).ZERO) <= 0")
    public BigDecimal refreshAndCachePrice(Asset asset) {
        return fetchFromProvidersWithFallback(asset);
    }

    public Instant getLatestQuoteTimestamp() {
        try {
            return quoteHistoryRepository.findFirstByOrderByTimestampDesc()
                    .map(QuoteHistory::getTimestamp)
                    .orElse(Instant.now());
        } catch (Exception e) {
            return Instant.now();
        }
    }

    private BigDecimal fetchFromProvidersWithFallback(Asset asset) {
        for (QuoteProvider provider : providers) {
            if (provider.supports(asset.getMarket())) {
                try {
                    QuoteResult result = provider.fetchQuote(asset);
                    if (result != null && result.price() != null && result.price().compareTo(BigDecimal.ZERO) > 0) {
                        log.info("Cotação para {} obtida via {} -> {}", asset.getTicker(), result.providerName(), result.price());
                        saveQuoteHistorySafely(asset, result.price(), result.providerName());
                        return result.price();
                    }
                } catch (Exception ex) {
                    log.warn("Falha no provedor {} para {}: {}. Tentando próximo...",
                            provider.getClass().getSimpleName(), asset.getTicker(), ex.getMessage());
                }
            }
        }

        // Se todos os provedores falharem, buscar do último registro em banco de forma isolada
        if (asset.getId() != null) {
            try {
                Optional<QuoteHistory> lastKnown = quoteHistoryRepository.findFirstByAssetIdOrderByTimestampDesc(asset.getId());
                if (lastKnown.isPresent()) {
                    log.warn("Usando última cotação conhecida em banco para {}", asset.getTicker());
                    return lastKnown.get().getPrice();
                }
            } catch (Exception dbEx) {
                log.error("Erro ao consultar histórico local para {}: {}", asset.getTicker(), dbEx.getMessage());
            }
        }

        log.error("Sem cotação disponível para {}", asset.getTicker());
        return BigDecimal.ZERO;
    }

    private void saveQuoteHistorySafely(Asset asset, BigDecimal price, String source) {
        if (asset.getId() == null) {
            return;
        }
        try {
            QuoteHistory history = QuoteHistory.builder()
                    .asset(asset)
                    .price(price)
                    .currency(asset.getCurrency())
                    .source(source)
                    .timestamp(Instant.now())
                    .build();
            quoteHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("Erro ao salvar histórico de cotação para {}: {}", asset.getTicker(), e.getMessage());
        }
    }

    @Scheduled(cron = "0 0/15 10-18 * * MON-FRI", zone = "America/Sao_Paulo")
    public void scheduledQuotesUpdate() {
        if (!sequentialRefreshLock.tryLock()) {
            log.info("Atualização agendada ignorada pois já existe um refresh sequencial em andamento.");
            return;
        }
        try {
            log.info("Executando atualização agendada sequencial de cotações...");
            List<Asset> activeAssets = assetRepository.findAllByActiveTrue();
            int successCount = 0;
            for (Asset asset : activeAssets) {
                try {
                    BigDecimal updated = refreshAndCachePrice(asset);
                    if (updated != null && updated.compareTo(BigDecimal.ZERO) > 0) {
                        successCount++;
                    }
                } catch (Exception e) {
                    log.error("Erro isolado ao atualizar cotação agendada de {}: {}", asset.getTicker(), e.getMessage());
                }
            }
            log.info("Atualização agendada concluída: {}/{} ativos processados com sucesso.", successCount, activeAssets.size());
        } finally {
            sequentialRefreshLock.unlock();
        }
    }
}
