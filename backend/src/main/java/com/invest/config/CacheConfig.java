package com.invest.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Duration;

@Configuration
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
    @ConditionalOnBean(RedisConnectionFactory.class)
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(15))
                .disableCachingNullValues();
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }

    /**
     * Garante expiração periódica (15 min) mesmo quando o cache em memória (simple) está ativo.
     */
    @Scheduled(fixedRate = 900_000, initialDelay = 900_000)
    @CacheEvict(value = {"quotes", "currency_rates"}, allEntries = true)
    public void evictCachesPeriodically() {
        log.debug("Caches 'quotes' e 'currency_rates' invalidados após TTL de 15 minutos.");
    }
}
