/**
 * Technical Analysis Module
 * Implements various technical indicators and pattern detection
 */

export class TechnicalAnalysis {
    /**
     * Calculate Simple Moving Average
     */
    static calculateSMA(data, period) {
        if (data.length < period) return null;

        const values = data.slice(-period);
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / period;
    }

    /**
     * Calculate Exponential Moving Average
     */
    static calculateEMA(data, period) {
        if (data.length < period) return null;

        const multiplier = 2 / (period + 1);
        let ema = this.calculateSMA(data.slice(0, period), period);

        for (let i = period; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
        }

        return ema;
    }

    /**
     * Calculate Relative Strength Index (RSI)
     */
    static calculateRSI(data, period = 14) {
        if (data.length < period + 1) return null;

        const changes = [];
        for (let i = 1; i < data.length; i++) {
            changes.push(data[i] - data[i - 1]);
        }

        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

        const avgGain = this.calculateSMA(gains.slice(-period), period);
        const avgLoss = this.calculateSMA(losses.slice(-period), period);

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    static calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (data.length < slowPeriod) return null;

        const fastEMA = this.calculateEMA(data, fastPeriod);
        const slowEMA = this.calculateEMA(data, slowPeriod);

        if (!fastEMA || !slowEMA) return null;

        const macdLine = fastEMA - slowEMA;

        // For signal line, we'd need to calculate EMA of MACD values
        // Simplified version here
        const signalLine = macdLine * 0.9; // Approximation
        const histogram = macdLine - signalLine;

        return {
            value: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(data, period = 20, stdDev = 2) {
        if (data.length < period) return null;

        const sma = this.calculateSMA(data, period);
        const values = data.slice(-period);

        // Calculate standard deviation
        const squaredDiffs = values.map(val => Math.pow(val - sma, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
        const standardDeviation = Math.sqrt(variance);

        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    /**
     * Calculate Average True Range (ATR)
     */
    static calculateATR(ohlcData, period = 14) {
        if (ohlcData.length < period + 1) return null;

        const trueRanges = [];
        for (let i = 1; i < ohlcData.length; i++) {
            const high = ohlcData[i].high;
            const low = ohlcData[i].low;
            const prevClose = ohlcData[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        return this.calculateSMA(trueRanges.slice(-period), period);
    }

    /**
     * Detect chart patterns
     */
    static detectPatterns(ohlcData) {
        const patterns = [];

        if (ohlcData.length < 20) return patterns;

        // Detect Head and Shoulders
        if (this.isHeadAndShoulders(ohlcData)) {
            patterns.push('Head and Shoulders (Bearish)');
        }

        // Detect Inverse Head and Shoulders
        if (this.isInverseHeadAndShoulders(ohlcData)) {
            patterns.push('Inverse Head and Shoulders (Bullish)');
        }

        // Detect Double Top
        if (this.isDoubleTop(ohlcData)) {
            patterns.push('Double Top (Bearish)');
        }

        // Detect Double Bottom
        if (this.isDoubleBottom(ohlcData)) {
            patterns.push('Double Bottom (Bullish)');
        }

        // Detect Triangle patterns
        const trianglePattern = this.detectTriangle(ohlcData);
        if (trianglePattern) {
            patterns.push(trianglePattern);
        }

        // Detect Flag patterns
        const flagPattern = this.detectFlag(ohlcData);
        if (flagPattern) {
            patterns.push(flagPattern);
        }

        return patterns;
    }

    /**
     * Detect Head and Shoulders pattern
     */
    static isHeadAndShoulders(data) {
        if (data.length < 15) return false;

        const recent = data.slice(-15);
        const highs = recent.map(d => d.high);

        // Find three peaks
        const peaks = this.findPeaks(highs);
        if (peaks.length < 3) return false;

        const [leftShoulder, head, rightShoulder] = peaks.slice(-3);

        // Head should be higher than shoulders
        // Shoulders should be roughly equal
        const shoulderTolerance = 0.03; // 3% tolerance
        const shouldersEqual = Math.abs(leftShoulder - rightShoulder) / leftShoulder < shoulderTolerance;
        const headHigher = head > leftShoulder && head > rightShoulder;

        return shouldersEqual && headHigher;
    }

    /**
     * Detect Inverse Head and Shoulders pattern
     */
    static isInverseHeadAndShoulders(data) {
        if (data.length < 15) return false;

        const recent = data.slice(-15);
        const lows = recent.map(d => d.low);

        // Find three troughs
        const troughs = this.findTroughs(lows);
        if (troughs.length < 3) return false;

        const [leftShoulder, head, rightShoulder] = troughs.slice(-3);

        const shoulderTolerance = 0.03;
        const shouldersEqual = Math.abs(leftShoulder - rightShoulder) / leftShoulder < shoulderTolerance;
        const headLower = head < leftShoulder && head < rightShoulder;

        return shouldersEqual && headLower;
    }

    /**
     * Detect Double Top pattern
     */
    static isDoubleTop(data) {
        if (data.length < 10) return false;

        const recent = data.slice(-10);
        const highs = recent.map(d => d.high);
        const peaks = this.findPeaks(highs);

        if (peaks.length < 2) return false;

        const [peak1, peak2] = peaks.slice(-2);
        const tolerance = 0.02; // 2% tolerance

        return Math.abs(peak1 - peak2) / peak1 < tolerance;
    }

    /**
     * Detect Double Bottom pattern
     */
    static isDoubleBottom(data) {
        if (data.length < 10) return false;

        const recent = data.slice(-10);
        const lows = recent.map(d => d.low);
        const troughs = this.findTroughs(lows);

        if (troughs.length < 2) return false;

        const [trough1, trough2] = troughs.slice(-2);
        const tolerance = 0.02;

        return Math.abs(trough1 - trough2) / trough1 < tolerance;
    }

    /**
     * Detect Triangle patterns (Ascending, Descending, Symmetrical)
     */
    static detectTriangle(data) {
        if (data.length < 10) return null;

        const recent = data.slice(-10);
        const highs = recent.map(d => d.high);
        const lows = recent.map(d => d.low);

        const highTrend = this.calculateTrend(highs);
        const lowTrend = this.calculateTrend(lows);

        // Ascending Triangle: flat top, rising bottom
        if (Math.abs(highTrend) < 0.001 && lowTrend > 0.002) {
            return 'Ascending Triangle (Bullish)';
        }

        // Descending Triangle: falling top, flat bottom
        if (highTrend < -0.002 && Math.abs(lowTrend) < 0.001) {
            return 'Descending Triangle (Bearish)';
        }

        // Symmetrical Triangle: converging lines
        if (highTrend < -0.001 && lowTrend > 0.001) {
            return 'Symmetrical Triangle (Neutral)';
        }

        return null;
    }

    /**
     * Detect Flag patterns
     */
    static detectFlag(data) {
        if (data.length < 15) return null;

        const recent = data.slice(-15);
        const closes = recent.map(d => d.close);

        // Strong move followed by consolidation
        const firstHalf = closes.slice(0, 7);
        const secondHalf = closes.slice(7);

        const firstTrend = this.calculateTrend(firstHalf);
        const secondTrend = this.calculateTrend(secondHalf);

        // Bullish Flag: strong uptrend followed by slight downtrend/consolidation
        if (firstTrend > 0.03 && secondTrend < 0.01 && secondTrend > -0.02) {
            return 'Bullish Flag';
        }

        // Bearish Flag: strong downtrend followed by slight uptrend/consolidation
        if (firstTrend < -0.03 && secondTrend > -0.01 && secondTrend < 0.02) {
            return 'Bearish Flag';
        }

        return null;
    }

    /**
     * Find peaks in data
     */
    static findPeaks(data) {
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                peaks.push(data[i]);
            }
        }
        return peaks;
    }

    /**
     * Find troughs in data
     */
    static findTroughs(data) {
        const troughs = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
                troughs.push(data[i]);
            }
        }
        return troughs;
    }

    /**
     * Calculate trend (slope) of data
     */
    static calculateTrend(data) {
        if (data.length < 2) return 0;

        const n = data.length;
        const xSum = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
        const ySum = data.reduce((acc, val) => acc + val, 0);
        const xySum = data.reduce((acc, val, i) => acc + (val * i), 0);
        const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);

        return slope / data[0]; // Normalize by first value
    }

    /**
     * Calculate support and resistance levels
     */
    static calculateSupportResistance(ohlcData, periods = 20) {
        if (ohlcData.length < periods) return null;

        const recent = ohlcData.slice(-periods);
        const highs = recent.map(d => d.high);
        const lows = recent.map(d => d.low);

        const peaks = this.findPeaks(highs);
        const troughs = this.findTroughs(lows);

        return {
            resistance: peaks.length > 0 ? Math.max(...peaks) : null,
            support: troughs.length > 0 ? Math.min(...troughs) : null
        };
    }

    /**
     * Calculate all indicators for a given dataset
     */
    static calculateAllIndicators(ohlcData) {
        const closes = ohlcData.map(d => d.close);

        return {
            sma20: this.calculateSMA(closes, 20),
            sma50: this.calculateSMA(closes, 50),
            ema12: this.calculateEMA(closes, 12),
            ema26: this.calculateEMA(closes, 26),
            rsi: this.calculateRSI(closes, 14),
            macd: this.calculateMACD(closes),
            bbands: this.calculateBollingerBands(closes),
            atr: this.calculateATR(ohlcData),
            patterns: this.detectPatterns(ohlcData),
            supportResistance: this.calculateSupportResistance(ohlcData)
        };
    }

    /**
     * Generate trading signal based on indicators
     */
    static generateSignal(indicators, currentPrice) {
        let score = 0;
        const signals = [];

        // RSI signals
        if (indicators.rsi) {
            if (indicators.rsi < 30) {
                score += 2;
                signals.push('RSI oversold - bullish signal');
            } else if (indicators.rsi > 70) {
                score -= 2;
                signals.push('RSI overbought - bearish signal');
            }
        }

        // Moving Average signals
        if (indicators.sma20 && indicators.sma50) {
            if (indicators.sma20 > indicators.sma50) {
                score += 1;
                signals.push('Golden cross - bullish');
            } else {
                score -= 1;
                signals.push('Death cross - bearish');
            }
        }

        // MACD signals
        if (indicators.macd) {
            if (indicators.macd.histogram > 0) {
                score += 1;
                signals.push('MACD positive - bullish');
            } else {
                score -= 1;
                signals.push('MACD negative - bearish');
            }
        }

        // Bollinger Bands signals
        if (indicators.bbands) {
            if (currentPrice < indicators.bbands.lower) {
                score += 1;
                signals.push('Price below lower BB - bullish');
            } else if (currentPrice > indicators.bbands.upper) {
                score -= 1;
                signals.push('Price above upper BB - bearish');
            }
        }

        // Pattern signals
        if (indicators.patterns) {
            indicators.patterns.forEach(pattern => {
                if (pattern.includes('Bullish') || pattern.includes('Bottom') || pattern.includes('Inverse')) {
                    score += 2;
                    signals.push(`Pattern: ${pattern}`);
                } else if (pattern.includes('Bearish') || pattern.includes('Top')) {
                    score -= 2;
                    signals.push(`Pattern: ${pattern}`);
                }
            });
        }

        // Determine overall signal
        let signal = 'NEUTRAL';
        if (score >= 3) signal = 'STRONG_BUY';
        else if (score >= 1) signal = 'BUY';
        else if (score <= -3) signal = 'STRONG_SELL';
        else if (score <= -1) signal = 'SELL';

        return {
            signal,
            score,
            signals,
            confidence: Math.min(Math.abs(score) / 10, 1)
        };
    }
}
