/**
 * LLM Service - Multi-Provider Support
 * Supports DeepSeek, OpenRouter, Groq, Together.ai, and local Ollama
 */

export class LLMService {
    constructor(config = {}) {
        this.provider = config.provider || 'deepseek'; // deepseek, openrouter, groq, together, ollama
        this.apiKey = config.apiKey || '';
        this.model = config.model || this.getDefaultModel();
        this.baseUrl = this.getBaseUrl();
    }

    /**
     * Get base URL for the selected provider
     */
    getBaseUrl() {
        const urls = {
            deepseek: 'https://api.deepseek.com',
            openrouter: 'https://openrouter.ai/api/v1',
            groq: 'https://api.groq.com/openai/v1',
            together: 'https://api.together.xyz/v1',
            ollama: 'http://localhost:11434/v1' // Local Ollama server
        };
        return urls[this.provider] || urls.deepseek;
    }

    /**
     * Get default model for the provider
     */
    getDefaultModel() {
        const models = {
            deepseek: 'deepseek-chat',
            openrouter: 'deepseek/deepseek-chat', // DeepSeek Chat - FREE on OpenRouter!
            groq: 'llama-3.3-70b-versatile', // Fast and free
            together: 'meta-llama/Llama-3-70b-chat-hf',
            ollama: 'deepseek-r1:7b' // Local model
        };
        return models[this.provider] || models.deepseek;
    }

