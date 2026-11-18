package com.invest.service;

import com.invest.domain.enums.AssetClass;
import com.invest.domain.enums.CurrencyType;
import com.invest.domain.enums.MarketType;

import java.util.Set;

public final class AssetClassifier {

    private static final Set<String> B3_ETFS = Set.of(
            "IVVB11", "BOVA11", "SMAL11", "HASH11", "DIVO11", "NASD11", "SPXI11",
            "GOLD11", "BOVV11", "BRAX11", "ECOO11", "PIBB11", "XFIX11", "QBTC11",
            "ETHE11", "BITH11", "SOLH11", "CHIP11", "TECK11", "EURP11", "ACWI11",
            "WRLD11", "LFTS11", "IMAB11", "B5P211", "IB5M11", "FIXA11", "NDIV11",
            "TRIG11", "FIND11", "MATB11", "ISUS11", "GOVE11", "DEFI11", "WEB311",
            "CRPT11", "UTLL11", "BNDX11", "USDB11"
    );

    private static final Set<String> B3_UNITS = Set.of(
            "TAEE11", "SANB11", "KLBN11", "BPAC11", "ENGI11", "ALUP11", "SAPR11",
            "TIET11", "AURE11", "BRBI11", "IGTI11", "MODL11", "PPLA11", "RNEW11",
            "SULA11", "BMGB11", "BIDI11", "GETT11"
    );

    private static final Set<String> US_ETFS = Set.of(
            "VOO", "SPY", "IVV", "QQQ", "QQQM", "SCHD", "VTI", "VXUS", "VT",
            "VEA", "VWO", "DHS", "SPHD", "QYLD", "JEPI", "JEPQ", "DIVO", "DGRO",
            "VIG", "VYM", "IAU", "GLD", "SLV", "TFLO", "SGOV", "BIL", "SHV",
            "TLT", "IEF", "BND", "AGG", "VNQ", "XLK", "XLF", "XLV", "XLE",
            "ARKK", "IBIT", "ETHA"
    );

    private static final Set<String> US_REITS = Set.of(
            "O", "STAG", "VICI", "PLD", "AMT", "CCI", "EQIX", "DLR", "SPG",
            "NNN", "WPC", "ADC", "WELL", "VTR", "AVB", "EQR", "ESS", "MAA",
            "INVH", "PSA", "EXR", "CUBE", "IRM", "ARE", "FRT", "KIM", "REG"
    );

    private static final Set<String> CRYPTO_TICKERS = Set.of(
            "BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "DOT", "AVAX", "LINK",
            "BTC-USD", "ETH-USD", "SOL-USD"
    );

    private static final Set<String> NASDAQ_TICKERS = Set.of(
            "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "GOOG", "META", "TSLA",
            "AVGO", "COST", "NFLX", "AMD", "INTC", "QCOM", "ADBE", "CSCO",
            "PEP", "QQQ", "QQQM", "QYLD", "JEPQ", "IBIT"
    );

    private AssetClassifier() {}

    public static CurrencyType resolveCurrency(String ticker, MarketType explicitMarket, CurrencyType explicitCurrency, AssetClass explicitClass) {
        if (explicitCurrency != null) {
            return explicitCurrency;
        }
        if (explicitMarket == MarketType.NYSE || explicitMarket == MarketType.NASDAQ || explicitMarket == MarketType.CRYPTO) {
            return CurrencyType.USD;
        }
        if (explicitMarket == MarketType.B3) {
            return CurrencyType.BRL;
        }
        if (explicitClass == AssetClass.STOCKS_US || explicitClass == AssetClass.REITS
                || explicitClass == AssetClass.ETFS_US || explicitClass == AssetClass.CRYPTO) {
            return CurrencyType.USD;
        }
        if (explicitClass == AssetClass.STOCKS_BR || explicitClass == AssetClass.FIIS || explicitClass == AssetClass.ETFS_BR) {
            return CurrencyType.BRL;
        }
        String norm = normalizeTicker(ticker);
        if (CRYPTO_TICKERS.contains(norm) || US_ETFS.contains(norm) || US_REITS.contains(norm) || NASDAQ_TICKERS.contains(norm)) {
            return CurrencyType.USD;
        }
        // Tickers brasileiros na B3 terminam em dígitos (ex: PETR4, MXRF11, BOVA11, AAPL34)
        if (norm.matches("^[A-Z]{4}\\d{1,2}B?$")) {
            return CurrencyType.BRL;
        }
        return CurrencyType.BRL;
    }

    public static AssetClass resolveAssetClass(String ticker, CurrencyType currency, MarketType market, AssetClass explicitClass) {
        if (explicitClass != null) {
            return explicitClass;
        }
        String norm = normalizeTicker(ticker);
        if (market == MarketType.CRYPTO || CRYPTO_TICKERS.contains(norm)) {
            return AssetClass.CRYPTO;
        }

        boolean isUsMarket = market == MarketType.NYSE || market == MarketType.NASDAQ || currency == CurrencyType.USD;
        if (isUsMarket) {
            if (US_ETFS.contains(norm)) {
                return AssetClass.ETFS_US;
            }
            if (US_REITS.contains(norm)) {
                return AssetClass.REITS;
            }
            return AssetClass.STOCKS_US;
        }

        if (B3_ETFS.contains(norm)) {
            return AssetClass.ETFS_BR;
        }
        if (B3_UNITS.contains(norm)) {
            return AssetClass.STOCKS_BR;
        }
        if (norm.endsWith("11") || norm.endsWith("11B")) {
            return AssetClass.FIIS;
        }
        return AssetClass.STOCKS_BR;
    }

    public static MarketType resolveMarket(String ticker, CurrencyType currency, MarketType explicitMarket, AssetClass resolvedClass) {
        if (explicitMarket != null) {
            return explicitMarket;
        }
        String norm = normalizeTicker(ticker);
        if (resolvedClass == AssetClass.CRYPTO || CRYPTO_TICKERS.contains(norm)) {
            return MarketType.CRYPTO;
        }
        if (currency == CurrencyType.USD
                || resolvedClass == AssetClass.STOCKS_US
                || resolvedClass == AssetClass.REITS
                || resolvedClass == AssetClass.ETFS_US) {
            return NASDAQ_TICKERS.contains(norm) ? MarketType.NASDAQ : MarketType.NYSE;
        }
        return MarketType.B3;
    }

    private static String normalizeTicker(String ticker) {
        return ticker == null ? "" : ticker.trim().toUpperCase();
    }
}
