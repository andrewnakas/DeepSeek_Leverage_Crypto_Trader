/**
 * Trading Simulation Engine
 * Handles simulated trading with leverage, fees, and position management
 */

export class TradingEngine {
    constructor(initialBalance = 10000) {
        this.initialBalance = initialBalance;
        this.balance = initialBalance;
        this.positions = [];
        this.tradeHistory = [];
        this.totalTrades = 0;
        this.winningTrades = 0;
        this.losingTrades = 0;

        // Fee structure (based on Binance/Bybit futures)
        this.fees = {
            maker: 0.0002, // 0.02%
            taker: 0.00055, // 0.055%
            funding: 0.0001 // 0.01% funding rate per 8 hours
        };

        // Risk management
        this.maxPositions = 5;
        this.maxLeverage = 100;
    }

    /**
     * Open a new position
     */
    openPosition(symbol, direction, entryPrice, size, leverage, stopLoss = null, takeProfit = null) {
        // Validate inputs
        if (leverage > this.maxLeverage) {
            throw new Error(`Leverage cannot exceed ${this.maxLeverage}x`);
        }

        if (this.positions.length >= this.maxPositions) {
            throw new Error(`Maximum ${this.maxPositions} positions allowed`);
        }

        // Calculate position details
        const margin = size / leverage;
        const openFee = size * this.fees.taker; // Assume taker fee when opening

        // Check if enough balance
        const requiredBalance = margin + openFee;
        if (requiredBalance > this.balance) {
            throw new Error('Insufficient balance');
        }

        // Create position
        const position = {
            id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol,
            direction, // 'LONG' or 'SHORT'
            entryPrice,
            currentPrice: entryPrice,
            size,
            leverage,
            margin,
            openFee,
            stopLoss,
            takeProfit,
            unrealizedPnL: 0,
            fundingFeesPaid: 0,
            openTime: Date.now(),
            lastFundingTime: Date.now()
        };

        // Update balance
        this.balance -= requiredBalance;

        // Add to positions
        this.positions.push(position);

        // Log trade
        this.logTrade('OPEN', position);

        return position;
    }

    /**
     * Close a position
     */
    closePosition(positionId, exitPrice) {
        const positionIndex = this.positions.findIndex(p => p.id === positionId);
        if (positionIndex === -1) {
            throw new Error('Position not found');
        }

        const position = this.positions[positionIndex];

        // Calculate P&L
        const pnl = this.calculatePnL(position, exitPrice);
        const closeFee = position.size * this.fees.taker;

        // Calculate total P&L including fees
        const totalPnL = pnl - closeFee;

        // Update balance (return margin + P&L)
        this.balance += position.margin + totalPnL;

        // Update statistics
        this.totalTrades++;
        if (totalPnL > 0) {
            this.winningTrades++;
        } else {
            this.losingTrades++;
        }

        // Add to trade history
        const closedTrade = {
            ...position,
            exitPrice,
            exitTime: Date.now(),
            closeFee,
            realizedPnL: pnl,
            totalPnL,
            duration: Date.now() - position.openTime,
            roi: (totalPnL / position.margin) * 100
        };

        this.tradeHistory.push(closedTrade);

        // Remove from active positions
        this.positions.splice(positionIndex, 1);

        // Log trade
        this.logTrade('CLOSE', closedTrade);

        return closedTrade;
    }

    /**
     * Update position with current price
     */
    updatePosition(positionId, currentPrice) {
        const position = this.positions.find(p => p.id === positionId);
        if (!position) {
            throw new Error('Position not found');
        }

        position.currentPrice = currentPrice;
        position.unrealizedPnL = this.calculatePnL(position, currentPrice);

        // Apply funding fees (every 8 hours)
        const timeSinceLastFunding = Date.now() - position.lastFundingTime;
        const fundingInterval = 8 * 60 * 60 * 1000; // 8 hours in ms

        if (timeSinceLastFunding >= fundingInterval) {
            const fundingFee = position.size * this.fees.funding;
            position.fundingFeesPaid += fundingFee;
            position.unrealizedPnL -= fundingFee;
            position.lastFundingTime = Date.now();
        }

        // Check stop loss and take profit
        if (position.stopLoss) {
            const shouldTriggerStopLoss = position.direction === 'LONG'
                ? currentPrice <= position.stopLoss
                : currentPrice >= position.stopLoss;

            if (shouldTriggerStopLoss) {
                return { action: 'STOP_LOSS', positionId: position.id };
            }
        }

        if (position.takeProfit) {
            const shouldTriggerTakeProfit = position.direction === 'LONG'
                ? currentPrice >= position.takeProfit
                : currentPrice <= position.takeProfit;

            if (shouldTriggerTakeProfit) {
                return { action: 'TAKE_PROFIT', positionId: position.id };
            }
        }

        return null;
    }

    /**
     * Calculate P&L for a position
     */
    calculatePnL(position, currentPrice) {
        const priceDiff = position.direction === 'LONG'
            ? currentPrice - position.entryPrice
            : position.entryPrice - currentPrice;

        const pnl = (priceDiff / position.entryPrice) * position.size;

        return pnl;
    }

