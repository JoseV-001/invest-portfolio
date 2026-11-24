package com.invest.repository;

import com.invest.domain.model.PortfolioAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PortfolioAllocationRepository extends JpaRepository<PortfolioAllocation, Long> {
    List<PortfolioAllocation> findByPortfolioIdOrderByAssetClassAsc(Long portfolioId);

    void deleteByPortfolioId(Long portfolioId);
}
