package com.invest.domain.model;

import com.invest.domain.enums.CurrencyType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "currency_exchange_rates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CurrencyExchangeRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_currency", nullable = false, length = 10)
    private CurrencyType fromCurrency;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_currency", nullable = false, length = 10)
    private CurrencyType toCurrency;

    @Column(nullable = false, precision = 19, scale = 6)
    private BigDecimal rate;

    @Column(nullable = false, length = 50)
    private String source;

    @Builder.Default
    @Column(nullable = false)
    private Instant timestamp = Instant.now();
}