    /**
     * Calculate liquidation price
     */
    calculateLiquidationPrice(position) {
        // Simplified liquidation calculation
        // Liquidation occurs when losses equal margin (minus maintenance margin)
        const maintenanceMarginRate = 0.005; // 0.5%
        const maintenanceMargin = position.size * maintenanceMarginRate;
        const maxLoss = position.margin - maintenanceMargin;

        const lossPercentage = maxLoss / position.size;

        if (position.direction === 'LONG') {
            return position.entryPrice * (1 - lossPercentage);
        } else {
            return position.entryPrice * (1 + lossPercentage);
        }
    }

    /**
     * Check for liquidations
     */
    checkLiquidations(currentPrices) {
        const liquidated = [];

        this.positions.forEach(position => {
            const currentPrice = currentPrices[position.symbol];
            if (!currentPrice) return;

            const liquidationPrice = this.calculateLiquidationPrice(position);

            const isLiquidated = position.direction === 'LONG'
                ? currentPrice <= liquidationPrice
                : currentPrice >= liquidationPrice;

            if (isLiquidated) {
                liquidated.push({
                    positionId: position.id,
                    liquidationPrice
                });
            }
        });

        return liquidated;
    }

    /**
     * Update all positions with current prices
     */
    updateAllPositions(currentPrices) {
        const triggers = [];

        this.positions.forEach(position => {
            const currentPrice = currentPrices[position.symbol];
            if (!currentPrice) return;

            const trigger = this.updatePosition(position.id, currentPrice);
            if (trigger) {
                triggers.push(trigger);
            }
        });

        // Check for liquidations
        const liquidations = this.checkLiquidations(currentPrices);
        liquidations.forEach(liq => {
            triggers.push({
                action: 'LIQUIDATION',
                positionId: liq.positionId,
                liquidationPrice: liq.liquidationPrice
            });
        });

        return triggers;
    }

    /**
     * Get portfolio statistics
     */
    getPortfolioStats() {
        const totalPnL = this.balance - this.initialBalance;
        const roi = (totalPnL / this.initialBalance) * 100;

        const totalUnrealizedPnL = this.positions.reduce(
            (sum, pos) => sum + pos.unrealizedPnL,
            0
        );

        const equity = this.balance + totalUnrealizedPnL;

        return {
            balance: this.balance,
            equity,
            initialBalance: this.initialBalance,
            totalPnL,
            roi,
            totalTrades: this.totalTrades,
            winningTrades: this.winningTrades,
            losingTrades: this.losingTrades,
            winRate: this.totalTrades > 0 ? (this.winningTrades / this.totalTrades) * 100 : 0,
            openPositions: this.positions.length,
            unrealizedPnL: totalUnrealizedPnL
        };
    }

    /**
     * Get position by ID
     */
    getPosition(positionId) {
        return this.positions.find(p => p.id === positionId);
    }

    /**
     * Get all open positions
     */
    getOpenPositions() {
        return [...this.positions];
    }

    /**
     * Get trade history
     */
    getTradeHistory(limit = 50) {
        return this.tradeHistory.slice(-limit).reverse();
    }

    /**
     * Calculate optimal position size based on risk
     */
    calculatePositionSize(accountBalance, riskPercentage, entryPrice, stopLossPrice, leverage) {
        // Risk amount
        const riskAmount = accountBalance * (riskPercentage / 100);

        // Price risk per unit
        const priceRisk = Math.abs(entryPrice - stopLossPrice) / entryPrice;

        // Position size based on risk
        const positionSize = riskAmount / priceRisk;

        // Adjust for leverage
        const leveragedSize = Math.min(positionSize * leverage, accountBalance * leverage * 0.95);

        return leveragedSize;
    }

    /**
     * Log trade activity
     */
    logTrade(type, trade) {
        const log = {
            type,
            timestamp: Date.now(),
            trade: {
                symbol: trade.symbol,
                direction: trade.direction,
                entryPrice: trade.entryPrice,
                exitPrice: trade.exitPrice,
                size: trade.size,
                leverage: trade.leverage,
                pnl: trade.totalPnL || 0
            }
        };

        // This will be picked up by the UI
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tradeLog', { detail: log }));
        }
    }

    /**
     * Reset trading engine
     */
    reset(initialBalance = null) {
        if (initialBalance) {
            this.initialBalance = initialBalance;
        }

        this.balance = this.initialBalance;
        this.positions = [];
        this.tradeHistory = [];
        this.totalTrades = 0;
        this.winningTrades = 0;
        this.losingTrades = 0;
    }

    /**
     * Export state for persistence
     */
    exportState() {
        return {
            initialBalance: this.initialBalance,
            balance: this.balance,
            positions: this.positions,
            tradeHistory: this.tradeHistory,
            totalTrades: this.totalTrades,
            winningTrades: this.winningTrades,
            losingTrades: this.losingTrades
        };
    }

    /**
     * Import state from persistence
     */
    importState(state) {
        this.initialBalance = state.initialBalance;
        this.balance = state.balance;
        this.positions = state.positions;
        this.tradeHistory = state.tradeHistory;
        this.totalTrades = state.totalTrades;
        this.winningTrades = state.winningTrades;
        this.losingTrades = state.losingTrades;
    }
}
