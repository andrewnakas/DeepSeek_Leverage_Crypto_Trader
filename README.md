# DeepSeek Leverage Crypto Trader

An AI-powered cryptocurrency trading bot that uses DeepSeek LLM for market analysis and executes leveraged long/short positions in a fully simulated environment with real-time crypto market data.

## Features

### 🤖 AI-Powered Analysis
- **DeepSeek LLM Integration**: Advanced market analysis using DeepSeek's powerful language models
- **Intelligent Decision Making**: Combines AI insights with technical analysis for informed trading
- **Market Sentiment Analysis**: Real-time sentiment evaluation across multiple cryptocurrencies
- **World Events Awareness**: AI considers global economic and crypto-specific events

### 📊 Technical Analysis
- **Advanced Indicators**: RSI, MACD, Bollinger Bands, SMA, EMA, ATR
- **Pattern Detection**: Head & Shoulders, Double Top/Bottom, Triangles, Flags, Wedges
- **Support/Resistance Levels**: Automatic calculation of key price levels
- **Multi-Timeframe Analysis**: Comprehensive analysis across different time periods

### 💹 Leverage Trading Simulation
- **Realistic Simulation**: Uses actual fee structures from top exchanges (Binance/Bybit)
- **Leverage Support**: Up to 100x leverage (configurable)
- **Position Management**:
  - Long and Short positions
  - Stop Loss and Take Profit automation
  - Liquidation calculations
  - Funding fee simulation (0.01% per 8 hours)
- **Fee Structure**:
  - Maker Fee: 0.02%
  - Taker Fee: 0.055%
  - Funding Rate: 0.01% per 8 hours

### 📈 Real-Time Market Data
- **CoinGecko API Integration**: Real-time cryptocurrency prices and market data
- **Supported Cryptocurrencies**: BTC, ETH, BNB, SOL, ADA, XRP, DOT, DOGE
- **Live Price Charts**: Interactive charts with real-time updates
- **Market Overview**: Global market cap, volume, and dominance metrics

### 🎯 Risk Management
- **Configurable Risk**: Set risk percentage per trade
- **Position Sizing**: Automatic calculation based on risk parameters
- **Maximum Positions**: Limit concurrent open positions
- **Balance Protection**: Prevents over-leveraging and excessive risk

### 📱 User Interface
- **Modern Dark Theme**: Easy on the eyes for long trading sessions
- **Real-Time Updates**: Live portfolio tracking and position monitoring
- **Activity Log**: Detailed logging of all bot activities and trades
- **Trade History**: Complete history with P&L tracking
- **Portfolio Statistics**:
  - Current balance and equity
  - Total P&L and ROI
  - Win rate and trade count
  - Open positions overview

## Getting Started

