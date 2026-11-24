package com.invest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
@EnableCaching
@EnableScheduling
public class InvestPortfolioApplication {

    public static void main(String[] args) {
        ensureSqliteDirectoryExists();
        SpringApplication.run(InvestPortfolioApplication.class, args);
    }

    private static void ensureSqliteDirectoryExists() {
        try {
            String customPath = System.getenv("SQLITE_DB_PATH");
            Path dbPath = Paths.get(customPath != null && !customPath.isBlank() ? customPath : "./data/invest_portfolio.db");
            Path parent = dbPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (Exception ignored) {
            // Directory creation is best-effort for SQLite profile
        }
    }
}
