package com.invest.repository;

import com.invest.domain.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    @Query("SELECT t FROM Transaction t JOIN FETCH t.asset JOIN FETCH t.portfolio WHERE t.portfolio.id = :portfolioId ORDER BY t.transactionDate DESC")
    List<Transaction> findByPortfolioIdOrderByTransactionDateDesc(@Param("portfolioId") Long portfolioId);

    @Query("SELECT t FROM Transaction t JOIN FETCH t.asset WHERE t.portfolio.id = :portfolioId ORDER BY t.transactionDate ASC")
    List<Transaction> findByPortfolioIdWithAssetAsc(@Param("portfolioId") Long portfolioId);

    List<Transaction> findByPortfolioIdAndAssetIdOrderByTransactionDateAsc(Long portfolioId, Long assetId);

    void deleteByPortfolioIdAndAssetId(Long portfolioId, Long assetId);
}
