package com.invest.domain.model;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String ticker;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_class", nullable = false, length = 30)
    private AssetClass assetClass;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MarketType market;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CurrencyType currency;

    @Builder.Default
    @Column(name = "is_fractional", nullable = false)
    private Boolean isFractional = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
