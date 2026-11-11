package com.invest.repository;

import com.invest.domain.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    Optional<Asset> findByTicker(String ticker);
    List<Asset> findAllByActiveTrue();
}
