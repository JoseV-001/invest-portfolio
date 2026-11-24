-- SQLite V2__seed_initial_transactions.sql
-- Carga inicial demonstrativa de transações e cotações de referência para os 30 ativos (B3 e Nomad)

-- 1. Transações B3 (Banco Inter - 14 Ativos Demo)
INSERT INTO transactions (
    portfolio_id, asset_id, type, quantity, unit_price, fees, total_amount, currency, exchange_rate_on_date, transaction_date, broker, notes, created_at
)
SELECT
    1, a.id, 'BUY', t.quantity, t.unit_price, 0.0000, ROUND(t.quantity * t.unit_price, 4), 'BRL', 1.000000, '2026-01-15 14:00:00', 'Banco Inter', 'Carga demonstrativa inicial B3', '2026-01-15 14:00:00'
FROM (
    SELECT 'MXRF11' AS ticker, 120.00000000 AS quantity,  10.0000 AS unit_price
    UNION ALL SELECT 'KNCR11',  10.00000000, 102.0000
    UNION ALL SELECT 'ITSA4',   80.00000000,  10.5000
    UNION ALL SELECT 'BBAS3',   30.00000000,  26.0000
    UNION ALL SELECT 'VALE3',   12.00000000,  60.0000
    UNION ALL SELECT 'TAEE4',   40.00000000,  11.5000
    UNION ALL SELECT 'PETR4',   25.00000000,  35.0000
    UNION ALL SELECT 'CMIG3',   35.00000000,  14.0000
    UNION ALL SELECT 'BBDC3',   40.00000000,  13.5000
    UNION ALL SELECT 'FIQE3',  100.00000000,   4.2000
    UNION ALL SELECT 'KLBN4',   90.00000000,   4.1000
    UNION ALL SELECT 'BRBI11',  20.00000000,  15.0000
    UNION ALL SELECT 'BOVA11',   8.00000000, 125.0000
    UNION ALL SELECT 'SMAL11',   6.00000000, 100.0000
) AS t
JOIN assets a ON a.ticker = t.ticker;

-- 2. Transações Nomad (Exterior - 16 Ativos Demo)
INSERT INTO transactions (
    portfolio_id, asset_id, type, quantity, unit_price, fees, total_amount, currency, exchange_rate_on_date, transaction_date, broker, notes, created_at
)
SELECT
    1, a.id, 'BUY', t.quantity, t.unit_price, 0.0000, t.total_amount, 'USD', 5.500000, '2026-01-15 14:00:00', 'Nomad', 'Carga demonstrativa inicial Nomad', '2026-01-15 14:00:00'
FROM (
    SELECT 'SCHD' AS ticker, 10.00000000 AS quantity,  28.0000 AS unit_price, 280.0000 AS total_amount
    UNION ALL SELECT 'VOO',   1.20000000, 500.0000, 600.0000
    UNION ALL SELECT 'QQQ',   0.80000000, 480.0000, 384.0000
    UNION ALL SELECT 'DHS',   2.00000000,  90.0000, 180.0000
    UNION ALL SELECT 'SPHD',  4.00000000,  45.0000, 180.0000
    UNION ALL SELECT 'QYLD',  8.00000000,  17.5000, 140.0000
    UNION ALL SELECT 'IAU',   3.00000000,  50.0000, 150.0000
    UNION ALL SELECT 'TFLO',  3.00000000,  50.0000, 150.0000
    UNION ALL SELECT 'O',     3.50000000,  56.0000, 196.0000
    UNION ALL SELECT 'STAG',  4.00000000,  36.0000, 144.0000
    UNION ALL SELECT 'MAIN',  2.50000000,  48.0000, 120.0000
    UNION ALL SELECT 'AAPL',  0.75000000, 220.0000, 165.0000
    UNION ALL SELECT 'KO',    2.00000000,  65.0000, 130.0000
    UNION ALL SELECT 'UNH',   0.25000000, 520.0000, 130.0000
    UNION ALL SELECT 'NVDA',  1.00000000, 130.0000, 130.0000
    UNION ALL SELECT 'ANET',  1.00000000, 100.0000, 100.0000
) AS t
JOIN assets a ON a.ticker = t.ticker;

-- 3. Cotações de Referência Demonstrativas
INSERT INTO quote_history (asset_id, price, currency, source, timestamp)
SELECT a.id, q.price, a.currency, 'DEMO_SNAPSHOT_20260115', '2026-01-15 18:00:00'
FROM (
    SELECT 'MXRF11' AS ticker, 10.2500 AS price
    UNION ALL SELECT 'KNCR11', 104.5000
    UNION ALL SELECT 'ITSA4',   11.2000
    UNION ALL SELECT 'BBAS3',   27.8000
    UNION ALL SELECT 'VALE3',   63.5000
    UNION ALL SELECT 'TAEE4',   12.1000
    UNION ALL SELECT 'PETR4',   38.4000
    UNION ALL SELECT 'CMIG3',   14.9000
    UNION ALL SELECT 'BBDC3',   12.8000
    UNION ALL SELECT 'FIQE3',    4.6500
    UNION ALL SELECT 'KLBN4',    4.3000
    UNION ALL SELECT 'BRBI11',  15.6000
    UNION ALL SELECT 'BOVA11', 132.5000
    UNION ALL SELECT 'SMAL11',  96.0000
    UNION ALL SELECT 'SCHD',    30.5000
    UNION ALL SELECT 'VOO',    545.0000
    UNION ALL SELECT 'QQQ',    520.0000
    UNION ALL SELECT 'DHS',     96.5000
    UNION ALL SELECT 'SPHD',    48.2500
    UNION ALL SELECT 'QYLD',    18.0000
    UNION ALL SELECT 'IAU',     55.0000
    UNION ALL SELECT 'TFLO',    50.4000
    UNION ALL SELECT 'O',       58.0000
    UNION ALL SELECT 'STAG',    38.5000
    UNION ALL SELECT 'MAIN',    52.0000
    UNION ALL SELECT 'AAPL',   244.0000
    UNION ALL SELECT 'KO',      69.0000
    UNION ALL SELECT 'UNH',    540.0000
    UNION ALL SELECT 'NVDA',   148.0000
    UNION ALL SELECT 'ANET',   115.0000
) AS q
JOIN assets a ON a.ticker = q.ticker;
