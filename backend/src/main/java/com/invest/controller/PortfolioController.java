package com.invest.controller;

import com.invest.dto.PortfolioSummaryDTO;
import com.invest.dto.PositionUpdateRequestDTO;
import com.invest.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/portfolios")
@CrossOrigin(origins = "*")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
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
}
