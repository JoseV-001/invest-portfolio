package com.invest.repository;

import com.invest.domain.model.QuoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuoteHistoryRepository extends JpaRepository<QuoteHistory, Long> {
    Optional<QuoteHistory> findFirstByAssetIdOrderByTimestampDesc(Long assetId);

    Optional<QuoteHistory> findFirstByOrderByTimestampDesc();

    @Query("SELECT q FROM QuoteHistory q JOIN FETCH q.asset ORDER BY q.timestamp ASC")
    List<QuoteHistory> findAllWithAssetOrderByTimestampAsc();
}
