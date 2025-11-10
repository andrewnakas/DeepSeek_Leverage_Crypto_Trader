/**
 * Trading Bot
 * Combines AI analysis, technical indicators, and risk management to make trading decisions
 */

import { TechnicalAnalysis } from './technicalAnalysis.js';

export class TradingBot {
    constructor(deepseekService, cryptoDataService, tradingEngine, config = {}) {
        this.deepseekService = deepseekService;
        this.cryptoDataService = cryptoDataService;
        this.tradingEngine = tradingEngine;

        // Configuration
        this.config = {
            analysisInterval: config.analysisInterval || 15 * 60 * 1000, // 15 minutes default
            maxLeverage: config.maxLeverage || 10,
            riskPercentage: config.riskPercentage || 5,
            enableAutoTrading: config.enableAutoTrading || false,
            minConfidence: config.minConfidence || 0.6,
            ...config
        };

        // State
        this.isRunning = false;
        this.lastAnalysisTime = 0;
        this.analysisHistory = [];
        this.intervalId = null;
    }

    /**
     * Start the trading bot
     */
    async start() {
        if (this.isRunning) {
            console.log('Bot is already running');
            return;
        }

        this.isRunning = true;
        this.log('Bot started', 'info');

        // Run initial analysis
        await this.runAnalysis();

        // Set up periodic analysis
        this.intervalId = setInterval(() => {
            this.runAnalysis();
        }, this.config.analysisInterval);
    }

    /**
     * Stop the trading bot
     */
    stop() {
        if (!this.isRunning) {
            console.log('Bot is not running');
            return;
        }

        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.log('Bot stopped', 'info');
    }

    /**
     * Run market analysis and make trading decisions
     */
    async runAnalysis() {
        if (!this.isRunning) return;

        try {
            this.log('Running market analysis...', 'info');

            // Fetch market data
            const marketData = await this.cryptoDataService.getAllMarketData();
            const globalData = await this.cryptoDataService.getGlobalMarketData();

            // Analyze each coin
            const analysisPromises = marketData.slice(0, 3).map(async coin => {
                try {
                    // Get historical data
                    const historicalData = await this.cryptoDataService.getHistoricalData(coin.id, 7);

                    // Calculate technical indicators
                    const indicators = TechnicalAnalysis.calculateAllIndicators(historicalData);

                    // Generate technical signal
                    const technicalSignal = TechnicalAnalysis.generateSignal(indicators, coin.price);

                    return {
                        coin,
                        historicalData,
                        indicators,
                        technicalSignal
                    };
                } catch (error) {
                    console.error(`Error analyzing ${coin.symbol}:`, error);
                    return null;
                }
            });

            const coinAnalyses = (await Promise.all(analysisPromises)).filter(a => a !== null);

            if (coinAnalyses.length === 0) {
                this.log('No coin data available for analysis', 'warning');
                return;
            }

            // Get AI analysis from DeepSeek
            const aiAnalysis = await this.getAIAnalysis(marketData, coinAnalyses, globalData);

            // Store analysis
            this.analysisHistory.push({
                timestamp: Date.now(),
                marketData,
                coinAnalyses,
                aiAnalysis
            });

            // Keep only last 100 analyses
            if (this.analysisHistory.length > 100) {
                this.analysisHistory.shift();
            }

            // Display analysis
            this.displayAnalysis(aiAnalysis);

            // Update positions with current prices
            this.updatePositions(marketData);

            // Make trading decisions if auto-trading is enabled
            if (this.config.enableAutoTrading) {
                await this.executeTrading(aiAnalysis, coinAnalyses, marketData);
            }

            this.lastAnalysisTime = Date.now();
        } catch (error) {
            console.error('Error during analysis:', error);
            this.log(`Analysis error: ${error.message}`, 'error');
        }
    }

