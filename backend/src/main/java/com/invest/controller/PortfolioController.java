package com.invest.controller;

import com.invest.dto.*;
import com.invest.service.AllocationService;
import com.invest.service.AnalyticsService;
import com.invest.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/portfolios")
public class PortfolioController {

    private final PortfolioService portfolioService;
    private final AllocationService allocationService;
    private final AnalyticsService analyticsService;

    public PortfolioController(PortfolioService portfolioService,
                               AllocationService allocationService,
                               AnalyticsService analyticsService) {
        this.portfolioService = portfolioService;
        this.allocationService = allocationService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<PortfolioSummaryDTO> getPortfolioSummary(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean refresh) {
        return ResponseEntity.ok(portfolioService.getPortfolioSummary(id, refresh));
    }

    @PutMapping("/{portfolioId}/positions/{assetId}")
    public ResponseEntity<PortfolioSummaryDTO> updatePosition(
            @PathVariable Long portfolioId,
            @PathVariable Long assetId,
            @Valid @RequestBody PositionUpdateRequestDTO request) {
        return ResponseEntity.ok(portfolioService.updatePosition(portfolioId, assetId, request));
    }

    @DeleteMapping("/{portfolioId}/positions/{assetId}")
    public ResponseEntity<Void> removePosition(
            @PathVariable Long portfolioId,
            @PathVariable Long assetId) {
        portfolioService.removePosition(portfolioId, assetId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/allocations")
    public ResponseEntity<List<AllocationTargetDTO>> getAllocations(@PathVariable Long id) {
        return ResponseEntity.ok(allocationService.getAllocations(id));
    }

    @PutMapping("/{id}/allocations")
    public ResponseEntity<List<AllocationTargetDTO>> updateAllocations(
            @PathVariable Long id,
            @Valid @RequestBody AllocationTargetsRequestDTO request) {
        return ResponseEntity.ok(allocationService.updateAllocations(id, request));
    }

    @GetMapping("/{id}/rebalance")
    public ResponseEntity<RebalanceSuggestionDTO> suggestRebalance(
            @PathVariable Long id,
            @RequestParam BigDecimal amountBrl) {
        return ResponseEntity.ok(allocationService.suggestRebalance(id, amountBrl));
    }

    @GetMapping("/{id}/dividends")
    public ResponseEntity<DividendSummaryDTO> getDividends(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getDividendSummary(id));
    }

    @GetMapping("/{id}/evolution")
    public ResponseEntity<List<PortfolioEvolutionPointDTO>> getEvolution(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getPortfolioEvolution(id));
    }

    @GetMapping(value = "/{id}/export/csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long id) {
        String csv = analyticsService.exportPortfolioCsv(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"carteira-" + id + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
