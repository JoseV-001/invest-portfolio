package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import com.invest.domain.model.Asset;
import com.invest.domain.model.Portfolio;
import com.invest.domain.model.Transaction;
import com.invest.dto.TransactionRequestDTO;
import com.invest.dto.TransactionResponseDTO;
import com.invest.repository.AssetRepository;
import com.invest.repository.PortfolioRepository;
import com.invest.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final PortfolioRepository portfolioRepository;
    private final AssetRepository assetRepository;
    private final CurrencyService currencyService;
    private final QuoteService quoteService;

    public TransactionService(TransactionRepository transactionRepository,
            PortfolioRepository portfolioRepository,
            AssetRepository assetRepository,
            CurrencyService currencyService,
            QuoteService quoteService) {
        this.transactionRepository = transactionRepository;
        this.portfolioRepository = portfolioRepository;
        this.assetRepository = assetRepository;
        this.currencyService = currencyService;
        this.quoteService = quoteService;
    }

    @Transactional
    public TransactionResponseDTO createTransaction(TransactionRequestDTO request) {
        Portfolio portfolio = portfolioRepository.findById(request.getPortfolioId())
                .orElseThrow(
                        () -> new IllegalArgumentException("Portfolio não encontrado: " + request.getPortfolioId()));

        String normalizedTicker = request.getTicker().trim().toUpperCase();
        Asset asset = assetRepository.findByTicker(normalizedTicker)
                .map(existing -> syncAssetMetadataIfRequested(existing, request))
                .orElseGet(() -> createAssetFromRequest(normalizedTicker, request));

        BigDecimal unitPrice = request.getUnitPrice();
        if (request.getType() == com.invest.domain.enums.TransactionType.SPLIT
                || request.getType() == com.invest.domain.enums.TransactionType.REVERSE_SPLIT) {
            unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        } else if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            unitPrice = quoteService.getLatestPrice(asset);
            if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Não foi possível obter a cotação atual para " + normalizedTicker
                        + ". Informe o preço unitário manualmente.");
            }
        }
        unitPrice = unitPrice.setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);

        BigDecimal normalizedQuantity = request.getQuantity()
                .setScale(FinancialMathEngine.QUANTITY_SCALE, RoundingMode.HALF_UP);
        BigDecimal normalizedFees = (request.getFees() != null ? request.getFees() : BigDecimal.ZERO)
                .setScale(FinancialMathEngine.MONEY_SCALE, RoundingMode.HALF_UP);

        BigDecimal totalAmount = FinancialMathEngine.calculateTotalAmount(
                normalizedQuantity, unitPrice, normalizedFees);

        CurrencyType resolvedCurrency = request.getCurrency() != null ? request.getCurrency() : asset.getCurrency();
        BigDecimal exchangeRate = request.getExchangeRate();
        if (exchangeRate == null || exchangeRate.compareTo(BigDecimal.ZERO) <= 0) {
            exchangeRate = resolvedCurrency == CurrencyType.USD
                    ? currencyService.getUsdToBrlRate()
                    : BigDecimal.ONE.setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);
        } else {
            exchangeRate = exchangeRate.setScale(FinancialMathEngine.FX_SCALE, RoundingMode.HALF_UP);
        }

        Transaction transaction = Transaction.builder()
                .portfolio(portfolio)
                .asset(asset)
                .type(request.getType())
                .quantity(normalizedQuantity)
                .unitPrice(unitPrice)
                .fees(normalizedFees)
                .totalAmount(totalAmount)
                .currency(resolvedCurrency)
                .exchangeRateOnDate(exchangeRate)
                .transactionDate(request.getTransactionDate())
                .broker(request.getBroker().trim())
                .notes(request.getNotes())
                .build();

        Transaction saved = transactionRepository.save(transaction);
        return mapToDTO(saved);
    }

    @Transactional
    public List<TransactionResponseDTO> createTransactionsBatch(List<TransactionRequestDTO> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Lista de transações vazia para importação.");
        }
        return requests.stream()
                .map(this::createTransaction)
                .toList();
    }

    private Asset syncAssetMetadataIfRequested(Asset existing, TransactionRequestDTO request) {
        boolean changed = false;
        if (request.getAssetClass() != null && request.getAssetClass() != existing.getAssetClass()) {
            existing.setAssetClass(request.getAssetClass());
            changed = true;
        }
        if (request.getMarket() != null && request.getMarket() != existing.getMarket()) {
            existing.setMarket(request.getMarket());
            changed = true;
        }
        if (request.getAssetName() != null && !request.getAssetName().isBlank()
                && existing.getName().equalsIgnoreCase(existing.getTicker())) {
            existing.setName(request.getAssetName().trim());
            changed = true;
        }
        return changed ? assetRepository.save(existing) : existing;
    }

    private Asset createAssetFromRequest(String ticker, TransactionRequestDTO request) {
        CurrencyType currency = AssetClassifier.resolveCurrency(
                ticker, request.getMarket(), request.getCurrency(), request.getAssetClass());
        AssetClass assetClass = AssetClassifier.resolveAssetClass(
                ticker, currency, request.getMarket(), request.getAssetClass());
        MarketType market = AssetClassifier.resolveMarket(
                ticker, currency, request.getMarket(), assetClass);

        String name = (request.getAssetName() != null && !request.getAssetName().isBlank())
                ? request.getAssetName().trim()
                : ticker;
        boolean isFractional = market != MarketType.B3 || assetClass == AssetClass.CRYPTO;

        Asset newAsset = Asset.builder()
                .ticker(ticker)
                .name(name)
                .assetClass(assetClass)
                .market(market)
                .currency(currency)
                .isFractional(isFractional)
                .active(true)
                .build();

        return assetRepository.save(newAsset);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        if (!transactionRepository.existsById(id)) {
            throw new IllegalArgumentException("Transação não encontrada: " + id);
        }
        transactionRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponseDTO> listTransactionsByPortfolio(Long portfolioId) {
        return transactionRepository.findByPortfolioIdOrderByTransactionDateDesc(portfolioId)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    private TransactionResponseDTO mapToDTO(Transaction t) {
        return TransactionResponseDTO.builder()
                .id(t.getId())
                .portfolioId(t.getPortfolio().getId())
                .ticker(t.getAsset().getTicker())
                .assetName(t.getAsset().getName())
                .type(t.getType())
                .quantity(t.getQuantity())
                .unitPrice(t.getUnitPrice())
                .fees(t.getFees())
                .totalAmount(t.getTotalAmount())
                .currency(t.getCurrency())
                .exchangeRateOnDate(t.getExchangeRateOnDate())
                .transactionDate(t.getTransactionDate())
                .broker(t.getBroker())
                .notes(t.getNotes())
                .build();
    }
}
