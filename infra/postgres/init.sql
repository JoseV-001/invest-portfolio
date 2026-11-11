-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerações de Domínio
DO $$ BEGIN
    CREATE TYPE asset_class_enum AS ENUM (
        'STOCKS_BR', 'FIIS', 'ETFS_BR', 'STOCKS_US', 'REITS', 'ETFS_US', 'CRYPTO', 'CASH'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE market_enum AS ENUM ('B3', 'NYSE', 'NASDAQ', 'CRYPTO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE currency_enum AS ENUM ('BRL', 'USD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'BUY', 'SELL', 'DIVIDEND', 'JCP', 'SPLIT', 'REVERSE_SPLIT', 'AMORTIZATION'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. Tabela de Portfólios
CREATE TABLE IF NOT EXISTS portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_currency currency_enum NOT NULL DEFAULT 'BRL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela Mestra de Ativos
CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    asset_class asset_class_enum NOT NULL,
    market market_enum NOT NULL,
    currency currency_enum NOT NULL,
    is_fractional BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_ticker ON assets(ticker);
CREATE INDEX IF NOT EXISTS idx_assets_market ON assets(market);

-- 3. Histórico de Cotações (Séries Temporais)
CREATE TABLE IF NOT EXISTS quote_history (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(19, 4) NOT NULL,
    currency currency_enum NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_history_asset_time ON quote_history(asset_id, timestamp DESC);

-- 4. Histórico de Taxas de Câmbio (USD -> BRL)
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id BIGSERIAL PRIMARY KEY,
    from_currency currency_enum NOT NULL,
    to_currency currency_enum NOT NULL,
    rate NUMERIC(19, 6) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_currencies_time ON currency_exchange_rates(from_currency, to_currency, timestamp DESC);

-- 5. Transações Financeiras
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    type transaction_type_enum NOT NULL,
    quantity NUMERIC(19, 8) NOT NULL,
    unit_price NUMERIC(19, 4) NOT NULL,
    fees NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(19, 4) NOT NULL,
    currency currency_enum NOT NULL,
    exchange_rate_on_date NUMERIC(19, 6) NOT NULL DEFAULT 1.000000,
    transaction_date TIMESTAMPTZ NOT NULL,
    broker VARCHAR(60) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date ON transactions(portfolio_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);

-- 6. Metas de Alocação de Ativos
CREATE TABLE IF NOT EXISTS portfolio_allocations (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_class asset_class_enum NOT NULL,
    target_percentage NUMERIC(5, 2) NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
    CONSTRAINT uk_portfolio_class UNIQUE(portfolio_id, asset_class)
);

-- =========================================================================
-- SEED DATA INICIAL: Carteira Padrão e os 30 Ativos (B3 Inter + Nomad US)
-- =========================================================================

-- Inserir carteira padrão
INSERT INTO portfolios (id, user_id, name, description, base_currency)
VALUES (1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carteira Principal Consolidada', 'Consolidação de B3 (Banco Inter) e Nomad (EUA)', 'BRL')
ON CONFLICT (id) DO NOTHING;

-- Inserir Ativos B3
INSERT INTO assets (ticker, name, asset_class, market, currency, is_fractional) VALUES
('MXRF11', 'Maxi Renda FII', 'FIIS', 'B3', 'BRL', FALSE),
('KNCR11', 'Kinea Rendimentos Imobiliários FII', 'FIIS', 'B3', 'BRL', FALSE),
('ITSA4', 'Itaúsa S.A. PN', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('BBAS3', 'Banco do Brasil S.A. ON', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('VALE3', 'Vale S.A. ON', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('TAEE4', 'Taesa PN', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('PETR4', 'Petrobras PN', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('CMIG3', 'Cemig ON', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('BBDC3', 'Banco Bradesco S.A. ON', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('FIQE3', 'Unifique Telecomunicações ON', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('KLBN4', 'Klabin S.A. PN', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('BRBI11', 'BR Advisory Partners Unit', 'STOCKS_BR', 'B3', 'BRL', FALSE),
('BOVA11', 'iShares Ibovespa ETF', 'ETFS_BR', 'B3', 'BRL', FALSE),
('SMAL11', 'iShares Small Cap ETF', 'ETFS_BR', 'B3', 'BRL', FALSE)
ON CONFLICT (ticker) DO NOTHING;

-- Inserir Ativos Nomad (EUA)
INSERT INTO assets (ticker, name, asset_class, market, currency, is_fractional) VALUES
('SCHD', 'Schwab US Dividend Equity ETF', 'ETFS_US', 'NYSE', 'USD', TRUE),
('VOO', 'Vanguard S&P 500 ETF', 'ETFS_US', 'NYSE', 'USD', TRUE),
('QQQ', 'Invesco QQQ Trust Series 1', 'ETFS_US', 'NASDAQ', 'USD', TRUE),
('DHS', 'WisdomTree U.S. High Dividend', 'ETFS_US', 'NYSE', 'USD', TRUE),
('SPHD', 'Invesco S&P 500 High Dividend Low Volatility', 'ETFS_US', 'NYSE', 'USD', TRUE),
('QYLD', 'Global X NASDAQ 100 Covered Call ETF', 'ETFS_US', 'NASDAQ', 'USD', TRUE),
('IAU', 'iShares Gold Trust', 'ETFS_US', 'NYSE', 'USD', TRUE),
('TFLO', 'iShares Treasury Floating Rate Bond ETF', 'ETFS_US', 'NYSE', 'USD', TRUE),
('O', 'Realty Income Corporation', 'REITS', 'NYSE', 'USD', TRUE),
('STAG', 'STAG Industrial Inc', 'REITS', 'NYSE', 'USD', TRUE),
('MAIN', 'Main Street Capital Corporation', 'STOCKS_US', 'NYSE', 'USD', TRUE),
('AAPL', 'Apple Inc', 'STOCKS_US', 'NASDAQ', 'USD', TRUE),
('KO', 'The Coca-Cola Company', 'STOCKS_US', 'NYSE', 'USD', TRUE),
('UNH', 'UnitedHealth Group Inc', 'STOCKS_US', 'NYSE', 'USD', TRUE),
('NVDA', 'Nvidia Corp', 'STOCKS_US', 'NASDAQ', 'USD', TRUE),
('ANET', 'Arista Networks Inc', 'STOCKS_US', 'NYSE', 'USD', TRUE)
ON CONFLICT (ticker) DO NOTHING;

-- Inserir Cotação de Câmbio de Referência inicial (R$ 5.75)
INSERT INTO currency_exchange_rates (from_currency, to_currency, rate, source)
SELECT 'USD'::currency_enum, 'BRL'::currency_enum, 5.750000, 'AwesomeAPI-Seed'
WHERE NOT EXISTS (
    SELECT 1 FROM currency_exchange_rates WHERE from_currency = 'USD' AND to_currency = 'BRL'
);

-- As transações iniciais e o snapshot de cotações são aplicados exclusivamente pelo Flyway
-- (V2__seed_initial_transactions.sql e V3__fix_nomad_fractional_quantities.sql)
-- para evitar duplicidade na inicialização conjunta com o backend.
