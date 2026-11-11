package com.invest.controller;

import com.invest.dto.PortfolioSummaryDTO;
import com.invest.service.PortfolioService;
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
    public ResponseEntity<PortfolioSummaryDTO> getPortfolioSummary(@PathVariable Long id) {
        return ResponseEntity.ok(portfolioService.getPortfolioSummary(id));
    }
}
