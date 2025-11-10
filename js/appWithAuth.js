/**
 * Main Application with Authentication
 * Extends the base app with password protection and API key encryption
 */

import { CryptoDataService } from './cryptoDataService.js';
import { LLMService } from './llmService.js';
import { TradingEngine } from './tradingEngine.js';
import { TradingBot } from './tradingBot.js';
import { AuthService } from './authService.js';

class App {
    constructor() {
        this.cryptoDataService = new CryptoDataService();
        this.llmService = null;
        this.tradingEngine = null;
        this.tradingBot = null;
        this.priceChart = null;
        this.authService = new AuthService();
        this.currentPassword = null;

        // UI Elements
        this.elements = {};

        // Price update interval
        this.priceUpdateInterval = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing DeepSeek Crypto Trading Bot with Authentication...');

        // Get UI elements
        this.cacheElements();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize authentication
        await this.initAuth();

        // Initialize chart
        this.initializeChart();

        console.log('Application initialized successfully');
    }

    /**
     * Initialize authentication
     */
    async initAuth() {
        const isAuthenticated = await this.authService.init();

        if (isAuthenticated) {
            // User has active session
            await this.showApp();
        } else if (this.authService.hasPasswordSetup()) {
            // Password set up, show login
            this.showLogin();
        } else {
            // First time, show password setup
            this.showPasswordSetup();
        }
    }

    /**
     * Show password setup form
     */
    showPasswordSetup() {
        this.elements.authModal.style.display = 'flex';
        this.elements.setupPasswordForm.style.display = 'block';
        this.elements.loginForm.style.display = 'none';
        this.elements.mainApp.style.display = 'none';
        this.elements.authError.classList.remove('show');
    }

    /**
     * Show login form
     */
    showLogin() {
        this.elements.authModal.style.display = 'flex';
        this.elements.setupPasswordForm.style.display = 'none';
        this.elements.loginForm.style.display = 'block';
        this.elements.mainApp.style.display = 'none';
        this.elements.authError.classList.remove('show');
    }

    /**
     * Show main app
     */
    async showApp() {
        this.elements.authModal.style.display = 'none';
        this.elements.mainApp.style.display = 'block';

        // Load saved state and encrypted API keys
        await this.loadState();

        // Update UI
        this.updateUI();
    }

    /**
     * Show authentication error
     */
    showAuthError(message) {
        this.elements.authError.textContent = message;
        this.elements.authError.classList.add('show');
    }

