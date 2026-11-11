package com.invest.service;

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
import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final PortfolioRepository portfolioRepository;
    private final AssetRepository assetRepository;
    private final CurrencyService currencyService;

    public TransactionService(TransactionRepository transactionRepository,
                              PortfolioRepository portfolioRepository,
                              AssetRepository assetRepository,
                              CurrencyService currencyService) {
        this.transactionRepository = transactionRepository;
        this.portfolioRepository = portfolioRepository;
        this.assetRepository = assetRepository;
        this.currencyService = currencyService;
    }

    @Transactional
    public TransactionResponseDTO createTransaction(TransactionRequestDTO request) {
        Portfolio portfolio = portfolioRepository.findById(request.getPortfolioId())
                .orElseThrow(() -> new IllegalArgumentException("Portfolio não encontrado: " + request.getPortfolioId()));

        Asset asset = assetRepository.findByTicker(request.getTicker().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Ativo não encontrado com ticker: " + request.getTicker()));

        BigDecimal totalAmount = FinancialMathEngine.calculateTotalAmount(
                request.getQuantity(), request.getUnitPrice(), request.getFees());

        BigDecimal exchangeRate = request.getExchangeRate();
        if (exchangeRate == null || exchangeRate.compareTo(BigDecimal.ZERO) <= 0) {
            exchangeRate = currencyService.getUsdToBrlRate();
        }

        Transaction transaction = Transaction.builder()
                .portfolio(portfolio)
                .asset(asset)
                .type(request.getType())
                .quantity(request.getQuantity())
                .unitPrice(request.getUnitPrice())
                .fees(request.getFees() != null ? request.getFees() : BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .currency(request.getCurrency())
                .exchangeRateOnDate(exchangeRate)
                .transactionDate(request.getTransactionDate())
                .broker(request.getBroker())
                .notes(request.getNotes())
                .build();

        Transaction saved = transactionRepository.save(transaction);
        return mapToDTO(saved);
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