    /**
     * Get AI analysis from DeepSeek
     */
    async getAIAnalysis(marketData, coinAnalyses, globalData) {
        try {
            // Prepare data for AI
            const firstCoinAnalysis = coinAnalyses[0];

            const analysis = await this.deepseekService.analyzeMarket(
                marketData,
                firstCoinAnalysis.historicalData,
                firstCoinAnalysis.indicators,
                globalData
            );

            return analysis;
        } catch (error) {
            console.error('Error getting AI analysis:', error);
            return {
                sentiment: 'neutral',
                recommendations: [],
                risks: ['Unable to get AI analysis'],
                rawAnalysis: 'Error: ' + error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Execute trading based on analysis
     */
    async executeTrading(aiAnalysis, coinAnalyses, marketData) {
        // Combine AI recommendations with technical signals
        const tradingOpportunities = this.findTradingOpportunities(aiAnalysis, coinAnalyses);

        for (const opportunity of tradingOpportunities) {
            try {
                // Check if we already have a position for this symbol
                const existingPosition = this.tradingEngine.positions.find(
                    p => p.symbol === opportunity.symbol
                );

                if (existingPosition) {
                    this.log(`Already have position for ${opportunity.symbol}, skipping`, 'info');
                    continue;
                }

                // Check confidence threshold
                if (opportunity.confidence < this.config.minConfidence) {
                    this.log(`Confidence too low for ${opportunity.symbol} (${(opportunity.confidence * 100).toFixed(1)}%)`, 'info');
                    continue;
                }

                // Get current price
                const coin = marketData.find(c => c.symbol === opportunity.symbol);
                if (!coin) continue;

                // Calculate position size
                const stats = this.tradingEngine.getPortfolioStats();
                const positionSize = this.tradingEngine.calculatePositionSize(
                    stats.balance,
                    this.config.riskPercentage,
                    opportunity.entryPrice,
                    opportunity.stopLoss,
                    opportunity.leverage
                );

                // Open position
                const position = this.tradingEngine.openPosition(
                    opportunity.symbol,
                    opportunity.direction,
                    opportunity.entryPrice,
                    positionSize,
                    opportunity.leverage,
                    opportunity.stopLoss,
                    opportunity.takeProfit
                );

                this.log(
                    `Opened ${opportunity.direction} position for ${opportunity.symbol} at $${opportunity.entryPrice.toFixed(2)} with ${opportunity.leverage}x leverage`,
                    'success'
                );
            } catch (error) {
                console.error('Error executing trade:', error);
                this.log(`Trade execution error: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Find trading opportunities from analysis
     */
    findTradingOpportunities(aiAnalysis, coinAnalyses) {
        const opportunities = [];

        // Process AI recommendations
        aiAnalysis.recommendations.forEach(rec => {
            // Find matching coin analysis
            const coinAnalysis = coinAnalyses.find(
                ca => ca.coin.symbol === rec.symbol
            );

            if (!coinAnalysis) return;

            // Validate with technical analysis
            const technicalSignal = coinAnalysis.technicalSignal;

            // Check if technical and AI agree
            const aiDirection = rec.direction;
            const technicalDirection = technicalSignal.signal.includes('BUY') ? 'LONG' :
                                      technicalSignal.signal.includes('SELL') ? 'SHORT' : 'NEUTRAL';

            if (technicalDirection === 'NEUTRAL') return;

            // Calculate combined confidence
            const combinedConfidence = (rec.confidence + technicalSignal.confidence) / 2;

            // Ensure leverage is within limits
            const leverage = Math.min(rec.leverage, this.config.maxLeverage);

            opportunities.push({
                symbol: rec.symbol,
                direction: aiDirection,
                entryPrice: rec.entry || coinAnalysis.coin.price,
                stopLoss: rec.stopLoss,
                takeProfit: rec.takeProfit,
                leverage,
                confidence: combinedConfidence,
                reason: `AI + Technical: ${technicalSignal.signals.join(', ')}`
            });
        });

        // Also look for strong technical signals even without AI recommendations
        coinAnalyses.forEach(ca => {
            const signal = ca.technicalSignal;

            if (signal.signal === 'STRONG_BUY' || signal.signal === 'STRONG_SELL') {
                // Check if we already have this from AI
                const alreadyIncluded = opportunities.find(o => o.symbol === ca.coin.symbol);
                if (alreadyIncluded) return;

                const direction = signal.signal === 'STRONG_BUY' ? 'LONG' : 'SHORT';
                const currentPrice = ca.coin.price;

                // Calculate stop loss and take profit based on ATR
                const atr = ca.indicators.atr || currentPrice * 0.02;
                const stopLoss = direction === 'LONG'
                    ? currentPrice - (atr * 2)
                    : currentPrice + (atr * 2);
                const takeProfit = direction === 'LONG'
                    ? currentPrice + (atr * 3)
                    : currentPrice - (atr * 3);

                opportunities.push({
                    symbol: ca.coin.symbol,
                    direction,
                    entryPrice: currentPrice,
                    stopLoss,
                    takeProfit,
                    leverage: Math.min(5, this.config.maxLeverage), // Conservative leverage for technical-only trades
                    confidence: signal.confidence,
                    reason: `Technical only: ${signal.signals.join(', ')}`
                });
            }
        });

        // Sort by confidence
        return opportunities.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Update all positions with current prices
     */
    updatePositions(marketData) {
        const currentPrices = {};
        marketData.forEach(coin => {
            currentPrices[coin.symbol] = coin.price;
        });

        const triggers = this.tradingEngine.updateAllPositions(currentPrices);

        // Handle triggers (stop loss, take profit, liquidation)
        triggers.forEach(trigger => {
            const position = this.tradingEngine.getPosition(trigger.positionId);
            if (!position) return;

            const exitPrice = trigger.liquidationPrice || position.currentPrice;

            try {
                const closedTrade = this.tradingEngine.closePosition(trigger.positionId, exitPrice);

                let message = '';
                if (trigger.action === 'STOP_LOSS') {
                    message = `Stop loss triggered for ${position.symbol} at $${exitPrice.toFixed(2)}`;
                } else if (trigger.action === 'TAKE_PROFIT') {
                    message = `Take profit triggered for ${position.symbol} at $${exitPrice.toFixed(2)}`;
                } else if (trigger.action === 'LIQUIDATION') {
                    message = `Position liquidated for ${position.symbol} at $${exitPrice.toFixed(2)}`;
                }

                this.log(message, closedTrade.totalPnL > 0 ? 'success' : 'error');
            } catch (error) {
                console.error('Error closing position:', error);
            }
        });
    }

    /**
     * Display analysis in UI
     */
    displayAnalysis(analysis) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('aiAnalysis', { detail: analysis }));
        }
    }

    /**
     * Log bot activity
     */
    log(message, type = 'info') {
        const logEntry = {
            timestamp: Date.now(),
            message,
            type
        };

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('botLog', { detail: logEntry }));
        }

        console.log(`[TradingBot] ${message}`);
    }

    /**
     * Get bot status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastAnalysisTime: this.lastAnalysisTime,
            config: this.config,
            analysisCount: this.analysisHistory.length
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Restart interval if running and interval changed
        if (this.isRunning && newConfig.analysisInterval && this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => {
                this.runAnalysis();
            }, this.config.analysisInterval);
        }
    }

    /**
     * Get latest analysis
     */
    getLatestAnalysis() {
        return this.analysisHistory[this.analysisHistory.length - 1] || null;
    }
}
