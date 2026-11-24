package com.invest.controller;

import com.invest.dto.TransactionRequestDTO;
import com.invest.dto.TransactionResponseDTO;
import com.invest.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponseDTO> createTransaction(@Valid @RequestBody TransactionRequestDTO request) {
        TransactionResponseDTO response = transactionService.createTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<TransactionResponseDTO>> createTransactionsBatch(
            @Valid @RequestBody List<@Valid TransactionRequestDTO> requests) {
        List<TransactionResponseDTO> responses = transactionService.createTransactionsBatch(requests);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @GetMapping("/portfolio/{portfolioId}")
    public ResponseEntity<List<TransactionResponseDTO>> listTransactions(@PathVariable Long portfolioId) {
        return ResponseEntity.ok(transactionService.listTransactionsByPortfolio(portfolioId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        transactionService.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }
}