    /**
     * Analyze market conditions and provide trading recommendations
     */
    async analyzeMarket(marketData, historicalData, technicalIndicators, globalData, newsContext = null) {
        const prompt = this.buildMarketAnalysisPrompt(
            marketData,
            historicalData,
            technicalIndicators,
            globalData,
            newsContext
        );

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add authorization based on provider
            if (this.provider === 'openrouter') {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                headers['HTTP-Referer'] = window.location.href;
                headers['X-Title'] = 'DeepSeek Crypto Trader';
            } else if (this.provider !== 'ollama') {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert cryptocurrency trading analyst with deep knowledge of:
- Technical analysis patterns (Head & Shoulders, Double Top/Bottom, Triangles, Flags, Wedges)
- Market sentiment analysis
- Risk management and position sizing
- Leverage trading strategies
- Global economic events impact on crypto markets
- On-chain metrics and blockchain fundamentals

Provide concise, actionable trading recommendations based on data analysis.
Always include risk assessment and position management advice.
Be aware of the 24/7 nature of crypto markets and higher volatility compared to traditional markets.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`${this.provider} API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return this.parseAnalysisResponse(data.choices[0].message.content);
        } catch (error) {
            console.error(`Error analyzing market with ${this.provider}:`, error);
            throw error;
        }
    }

    /**
     * Build comprehensive market analysis prompt
     */
    buildMarketAnalysisPrompt(marketData, historicalData, indicators, globalData, newsContext) {
        const recentPrices = historicalData.slice(-20).map(d => d.close);
        const priceChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100).toFixed(2);

        let prompt = `# Cryptocurrency Market Analysis Request

## Current Market Conditions

`;

        // Add data for each coin
        marketData.forEach(coin => {
            prompt += `### ${coin.name} (${coin.symbol})
- Current Price: $${coin.price.toFixed(2)}
- 24h Change: ${coin.change24h.toFixed(2)}%
- 24h Volume: $${(coin.volume24h / 1e9).toFixed(2)}B
- Market Cap: $${(coin.marketCap / 1e9).toFixed(2)}B

`;
        });

        // Add technical indicators
        prompt += `## Technical Indicators\n\n`;
        if (indicators.sma20) prompt += `- SMA(20): $${indicators.sma20.toFixed(2)}\n`;
        if (indicators.sma50) prompt += `- SMA(50): $${indicators.sma50.toFixed(2)}\n`;
        if (indicators.rsi) prompt += `- RSI(14): ${indicators.rsi.toFixed(2)} ${indicators.rsi > 70 ? '(Overbought)' : indicators.rsi < 30 ? '(Oversold)' : '(Neutral)'}\n`;
        if (indicators.macd) prompt += `- MACD: ${indicators.macd.value.toFixed(2)}, Signal: ${indicators.macd.signal.toFixed(2)}, Histogram: ${indicators.macd.histogram.toFixed(2)}\n`;
        if (indicators.bbands) prompt += `- Bollinger Bands: Upper: $${indicators.bbands.upper.toFixed(2)}, Middle: $${indicators.bbands.middle.toFixed(2)}, Lower: $${indicators.bbands.lower.toFixed(2)}\n`;
        if (indicators.patterns) prompt += `- Detected Patterns: ${indicators.patterns.join(', ')}\n`;

        prompt += `\n## Price Movement
- Recent ${historicalData.length}-period change: ${priceChange}%
- Current trend: ${priceChange > 0 ? 'Upward' : 'Downward'}

`;

        // Add global market context
        if (globalData) {
            prompt += `## Global Market Context
- Total Market Cap: $${(globalData.totalMarketCap / 1e12).toFixed(2)}T
- 24h Volume: $${(globalData.total24hVolume / 1e9).toFixed(2)}B
- BTC Dominance: ${globalData.btcDominance.toFixed(2)}%
- Market Cap Change 24h: ${globalData.marketCapChange24h.toFixed(2)}%

`;
        }

        // Add news context if available
        if (newsContext) {
            prompt += `## Recent Market News & Events
${newsContext}

`;
        }

        prompt += `## Analysis Request

Based on the above data, provide:

1. **Market Sentiment**: Current market sentiment (Bullish/Bearish/Neutral) with reasoning
2. **Trading Opportunities**: Identify the top 2-3 coins with best trading potential
3. **Position Recommendations**: For each opportunity, specify:
   - Direction (LONG/SHORT)
   - Recommended leverage (1x-10x)
   - Entry price range
   - Take profit targets
   - Stop loss levels
   - Position size recommendation (% of capital)
4. **Risk Assessment**: Key risks and market conditions to monitor
5. **Time Horizon**: Expected duration for positions (short-term/medium-term)

Format your response in a clear, structured way that can be easily parsed for automated trading decisions.`;

        return prompt;
    }

    /**
     * Parse LLM response into structured trading signals
     */
    parseAnalysisResponse(content) {
        const analysis = {
            sentiment: this.extractSentiment(content),
            recommendations: this.extractRecommendations(content),
            risks: this.extractRisks(content),
            rawAnalysis: content,
            timestamp: Date.now()
        };

        return analysis;
    }

    /**
     * Extract market sentiment from analysis
     */
    extractSentiment(content) {
        const sentimentRegex = /(bullish|bearish|neutral)/gi;
        const matches = content.match(sentimentRegex);

        if (!matches) return 'neutral';

        const counts = {};
        matches.forEach(match => {
            const sentiment = match.toLowerCase();
            counts[sentiment] = (counts[sentiment] || 0) + 1;
        });

        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    /**
     * Extract trading recommendations from analysis
     */
    extractRecommendations(content) {
        const recommendations = [];

        const patterns = [
            /(?:LONG|BUY)\s+([A-Z]{3,4}).*?leverage[:\s]+(\d+)x.*?entry[:\s]+\$?([\d,.]+).*?(?:take\s*profit|tp)[:\s]+\$?([\d,.]+).*?(?:stop\s*loss|sl)[:\s]+\$?([\d,.]+)/gis,
            /(?:SHORT|SELL)\s+([A-Z]{3,4}).*?leverage[:\s]+(\d+)x.*?entry[:\s]+\$?([\d,.]+).*?(?:take\s*profit|tp)[:\s]+\$?([\d,.]+).*?(?:stop\s*loss|sl)[:\s]+\$?([\d,.]+)/gis
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                recommendations.push({
                    symbol: match[1],
                    direction: content.substring(match.index, match.index + 10).includes('LONG') ||
                              content.substring(match.index, match.index + 10).includes('BUY') ? 'LONG' : 'SHORT',
                    leverage: parseInt(match[2]) || 5,
                    entry: parseFloat(match[3].replace(/,/g, '')),
                    takeProfit: parseFloat(match[4].replace(/,/g, '')),
                    stopLoss: parseFloat(match[5].replace(/,/g, '')),
                    confidence: 0.7
                });
            }
        });

        return recommendations;
    }

    /**
     * Extract risk factors from analysis
     */
    extractRisks(content) {
        const risks = [];
        const riskSection = content.match(/risk.*?assessment[:\s]+(.*?)(?=\n\n|$)/is);

        if (riskSection && riskSection[1]) {
            const riskText = riskSection[1];
            const riskItems = riskText.split(/\n/).filter(line => line.trim().length > 0);
            risks.push(...riskItems.map(item => item.replace(/^[-*•]\s*/, '').trim()));
        }

        return risks;
    }

    /**
     * Validate API key
     */
    async validateApiKey() {
        // Ollama doesn't need validation
        if (this.provider === 'ollama') {
            try {
                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [{ role: 'user', content: 'test' }],
                        max_tokens: 5
                    })
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        }

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.provider === 'openrouter') {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                headers['HTTP-Referer'] = window.location.href;
            } else {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 5
                })
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            model: this.model,
            baseUrl: this.baseUrl
        };
    }
}
