package com.invest.repository;

import com.invest.domain.model.QuoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuoteHistoryRepository extends JpaRepository<QuoteHistory, Long> {
    Optional<QuoteHistory> findFirstByAssetIdOrderByTimestampDesc(Long assetId);

    Optional<QuoteHistory> findFirstByOrderByTimestampDesc();
}
