-- SQLite V1__initial_schema.sql

CREATE TABLE IF NOT EXISTS portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    asset_class VARCHAR(30) NOT NULL,
    market VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    is_fractional INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_ticker ON assets(ticker);
CREATE INDEX IF NOT EXISTS idx_assets_market ON assets(market);

CREATE TABLE IF NOT EXISTS quote_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_history_asset_time ON quote_history(asset_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(19, 6) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fx_currencies_time ON currency_exchange_rates(from_currency, to_currency, timestamp DESC);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id),
    type VARCHAR(30) NOT NULL,
    quantity NUMERIC(19, 8) NOT NULL,
    unit_price NUMERIC(19, 4) NOT NULL,
    fees NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    exchange_rate_on_date NUMERIC(19, 6) NOT NULL DEFAULT 1.000000,
    transaction_date TIMESTAMP NOT NULL,
    broker VARCHAR(60) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date ON transactions(portfolio_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);

CREATE TABLE IF NOT EXISTS portfolio_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_class VARCHAR(30) NOT NULL,
    target_percentage NUMERIC(5, 2) NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
    CONSTRAINT uk_portfolio_class UNIQUE(portfolio_id, asset_class)
);

-- Seed Data Inicial
INSERT OR IGNORE INTO portfolios (id, user_id, name, description, base_currency, created_at, updated_at)
VALUES (1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carteira Principal Consolidada', 'Consolidação de B3 (Banco Inter) e Nomad (EUA)', 'BRL', '2026-11-03 14:00:00', '2026-11-03 14:00:00');

INSERT OR IGNORE INTO assets (ticker, name, asset_class, market, currency, is_fractional, active, created_at, updated_at) VALUES
('MXRF11', 'Maxi Renda FII', 'FIIS', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('KNCR11', 'Kinea Rendimentos Imobiliários FII', 'FIIS', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('ITSA4', 'Itaúsa S.A. PN', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('BBAS3', 'Banco do Brasil S.A. ON', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('VALE3', 'Vale S.A. ON', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('TAEE4', 'Taesa PN', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('PETR4', 'Petrobras PN', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('CMIG3', 'Cemig ON', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('BBDC3', 'Banco Bradesco S.A. ON', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('FIQE3', 'Unifique Telecomunicações ON', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('KLBN4', 'Klabin S.A. PN', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('BRBI11', 'BR Advisory Partners Unit', 'STOCKS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('BOVA11', 'iShares Ibovespa ETF', 'ETFS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('SMAL11', 'iShares Small Cap ETF', 'ETFS_BR', 'B3', 'BRL', 0, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('SCHD', 'Schwab US Dividend Equity ETF', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('VOO', 'Vanguard S&P 500 ETF', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('QQQ', 'Invesco QQQ Trust Series 1', 'ETFS_US', 'NASDAQ', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('DHS', 'WisdomTree U.S. High Dividend', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('SPHD', 'Invesco S&P 500 High Dividend Low Volatility', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('QYLD', 'Global X NASDAQ 100 Covered Call ETF', 'ETFS_US', 'NASDAQ', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('IAU', 'iShares Gold Trust', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('TFLO', 'iShares Treasury Floating Rate Bond ETF', 'ETFS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('O', 'Realty Income Corporation', 'REITS', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('STAG', 'STAG Industrial Inc', 'REITS', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('MAIN', 'Main Street Capital Corporation', 'STOCKS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('AAPL', 'Apple Inc', 'STOCKS_US', 'NASDAQ', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('KO', 'The Coca-Cola Company', 'STOCKS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('UNH', 'UnitedHealth Group Inc', 'STOCKS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('NVDA', 'Nvidia Corp', 'STOCKS_US', 'NASDAQ', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00'),
('ANET', 'Arista Networks Inc', 'STOCKS_US', 'NYSE', 'USD', 1, 1, '2026-11-03 14:00:00', '2026-11-03 14:00:00');

INSERT INTO currency_exchange_rates (from_currency, to_currency, rate, source, timestamp)
VALUES ('USD', 'BRL', 5.750000, 'AwesomeAPI-Seed', '2026-11-03 14:00:00');