    /**
     * Handle password setup
     */
    async handlePasswordSetup() {
        const password = this.elements.setupPassword.value;
        const confirmPassword = this.elements.setupPasswordConfirm.value;

        if (!password || password.length < 6) {
            this.showAuthError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthError('Passwords do not match');
            return;
        }

        try {
            await this.authService.setupPassword(password);
            this.currentPassword = password;
            await this.showApp();
        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        const password = this.elements.loginPassword.value;

        if (!password) {
            this.showAuthError('Please enter your password');
            return;
        }

        try {
            await this.authService.authenticate(password);
            this.currentPassword = password;
            await this.showApp();
        } catch (error) {
            this.showAuthError(error.message);
        }
    }

    /**
     * Handle lock
     */
    handleLock() {
        this.authService.lock();
        this.currentPassword = null;

        // Stop bot if running
        if (this.tradingBot && this.tradingBot.isRunning) {
            this.stopBot();
        }

        this.showLogin();
    }

    /**
     * Handle forgot password
     */
    handleForgotPassword() {
        if (confirm('This will delete all saved data including encrypted API keys. Continue?')) {
            this.authService.reset();
            // Clear all stored API keys
            const providers = ['deepseek', 'openrouter', 'groq', 'together'];
            providers.forEach(provider => {
                localStorage.removeItem(`api_key_${provider}`);
            });
            this.showPasswordSetup();
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Auth elements
            authModal: document.getElementById('auth-modal'),
            mainApp: document.getElementById('main-app'),
            setupPasswordForm: document.getElementById('setup-password-form'),
            loginForm: document.getElementById('login-form'),
            setupPassword: document.getElementById('setup-password'),
            setupPasswordConfirm: document.getElementById('setup-password-confirm'),
            setupPasswordBtn: document.getElementById('setup-password-btn'),
            loginPassword: document.getElementById('login-password'),
            loginBtn: document.getElementById('login-btn'),
            forgotPasswordBtn: document.getElementById('forgot-password-btn'),
            lockBtn: document.getElementById('lock-btn'),
            authError: document.getElementById('auth-error'),

            // Config inputs
            llmProvider: document.getElementById('llm-provider'),
            apiKey: document.getElementById('api-key'),
            saveApiKey: document.getElementById('save-api-key'),
            providerInfo: document.getElementById('provider-info'),
            providerLink: document.getElementById('provider-link'),
            apiKeyHelp: document.getElementById('api-key-help'),
            startingBalance: document.getElementById('starting-balance'),
            tradingInterval: document.getElementById('trading-interval'),
            maxLeverage: document.getElementById('max-leverage'),
            riskPercentage: document.getElementById('risk-percentage'),

            // Buttons
            startBtn: document.getElementById('start-bot'),
            stopBtn: document.getElementById('stop-bot'),

            // Stats
            currentBalance: document.getElementById('current-balance'),
            balanceChange: document.getElementById('balance-change'),
            openPositions: document.getElementById('open-positions'),
            totalTrades: document.getElementById('total-trades'),
            winRate: document.getElementById('win-rate'),
            totalPnL: document.getElementById('total-pnl'),
            roi: document.getElementById('roi'),

            // Containers
            positionsContainer: document.getElementById('positions-container'),
            activityLog: document.getElementById('activity-log'),
            aiAnalysis: document.getElementById('ai-analysis'),
            tradeHistoryBody: document.getElementById('trade-history-body')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Auth event listeners
        this.elements.setupPasswordBtn.addEventListener('click', () => this.handlePasswordSetup());
        this.elements.loginBtn.addEventListener('click', () => this.handleLogin());
        this.elements.forgotPasswordBtn.addEventListener('click', () => this.handleForgotPassword());
        this.elements.lockBtn.addEventListener('click', () => this.handleLock());

        // Enter key support for password fields
        this.elements.setupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elements.setupPasswordConfirm.focus();
        });
        this.elements.setupPasswordConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handlePasswordSetup();
        });
        this.elements.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Provider selection change
        this.elements.llmProvider.addEventListener('change', async () => {
            this.updateProviderInfo();
            await this.loadApiKeyForProvider();
        });

        // Start button
        this.elements.startBtn.addEventListener('click', () => this.startBot());

        // Stop button
        this.elements.stopBtn.addEventListener('click', () => this.stopBot());

        // Bot events
        window.addEventListener('botLog', (e) => this.addLogEntry(e.detail));
        window.addEventListener('tradeLog', (e) => this.handleTradeLog(e.detail));
        window.addEventListener('aiAnalysis', (e) => this.displayAIAnalysis(e.detail));

        // Save state on changes
        this.elements.startingBalance.addEventListener('change', () => this.saveState());
        this.elements.llmProvider.addEventListener('change', () => this.saveState());

        // Initialize provider info
        this.updateProviderInfo();
    }

    /**
     * Load API key for selected provider
     */
    async loadApiKeyForProvider() {
        if (!this.currentPassword) return;

        const provider = this.elements.llmProvider.value;

        // Ollama doesn't need API key
        if (provider === 'ollama') {
            this.elements.apiKey.value = '';
            return;
        }

        try {
            const apiKey = await this.authService.loadEncryptedApiKey(provider, this.currentPassword);
            if (apiKey) {
                this.elements.apiKey.value = apiKey;
                this.addLogEntry({
                    message: `Loaded saved API key for ${provider}`,
                    type: 'info',
                    timestamp: Date.now()
                });
            } else {
                this.elements.apiKey.value = '';
            }
        } catch (error) {
            console.error('Error loading API key:', error);
            this.elements.apiKey.value = '';
        }
    }

    /**
     * Update provider information display
     */
    updateProviderInfo() {
        const provider = this.elements.llmProvider.value;
        const providerUrls = {
            deepseek: 'https://platform.deepseek.com',
            openrouter: 'https://openrouter.ai',
            groq: 'https://console.groq.com',
            together: 'https://together.ai',
            ollama: 'https://ollama.com'
        };

        const providerTexts = {
            deepseek: 'Get free 1M tokens at ',
            openrouter: 'Get FREE API key at ',
            groq: 'Get FREE API key at ',
            together: 'Get free credits at ',
            ollama: 'Install locally from '
        };

        const providerNames = {
            deepseek: 'platform.deepseek.com',
            openrouter: 'openrouter.ai',
            groq: 'console.groq.com',
            together: 'together.ai',
            ollama: 'ollama.com'
        };

        this.elements.providerLink.href = providerUrls[provider];
        this.elements.providerLink.textContent = providerNames[provider];
        this.elements.providerInfo.innerHTML = `${providerTexts[provider]}<a href="${providerUrls[provider]}" target="_blank">${providerNames[provider]}</a>`;

        // Update API key field
        if (provider === 'ollama') {
            this.elements.apiKey.disabled = true;
            this.elements.apiKey.placeholder = 'Not required for local Ollama';
            this.elements.apiKeyHelp.textContent = 'Run: ollama serve (then ollama pull deepseek-r1:7b)';
            this.elements.saveApiKey.disabled = true;
        } else {
            this.elements.apiKey.disabled = false;
            this.elements.apiKey.placeholder = 'sk-...';
            this.elements.apiKeyHelp.textContent = '🔒 API keys are encrypted and stored securely';
            this.elements.saveApiKey.disabled = false;
        }
    }

    /**
     * Initialize price chart
     */
    initializeChart() {
        const ctx = document.getElementById('price-chart').getContext('2d');

        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'BTC',
                        data: [],
                        borderColor: '#f7931a',
                        backgroundColor: 'rgba(247, 147, 26, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'ETH',
                        data: [],
                        borderColor: '#627eea',
                        backgroundColor: 'rgba(98, 126, 234, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'BNB',
                        data: [],
                        borderColor: '#f3ba2f',
                        backgroundColor: 'rgba(243, 186, 47, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#f1f5f9' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { color: '#475569' },
                        ticks: { color: '#cbd5e1' }
                    },
                    y: {
                        display: true,
                        grid: { color: '#475569' },
                        ticks: { color: '#cbd5e1' }
                    }
                }
            }
        });
    }

    /**
     * Start the trading bot
     */
    async startBot() {
        try {
            // Get provider and API key
            const provider = this.elements.llmProvider.value;
            const apiKey = this.elements.apiKey.value.trim();

            // Save encrypted API key if checkbox is checked
            if (provider !== 'ollama' && apiKey && this.elements.saveApiKey.checked && this.currentPassword) {
                try {
                    await this.authService.saveEncryptedApiKey(provider, apiKey, this.currentPassword);
                    this.addLogEntry({
                        message: `API key saved and encrypted for ${provider}`,
                        type: 'success',
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error('Error saving API key:', error);
                }
            }

            // Validate inputs (API key not needed for Ollama)
            if (provider !== 'ollama' && !apiKey) {
                this.addLogEntry({
                    message: `Please enter your ${provider} API key`,
                    type: 'error',
                    timestamp: Date.now()
                });
                return;
            }

            // Disable start button
            this.elements.startBtn.disabled = true;
            this.elements.startBtn.textContent = 'Starting...';

            // Initialize LLM service
            this.llmService = new LLMService({
                provider: provider,
                apiKey: apiKey
            });

            // Validate API connection
            this.addLogEntry({
                message: `Validating ${provider} connection...`,
                type: 'info',
                timestamp: Date.now()
            });

            const isValid = await this.llmService.validateApiKey();
            if (!isValid) {
                throw new Error(`Failed to connect to ${provider}. Please check your API key${provider === 'ollama' ? ' and ensure Ollama is running (ollama serve)' : ''}.`);
            }

            // Initialize trading engine
            const startingBalance = parseFloat(this.elements.startingBalance.value);
            this.tradingEngine = new TradingEngine(startingBalance);

            // Initialize trading bot
            const config = {
                analysisInterval: parseInt(this.elements.tradingInterval.value) * 60 * 1000,
                maxLeverage: parseInt(this.elements.maxLeverage.value),
                riskPercentage: parseFloat(this.elements.riskPercentage.value),
                enableAutoTrading: true
            };

            this.tradingBot = new TradingBot(
                this.llmService,
                this.cryptoDataService,
                this.tradingEngine,
                config
            );

            // Start the bot
            await this.tradingBot.start();

            // Update UI
            this.elements.startBtn.disabled = true;
            this.elements.startBtn.textContent = 'Running';
            this.elements.stopBtn.disabled = false;

            // Start price updates
            this.startPriceUpdates();

            this.addLogEntry({
                message: 'Trading bot started successfully! 🚀',
                type: 'success',
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error starting bot:', error);
            this.addLogEntry({
                message: `Error: ${error.message}`,
                type: 'error',
                timestamp: Date.now()
            });

            // Re-enable start button
            this.elements.startBtn.disabled = false;
            this.elements.startBtn.textContent = 'Start Trading Bot';
        }
    }

    /**
     * Stop the trading bot
     */
    stopBot() {
        if (this.tradingBot) {
            this.tradingBot.stop();
        }

        // Stop price updates
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }

        // Update UI
        this.elements.startBtn.disabled = false;
        this.elements.startBtn.textContent = 'Start Trading Bot';
        this.elements.stopBtn.disabled = true;

        this.addLogEntry({
            message: 'Trading bot stopped',
            type: 'info',
            timestamp: Date.now()
        });
    }

    /**
     * Start price updates
     */
    startPriceUpdates() {
        // Update immediately
        this.updatePrices();

        // Then update every 30 seconds
        this.priceUpdateInterval = setInterval(() => {
            this.updatePrices();
        }, 30000);
    }

    /**
     * Update prices and chart
     */
    async updatePrices() {
        try {
            const marketData = await this.cryptoDataService.getAllMarketData();

            // Update chart
            const timestamp = new Date().toLocaleTimeString();

            // Add data point
            this.priceChart.data.labels.push(timestamp);

            // Keep only last 20 data points
            if (this.priceChart.data.labels.length > 20) {
                this.priceChart.data.labels.shift();
            }

            // Update each dataset
            ['BTC', 'ETH', 'BNB'].forEach((symbol, index) => {
                const coin = marketData.find(c => c.symbol === symbol);
                if (coin) {
                    this.priceChart.data.datasets[index].data.push(coin.price);

                    // Keep only last 20 data points
                    if (this.priceChart.data.datasets[index].data.length > 20) {
                        this.priceChart.data.datasets[index].data.shift();
                    }
                }
            });

            this.priceChart.update('none'); // Update without animation

            // Update UI stats
            this.updateUI();
        } catch (error) {
            console.error('Error updating prices:', error);
        }
    }

    /**
     * Update UI with current stats
     */
    updateUI() {
        if (!this.tradingEngine) return;

        const stats = this.tradingEngine.getPortfolioStats();

        // Update stats
        this.elements.currentBalance.textContent = `$${stats.balance.toFixed(2)}`;

        const changeAmount = stats.totalPnL;
        const changePercent = stats.roi;
        const changeClass = changeAmount >= 0 ? 'positive' : 'negative';
        const changeSign = changeAmount >= 0 ? '+' : '';

        this.elements.balanceChange.textContent = `${changeSign}$${changeAmount.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
        this.elements.balanceChange.className = `stat-change ${changeClass}`;

        this.elements.openPositions.textContent = stats.openPositions;
        this.elements.totalTrades.textContent = stats.totalTrades;
        this.elements.winRate.textContent = `${stats.winRate.toFixed(1)}%`;
        this.elements.totalPnL.textContent = `$${stats.totalPnL.toFixed(2)}`;
        this.elements.roi.textContent = `${stats.roi.toFixed(2)}%`;

        // Update positions
        this.updatePositionsDisplay();

        // Update trade history
        this.updateTradeHistory();
    }

    /**
     * Update positions display
     */
    updatePositionsDisplay() {
        if (!this.tradingEngine) return;

        const positions = this.tradingEngine.getOpenPositions();

        if (positions.length === 0) {
            this.elements.positionsContainer.innerHTML = '<p class="empty-state">No active positions</p>';
            return;
        }

        this.elements.positionsContainer.innerHTML = positions.map(pos => `
            <div class="position-card ${pos.direction.toLowerCase()}">
                <div class="position-header">
                    <span class="position-symbol">${pos.symbol}</span>
                    <span class="position-badge ${pos.direction.toLowerCase()}">${pos.direction}</span>
                </div>
                <div class="position-details">
                    <div class="position-detail">
                        <span class="position-detail-label">Entry Price</span>
                        <span class="position-detail-value">$${pos.entryPrice.toFixed(2)}</span>
                    </div>
                    <div class="position-detail">
                        <span class="position-detail-label">Current Price</span>
                        <span class="position-detail-value">$${pos.currentPrice.toFixed(2)}</span>
                    </div>
                    <div class="position-detail">
                        <span class="position-detail-label">Leverage</span>
                        <span class="position-detail-value">${pos.leverage}x</span>
                    </div>
                    <div class="position-detail">
                        <span class="position-detail-label">Size</span>
                        <span class="position-detail-value">$${pos.size.toFixed(2)}</span>
                    </div>
                    <div class="position-detail">
                        <span class="position-detail-label">Unrealized P&L</span>
                        <span class="position-detail-value ${pos.unrealizedPnL >= 0 ? 'profit' : 'loss'}">
                            ${pos.unrealizedPnL >= 0 ? '+' : ''}$${pos.unrealizedPnL.toFixed(2)}
                        </span>
                    </div>
                    <div class="position-detail">
                        <span class="position-detail-label">ROI</span>
                        <span class="position-detail-value ${pos.unrealizedPnL >= 0 ? 'profit' : 'loss'}">
                            ${pos.unrealizedPnL >= 0 ? '+' : ''}${((pos.unrealizedPnL / pos.margin) * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div class="position-actions">
                    <button class="btn btn-danger btn-small" onclick="app.closePosition('${pos.id}')">Close Position</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Close a position
     */
    closePosition(positionId) {
        if (!this.tradingEngine) return;

        try {
            const position = this.tradingEngine.getPosition(positionId);
            if (!position) return;

            const closedTrade = this.tradingEngine.closePosition(positionId, position.currentPrice);

            this.addLogEntry({
                message: `Manually closed ${position.symbol} position. P&L: $${closedTrade.totalPnL.toFixed(2)}`,
                type: closedTrade.totalPnL >= 0 ? 'success' : 'error',
                timestamp: Date.now()
            });

            this.updateUI();
        } catch (error) {
            console.error('Error closing position:', error);
            this.addLogEntry({
                message: `Error closing position: ${error.message}`,
                type: 'error',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Update trade history
     */
    updateTradeHistory() {
        if (!this.tradingEngine) return;

        const history = this.tradingEngine.getTradeHistory(20);

        if (history.length === 0) {
            this.elements.tradeHistoryBody.innerHTML = '<tr><td colspan="10" class="empty-state">No trade history yet</td></tr>';
            return;
        }

        this.elements.tradeHistoryBody.innerHTML = history.map(trade => `
            <tr>
                <td>${new Date(trade.exitTime).toLocaleString()}</td>
                <td>${trade.symbol}</td>
                <td>${trade.direction === 'LONG' ? 'Long' : 'Short'}</td>
                <td class="${trade.direction === 'LONG' ? 'long-badge' : 'short-badge'}">${trade.direction}</td>
                <td>${trade.leverage}x</td>
                <td>$${trade.entryPrice.toFixed(2)}</td>
                <td>$${trade.exitPrice.toFixed(2)}</td>
                <td>$${trade.size.toFixed(2)}</td>
                <td class="${trade.totalPnL >= 0 ? 'profit' : 'loss'}">
                    ${trade.totalPnL >= 0 ? '+' : ''}$${trade.totalPnL.toFixed(2)}
                </td>
                <td>$${(trade.openFee + trade.closeFee).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    /**
     * Add log entry
     */
    addLogEntry(logEntry) {
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const logHtml = `
            <div class="log-entry ${logEntry.type}">
                <span class="log-timestamp">${timestamp}</span>
                ${logEntry.message}
            </div>
        `;

        this.elements.activityLog.insertAdjacentHTML('afterbegin', logHtml);

        // Keep only last 50 log entries
        const entries = this.elements.activityLog.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[entries.length - 1].remove();
        }
    }

    /**
     * Handle trade log
     */
    handleTradeLog(tradeLog) {
        // Update UI when trades occur
        this.updateUI();
    }

    /**
     * Display AI analysis
     */
    displayAIAnalysis(analysis) {
        const timestamp = new Date(analysis.timestamp).toLocaleString();

        let html = `<div class="analysis-timestamp">Last updated: ${timestamp}</div>`;
        html += `<div><strong>Market Sentiment:</strong> ${analysis.sentiment.toUpperCase()}</div>`;
        html += `<hr style="border-color: var(--border-color); margin: 15px 0;">`;
        html += `<div>${analysis.rawAnalysis}</div>`;

        this.elements.aiAnalysis.innerHTML = html;
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        const state = {
            llmProvider: this.elements.llmProvider.value,
            startingBalance: this.elements.startingBalance.value,
            tradingInterval: this.elements.tradingInterval.value,
            maxLeverage: this.elements.maxLeverage.value,
            riskPercentage: this.elements.riskPercentage.value
        };

        localStorage.setItem('tradingBotState', JSON.stringify(state));
    }

    /**
     * Load state from localStorage
     */
    async loadState() {
        const savedState = localStorage.getItem('tradingBotState');
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);

            if (state.llmProvider) this.elements.llmProvider.value = state.llmProvider;
            if (state.startingBalance) this.elements.startingBalance.value = state.startingBalance;
            if (state.tradingInterval) this.elements.tradingInterval.value = state.tradingInterval;
            if (state.maxLeverage) this.elements.maxLeverage.value = state.maxLeverage;
            if (state.riskPercentage) this.elements.riskPercentage.value = state.riskPercentage;

            // Load saved API key for current provider
            await this.loadApiKeyForProvider();
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }
}

// Initialize app when DOM is ready
const app = new App();
window.app = app; // Make available globally for onclick handlers

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
