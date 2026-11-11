package com.invest.controller;

import com.invest.domain.model.Asset;
import com.invest.repository.AssetRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/assets")
@CrossOrigin(origins = "*")
public class AssetController {

    private final AssetRepository assetRepository;

    public AssetController(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @GetMapping
    public ResponseEntity<List<Asset>> listAssets() {
        return ResponseEntity.ok(assetRepository.findAll());
    }

    @GetMapping("/{ticker}")
    public ResponseEntity<Asset> getAsset(@PathVariable String ticker) {
        return assetRepository.findByTicker(ticker.toUpperCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
