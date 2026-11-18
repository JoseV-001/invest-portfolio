-- V3__fix_nomad_fractional_quantities.sql
-- Ajusta as quantidades fracionárias e preços médios unitários demonstrativos dos 16 ativos da Nomad (EUA)
-- e atualiza o snapshot demonstrativo em quote_history para refletir a cotação unitária.

WITH nomad_fix(ticker, quantity, unit_price, total_amount, snapshot_price) AS (
    VALUES
        ('SCHD', 10.00000000::numeric,  28.0000::numeric, 280.0000::numeric,  30.5000::numeric),
        ('VOO',   1.20000000::numeric, 500.0000::numeric, 600.0000::numeric, 545.0000::numeric),
        ('QQQ',   0.80000000::numeric, 480.0000::numeric, 384.0000::numeric, 520.0000::numeric),
        ('DHS',   2.00000000::numeric,  90.0000::numeric, 180.0000::numeric,  96.5000::numeric),
        ('SPHD',  4.00000000::numeric,  45.0000::numeric, 180.0000::numeric,  48.2500::numeric),
        ('QYLD',  8.00000000::numeric,  17.5000::numeric, 140.0000::numeric,  18.0000::numeric),
        ('IAU',   3.00000000::numeric,  50.0000::numeric, 150.0000::numeric,  55.0000::numeric),
        ('TFLO',  3.00000000::numeric,  50.0000::numeric, 150.0000::numeric,  50.4000::numeric),
        ('O',     3.50000000::numeric,  56.0000::numeric, 196.0000::numeric,  58.0000::numeric),
        ('STAG',  4.00000000::numeric,  36.0000::numeric, 144.0000::numeric,  38.5000::numeric),
        ('MAIN',  2.50000000::numeric,  48.0000::numeric, 120.0000::numeric,  52.0000::numeric),
        ('AAPL',  0.75000000::numeric, 220.0000::numeric, 165.0000::numeric, 244.0000::numeric),
        ('KO',    2.00000000::numeric,  65.0000::numeric, 130.0000::numeric,  69.0000::numeric),
        ('UNH',   0.25000000::numeric, 520.0000::numeric, 130.0000::numeric, 540.0000::numeric),
        ('NVDA',  1.00000000::numeric, 130.0000::numeric, 130.0000::numeric, 148.0000::numeric),
        ('ANET',  1.00000000::numeric, 100.0000::numeric, 100.0000::numeric, 115.0000::numeric)
)
UPDATE transactions t
SET
    quantity = nf.quantity,
    unit_price = nf.unit_price,
    total_amount = nf.total_amount
FROM assets a
JOIN nomad_fix nf ON nf.ticker = a.ticker
WHERE t.asset_id = a.id
  AND t.broker = 'Nomad'
  AND t.notes = 'Carga demonstrativa inicial Nomad';

WITH nomad_snapshot(ticker, snapshot_price) AS (
    VALUES
        ('SCHD',  30.5000::numeric),
        ('VOO',  545.0000::numeric),
        ('QQQ',  520.0000::numeric),
        ('DHS',   96.5000::numeric),
        ('SPHD',  48.2500::numeric),
        ('QYLD',  18.0000::numeric),
        ('IAU',   55.0000::numeric),
        ('TFLO',  50.4000::numeric),
        ('O',     58.0000::numeric),
        ('STAG',  38.5000::numeric),
        ('MAIN',  52.0000::numeric),
        ('AAPL', 244.0000::numeric),
        ('KO',    69.0000::numeric),
        ('UNH',  540.0000::numeric),
        ('NVDA', 148.0000::numeric),
        ('ANET', 115.0000::numeric)
)
UPDATE quote_history qh
SET price = ns.snapshot_price
FROM assets a
JOIN nomad_snapshot ns ON ns.ticker = a.ticker
WHERE qh.asset_id = a.id
  AND qh.source = 'DEMO_SNAPSHOT_20260115';
