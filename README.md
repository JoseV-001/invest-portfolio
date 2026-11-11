# Invest Portfolio - Gerenciador e Consolidador de Investimentos (B3 & Nomad)

Sistema full-stack para consolidação de carteiras de investimentos no Brasil (B3 via Banco Inter) e no Exterior (NYSE/NASDAQ via Nomad com suporte a cotas fracionárias), inspirado no Investidor 10 com arquitetura desacoplada e automação de cotações em tempo real.

---

## 🚀 Arquitetura e Tecnologias

- **Backend:** Java 17+, Spring Boot 3.3, Spring Data JPA, RestClient, Spring Cache (Redis), Bean Validation, Flyway.
- **Frontend:** TypeScript, Next.js 14 (App Router), Tailwind CSS, Lucide Icons.
- **Banco de Dados:** PostgreSQL 16 com campos estritamente `NUMERIC(19, 8)` para frações de ações e `NUMERIC(19, 4)` para moedas.
- **Cache & Rate-limit:** Redis 7 Alpine.
- **Provedores de Mercado:**
  - **B3:** Brapi.dev (Principal) / Yahoo Finance (Fallback)
  - **US (Stocks, REITs, ETFs):** Finnhub.io (Principal) / Yahoo Finance (Fallback)
  - **Câmbio USD/BRL:** AwesomeAPI Economia / Banco Central do Brasil

---

## 📁 Estrutura de Pastas

```text
invest-portfolio/
├── infra/
│   ├── postgres/           # Script DDL de inicialização e dados sementes
│   └── data/               # CSVs consolidados com os 30 ativos (Inter e Nomad)
├── backend/                # Microsserviço Spring Boot 3
│   ├── src/main/java/com/invest/
│   │   ├── domain/         # Entidades JPA e Enums
│   │   ├── repository/     # Spring Data JPA Repositories
│   │   ├── service/        # Regras de Negócio e Cálculos Financeiros (PM, Rentabilidade)
│   │   ├── provider/       # Strategy / Adapter para consumo de cotações e FX
│   │   ├── dto/            # Data Transfer Objects
│   │   └── controller/     # Endpoints RESTful
│   └── Dockerfile
├── frontend/               # Aplicação Next.js 14 + Tailwind CSS
│   ├── src/
│   │   ├── app/            # Páginas e Rotas Next.js
│   │   ├── components/     # Cards, Tabelas, Gráficos e Modais
│   │   ├── services/       # Cliente HTTP (Axios / Fetch)
│   │   └── types/          # Tipagens TypeScript
│   └── Dockerfile
├── docker-compose.yml      # Orquestração de todos os serviços (PostgreSQL, Redis, Backend, Frontend)
└── README.md
```

---

## 🛠️ Como Executar

### 1. Pré-requisitos
- Docker e Docker Compose instalados (ou Maven 3.9+, JDK 17+ e Node.js 20+ para rodar localmente).

### 2. Executando com Docker Compose (Recomendado)
```bash
docker compose up -d --build
```
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080/api/v1/portfolios
- **Swagger / OpenAPI:** http://localhost:8080/swagger-ui.html

---

## 📊 Regras Financeiras Implementadas

1. **Preço Médio Ponderado:**
   $$\text{PM} = \frac{\sum (\text{Quantidade} \times \text{Preço})}{\sum \text{Quantidade}}$$
2. **Cotas Fracionárias (*Fractional Shares*):**
   Suporte a até 8 casas decimais (`NUMERIC(19, 8)`), essencial para compras em dólar pela Nomad (ex: 0.0384 AAPL).
3. **Consolidação Cambial:**
   Os ativos em USD são convertidos para BRL pela cotação de fechamento/tempo real provida pela AwesomeAPI.
