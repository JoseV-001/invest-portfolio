package com.invest.domain.model;

import com.invest.domain.enums.AssetClass;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "portfolio_allocations",
        uniqueConstraints = @UniqueConstraint(name = "uk_portfolio_class", columnNames = {"portfolio_id", "asset_class"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_class", nullable = false, length = 30)
    private AssetClass assetClass;

    @Column(name = "target_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal targetPercentage;
}
