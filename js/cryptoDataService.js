/**
 * Crypto Data Service
 * Handles real-time cryptocurrency market data from CoinGecko API
 */

export class CryptoDataService {
    constructor() {
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
        this.supportedCoins = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
            { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
            { id: 'solana', symbol: 'SOL', name: 'Solana' },
            { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
            { id: 'ripple', symbol: 'XRP', name: 'XRP' },
            { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' }
        ];
    }

    /**
     * Get current price for a cryptocurrency
     */
    async getCurrentPrice(coinId) {
        const cacheKey = `price_${coinId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = {
                price: data[coinId].usd,
                volume24h: data[coinId].usd_24h_vol,
                change24h: data[coinId].usd_24h_change,
                marketCap: data[coinId].usd_market_cap,
                timestamp: Date.now()
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error fetching price for ${coinId}:`, error);
            throw error;
        }
    }

    /**
     * Get historical price data (OHLCV)
     */
    async getHistoricalData(coinId, days = 7) {
        const cacheKey = `history_${coinId}_${days}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseUrl}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = data.map(candle => ({
                timestamp: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            }));

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error(`Error fetching historical data for ${coinId}:`, error);
            throw error;
        }
    }

    /**
     * Get market data for all tracked coins
     */
    async getAllMarketData() {
        const coinIds = this.supportedCoins.map(c => c.id).join(',');

        try {
            const response = await fetch(
                `${this.baseUrl}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return this.supportedCoins.map(coin => ({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                price: data[coin.id]?.usd || 0,
                volume24h: data[coin.id]?.usd_24h_vol || 0,
                change24h: data[coin.id]?.usd_24h_change || 0,
                marketCap: data[coin.id]?.usd_market_cap || 0
            }));
        } catch (error) {
            console.error('Error fetching all market data:', error);
            throw error;
        }
    }

    /**
     * Get trending coins
     */
    async getTrendingCoins() {
        try {
            const response = await fetch(`${this.baseUrl}/search/trending`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.coins.slice(0, 10).map(item => ({
                id: item.item.id,
                symbol: item.item.symbol,
                name: item.item.name,
                marketCapRank: item.item.market_cap_rank,
                priceChangePercentage24h: item.item.data?.price_change_percentage_24h?.usd || 0
            }));
        } catch (error) {
            console.error('Error fetching trending coins:', error);
            throw error;
        }
    }

    /**
     * Get global crypto market data
     */
    async getGlobalMarketData() {
        const cacheKey = 'global_market';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.baseUrl}/global`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const result = {
                totalMarketCap: data.data.total_market_cap.usd,
                total24hVolume: data.data.total_volume.usd,
                btcDominance: data.data.market_cap_percentage.btc,
                ethDominance: data.data.market_cap_percentage.eth,
                activeCoins: data.data.active_cryptocurrencies,
                marketCapChange24h: data.data.market_cap_change_percentage_24h_usd
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error fetching global market data:', error);
            throw error;
        }
    }

    /**
     * Simulate real-time price updates (for demo purposes)
     * Generates realistic price movements based on volatility
     */
    simulatePriceUpdate(currentPrice, volatility = 0.001) {
        // Random walk with bias toward recent trend
        const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
        return currentPrice + change;
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    /**
     * Get coin info by symbol
     */
    getCoinBySymbol(symbol) {
        return this.supportedCoins.find(
            coin => coin.symbol.toLowerCase() === symbol.toLowerCase()
        );
    }

    /**
     * Get supported trading pairs
     */
    getTradingPairs() {
        return this.supportedCoins.map(coin => `${coin.symbol}/USDT`);
    }
}
