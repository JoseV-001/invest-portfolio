-- V2__seed_initial_transactions.sql
-- Carga inicial demonstrativa de transações e cotações de referência para os 30 ativos (B3 e Nomad)

-- 1. Transações B3 (Banco Inter - 14 Ativos Demo)
INSERT INTO transactions (
    portfolio_id, asset_id, type, quantity, unit_price, fees, total_amount, currency, exchange_rate_on_date, transaction_date, broker, notes
)
SELECT
    1, a.id, 'BUY', t.quantity, t.unit_price, 0.0000, (t.quantity * t.unit_price), 'BRL', 1.000000, '2026-01-15 14:00:00+00'::timestamptz, 'Banco Inter', 'Carga demonstrativa inicial B3'
FROM (VALUES
    ('MXRF11', 120.00000000::numeric,  10.0000::numeric),
    ('KNCR11',  10.00000000::numeric, 102.0000::numeric),
    ('ITSA4',   80.00000000::numeric,  10.5000::numeric),
    ('BBAS3',   30.00000000::numeric,  26.0000::numeric),
    ('VALE3',   12.00000000::numeric,  60.0000::numeric),
    ('TAEE4',   40.00000000::numeric,  11.5000::numeric),
    ('PETR4',   25.00000000::numeric,  35.0000::numeric),
    ('CMIG3',   35.00000000::numeric,  14.0000::numeric),
    ('BBDC3',   40.00000000::numeric,  13.5000::numeric),
    ('FIQE3',  100.00000000::numeric,   4.2000::numeric),
    ('KLBN4',   90.00000000::numeric,   4.1000::numeric),
    ('BRBI11',  20.00000000::numeric,  15.0000::numeric),
    ('BOVA11',   8.00000000::numeric, 125.0000::numeric),
    ('SMAL11',   6.00000000::numeric, 100.0000::numeric)
) AS t(ticker, quantity, unit_price)
JOIN assets a ON a.ticker = t.ticker;

-- 2. Transações Nomad (Exterior - 16 Ativos Demo)
INSERT INTO transactions (
    portfolio_id, asset_id, type, quantity, unit_price, fees, total_amount, currency, exchange_rate_on_date, transaction_date, broker, notes
)
SELECT
    1, a.id, 'BUY', t.quantity, t.unit_price, 0.0000, (t.quantity * t.unit_price), 'USD', 5.500000, '2026-01-15 14:00:00+00'::timestamptz, 'Nomad', 'Carga demonstrativa inicial Nomad'
FROM (VALUES
    ('SCHD', 1.00000000::numeric, 280.0000::numeric),
    ('VOO',  1.00000000::numeric, 600.0000::numeric),
    ('QQQ',  1.00000000::numeric, 384.0000::numeric),
    ('DHS',  1.00000000::numeric, 180.0000::numeric),
    ('SPHD', 1.00000000::numeric, 180.0000::numeric),
    ('QYLD', 1.00000000::numeric, 140.0000::numeric),
    ('IAU',  1.00000000::numeric, 150.0000::numeric),
    ('TFLO', 1.00000000::numeric, 150.0000::numeric),
    ('O',    1.00000000::numeric, 196.0000::numeric),
    ('STAG', 1.00000000::numeric, 144.0000::numeric),
    ('MAIN', 1.00000000::numeric, 120.0000::numeric),
    ('AAPL', 1.00000000::numeric, 165.0000::numeric),
    ('KO',   1.00000000::numeric, 130.0000::numeric),
    ('UNH',  1.00000000::numeric, 130.0000::numeric),
    ('NVDA', 1.00000000::numeric, 130.0000::numeric),
    ('ANET', 1.00000000::numeric, 100.0000::numeric)
) AS t(ticker, quantity, unit_price)
JOIN assets a ON a.ticker = t.ticker;

-- 3. Cotações de Referência Demonstrativas (Snapshot Demo)
INSERT INTO quote_history (asset_id, price, currency, source, timestamp)
SELECT a.id, q.price, a.currency, 'DEMO_SNAPSHOT_20260115', '2026-01-15 18:00:00+00'::timestamptz
FROM (VALUES
    -- B3
    ('MXRF11',  10.2500::numeric),
    ('KNCR11', 104.5000::numeric),
    ('ITSA4',   11.2000::numeric),
    ('BBAS3',   27.8000::numeric),
    ('VALE3',   63.5000::numeric),
    ('TAEE4',   12.1000::numeric),
    ('PETR4',   38.4000::numeric),
    ('CMIG3',   14.9000::numeric),
    ('BBDC3',   12.8000::numeric),
    ('FIQE3',    4.6500::numeric),
    ('KLBN4',    4.3000::numeric),
    ('BRBI11',  15.6000::numeric),
    ('BOVA11', 132.5000::numeric),
    ('SMAL11',  96.0000::numeric),
    -- Nomad (EUA)
    ('SCHD',   305.0000::numeric),
    ('VOO',    654.0000::numeric),
    ('QQQ',    416.0000::numeric),
    ('DHS',    193.0000::numeric),
    ('SPHD',   193.0000::numeric),
    ('QYLD',   144.0000::numeric),
    ('IAU',    165.0000::numeric),
    ('TFLO',   151.2000::numeric),
    ('O',      203.0000::numeric),
    ('STAG',   154.0000::numeric),
    ('MAIN',   130.0000::numeric),
    ('AAPL',   183.0000::numeric),
    ('KO',     138.0000::numeric),
    ('UNH',    135.0000::numeric),
    ('NVDA',   148.0000::numeric),
    ('ANET',   115.0000::numeric)
) AS q(ticker, price)
JOIN assets a ON a.ticker = q.ticker;
