package com.invest.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class AiChatRequestDTO {
    private Long portfolioId = 1L;

    @NotBlank(message = "A mensagem não pode estar vazia")
    private String message;

    private List<AiChatTurnDTO> history = List.of();
}