### Prerequisites
- DeepSeek API Key (get one at [platform.deepseek.com](https://platform.deepseek.com))
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/andrewnakas/DeepSeek_Leverage_Crypto_Trader.git
   cd DeepSeek_Leverage_Crypto_Trader
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser
   - Or use a local server:
     ```bash
     python -m http.server 8000
     # Then visit http://localhost:8000
     ```

3. **Configure the bot**
   - Enter your DeepSeek API key
   - Set starting balance (default: $10,000 USDT)
   - Configure analysis interval (5, 15, 30, or 60 minutes)
   - Set maximum leverage (2x to 100x)
   - Set risk percentage per trade (1-25%)

4. **Start trading**
   - Click "Start Trading Bot"
   - Monitor AI analysis and trading activity
   - Watch your portfolio grow (or learn from losses!)

## Live Demo

Visit the live demo at: [https://andrewnakas.github.io/DeepSeek_Leverage_Crypto_Trader/](https://andrewnakas.github.io/DeepSeek_Leverage_Crypto_Trader/)

## Configuration

### Trading Intervals
- **5 minutes**: Very active trading, more analysis runs
- **15 minutes**: Balanced approach (recommended)
- **30 minutes**: Less frequent trading
- **60 minutes**: Long-term positions

### Leverage Settings
- **2x-5x**: Conservative, lower risk
- **10x**: Moderate risk (recommended for testing)
- **25x-50x**: Aggressive, higher risk
- **100x**: Extreme risk (not recommended)

### Risk Management
- **Risk per trade**: Percentage of balance to risk on each trade
- **Recommended**: 2-5% for sustainable growth
- **Aggressive**: 10-15% for faster gains (higher drawdown risk)

## How It Works

### 1. Market Analysis Cycle
Every configured interval, the bot:
1. Fetches real-time market data from CoinGecko
2. Calculates technical indicators (RSI, MACD, etc.)
3. Detects chart patterns
4. Sends comprehensive data to DeepSeek LLM
5. Receives AI-powered trading recommendations

### 2. Decision Making
The bot combines:
- **AI Analysis**: DeepSeek's market interpretation
- **Technical Signals**: Indicator-based signals
- **Risk Assessment**: Position sizing calculations
- **Confidence Scoring**: Only executes high-confidence trades

### 3. Trade Execution
When a opportunity is identified:
1. Validates position limits and available balance
2. Calculates optimal position size
3. Opens leveraged position (LONG or SHORT)
4. Sets stop loss and take profit levels
5. Monitors position in real-time

### 4. Position Management
Continuous monitoring for:
- **Stop Loss**: Automatic exit to limit losses
- **Take Profit**: Lock in profits at target levels
- **Liquidation**: Prevent total loss of margin
- **Funding Fees**: Applied every 8 hours

## Project Structure

```
DeepSeek_Leverage_Crypto_Trader/
├── index.html                      # Main UI
├── css/
│   └── styles.css                  # Styling
├── js/
│   ├── app.js                      # Main application logic
│   ├── cryptoDataService.js        # CoinGecko API integration
│   ├── deepseekService.js          # DeepSeek LLM integration
│   ├── tradingEngine.js            # Trading simulation engine
│   ├── tradingBot.js               # Bot decision logic
│   └── technicalAnalysis.js        # Technical indicators & patterns
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions deployment
└── README.md                       # This file
```

## Technical Details

### Trading Simulation
The trading engine simulates real leverage trading with:
- **Margin Calculation**: `margin = position_size / leverage`
- **P&L Calculation**: `pnl = (price_diff / entry_price) * position_size`
- **Liquidation Price**: Calculated based on maintenance margin
- **Fees**: Applied on both opening and closing positions

### Technical Indicators
- **RSI (14)**: Relative Strength Index for overbought/oversold conditions
- **MACD (12, 26, 9)**: Trend-following momentum indicator
- **Bollinger Bands (20, 2)**: Volatility and price level indicator
- **SMA/EMA**: Simple and Exponential Moving Averages
- **ATR (14)**: Average True Range for volatility measurement

### Pattern Recognition
Automated detection of:
- Head and Shoulders (Bearish)
- Inverse Head and Shoulders (Bullish)
- Double Top (Bearish)
- Double Bottom (Bullish)
- Ascending Triangle (Bullish)
- Descending Triangle (Bearish)
- Bullish/Bearish Flags

## Safety & Disclaimers

⚠️ **IMPORTANT DISCLAIMERS**:

1. **Simulation Only**: This is a SIMULATED trading environment. No real money is involved.
2. **Educational Purpose**: This bot is for educational and research purposes only.
3. **Not Financial Advice**: This tool does not provide financial advice. Always do your own research.
4. **High Risk**: Leverage trading is extremely risky. Never trade with money you can't afford to lose.
5. **Past Performance**: Simulated results do not guarantee future real-world performance.
6. **API Costs**: DeepSeek API calls may incur costs. Monitor your usage.

## Roadmap

- [ ] Additional exchanges integration (real trading)
- [ ] More cryptocurrencies support
- [ ] Advanced charting with TradingView integration
- [ ] Backtesting on historical data
- [ ] Strategy builder for custom trading strategies
- [ ] Portfolio diversification across multiple assets
- [ ] News sentiment analysis integration
- [ ] Mobile responsive improvements
- [ ] Export/import trading sessions
- [ ] Performance analytics dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **DeepSeek**: For providing the powerful LLM API
- **CoinGecko**: For free cryptocurrency market data API
- **Chart.js**: For beautiful and responsive charts
- **Binance & Bybit**: For fee structure reference

## Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing to the codebase

## Contact

For questions, suggestions, or issues, please open an issue on GitHub.

---

**Happy Trading!** 🚀📈

*Remember: This is a simulation. Learn, experiment, and understand the risks before considering real trading.*
