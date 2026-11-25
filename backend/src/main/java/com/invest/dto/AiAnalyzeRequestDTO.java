package com.invest.dto;

import lombok.Data;

import java.util.List;

@Data
public class AiAnalyzeRequestDTO {
    private String date;
    private List<String> analysts;
    private Boolean fast;
}
