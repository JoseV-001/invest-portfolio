package com.invest.controller;

import com.invest.dto.AiAnalysisResponseDTO;
import com.invest.dto.AiAnalyzeRequestDTO;
import com.invest.dto.AiChatRequestDTO;
import com.invest.dto.AiChatResponseDTO;
import com.invest.service.TradingAgentsClientService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
public class AiAssistantController {

    private final TradingAgentsClientService tradingAgentsClientService;

    public AiAssistantController(TradingAgentsClientService tradingAgentsClientService) {
        this.tradingAgentsClientService = tradingAgentsClientService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponseDTO> chat(@Valid @RequestBody AiChatRequestDTO request) {
        return ResponseEntity.ok(tradingAgentsClientService.chatWithCopilot(request));
    }

    @PostMapping("/analyze/{ticker}")
    public ResponseEntity<AiAnalysisResponseDTO> analyzeTicker(
            @PathVariable String ticker,
            @RequestBody(required = false) AiAnalyzeRequestDTO request) {
        return ResponseEntity.ok(tradingAgentsClientService.analyzeTicker(ticker, request));
    }
}
