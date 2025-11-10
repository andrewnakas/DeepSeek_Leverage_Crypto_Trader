/**
 * Authentication & Encryption Module
 * Provides password protection and API key encryption
 */

export class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.sessionKey = null;
        this.passwordHash = null;
    }

    /**
     * Initialize authentication
     */
    async init() {
        // Check if we have a stored password hash
        const storedHash = localStorage.getItem('auth_hash');
        const sessionAuth = sessionStorage.getItem('auth_session');

        if (storedHash && sessionAuth) {
            // User has an active session
            this.passwordHash = storedHash;
            this.sessionKey = sessionAuth;
            this.isAuthenticated = true;
            return true;
        }

        return false;
    }

    /**
     * Set up password protection (first time)
     */
    async setupPassword(password) {
        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        // Hash the password
        this.passwordHash = await this.hashPassword(password);

        // Store hash for future sessions
        localStorage.setItem('auth_hash', this.passwordHash);

        // Create session key
        this.sessionKey = await this.createSessionKey(password);
        sessionStorage.setItem('auth_session', this.sessionKey);

        this.isAuthenticated = true;
        return true;
    }

    /**
     * Authenticate with existing password
     */
    async authenticate(password) {
        const storedHash = localStorage.getItem('auth_hash');

        if (!storedHash) {
            throw new Error('No password set. Please set up password first.');
        }

        const inputHash = await this.hashPassword(password);

        if (inputHash !== storedHash) {
            throw new Error('Incorrect password');
        }

        this.passwordHash = storedHash;
        this.sessionKey = await this.createSessionKey(password);
        sessionStorage.setItem('auth_session', this.sessionKey);
        this.isAuthenticated = true;

        return true;
    }

    /**
     * Lock the application
     */
    lock() {
        sessionStorage.removeItem('auth_session');
        this.isAuthenticated = false;
        this.sessionKey = null;
    }

    /**
     * Change password
     */
    async changePassword(oldPassword, newPassword) {
        // Verify old password
        await this.authenticate(oldPassword);

        // Decrypt all stored API keys with old password
        const providers = ['deepseek', 'openrouter', 'groq', 'together'];
        const decryptedKeys = {};

        for (const provider of providers) {
            const encrypted = localStorage.getItem(`api_key_${provider}`);
            if (encrypted) {
                try {
                    decryptedKeys[provider] = await this.decrypt(encrypted, oldPassword);
                } catch (error) {
                    console.error(`Failed to decrypt ${provider} key:`, error);
                }
            }
        }

        // Set new password
        await this.setupPassword(newPassword);

        // Re-encrypt all API keys with new password
        for (const [provider, key] of Object.entries(decryptedKeys)) {
            if (key) {
                await this.saveEncryptedApiKey(provider, key, newPassword);
            }
        }

        return true;
    }

    /**
     * Reset all authentication (for emergencies)
     */
    reset() {
        localStorage.removeItem('auth_hash');
        sessionStorage.removeItem('auth_session');
        this.isAuthenticated = false;
        this.sessionKey = null;
        this.passwordHash = null;
    }

    /**
     * Encrypt API key
     */
    async encryptApiKey(apiKey, password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);

        // Derive key from password
        const keyMaterial = await this.getKeyMaterial(password);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        return btoa(String.fromCharCode(...combined));
    }

    /**
     * Decrypt API key
     */
    async decryptApiKey(encryptedData, password) {
        try {
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);

            const keyMaterial = await this.getKeyMaterial(password);
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            throw new Error('Failed to decrypt. Wrong password or corrupted data.');
        }
    }

    /**
     * Save encrypted API key to localStorage
     */
    async saveEncryptedApiKey(provider, apiKey, password) {
        const encrypted = await this.encryptApiKey(apiKey, password);
        localStorage.setItem(`api_key_${provider}`, encrypted);
    }

    /**
     * Load and decrypt API key from localStorage
     */
    async loadEncryptedApiKey(provider, password) {
        const encrypted = localStorage.getItem(`api_key_${provider}`);
        if (!encrypted) return null;

        try {
            return await this.decryptApiKey(encrypted, password);
        } catch (error) {
            console.error(`Failed to decrypt ${provider} key:`, error);
            return null;
        }
    }

    /**
     * Hash password using SHA-256
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)));
    }

    /**
     * Create session key from password
     */
    async createSessionKey(password) {
        const timestamp = Date.now().toString();
        const combined = password + timestamp;
        return await this.hashPassword(combined);
    }

    /**
     * Get key material for encryption
     */
    async getKeyMaterial(password) {
        const encoder = new TextEncoder();
        return await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
    }

    /**
     * Utility: Encrypt any data
     */
    async encrypt(data, password) {
        return await this.encryptApiKey(data, password);
    }

    /**
     * Utility: Decrypt any data
     */
    async decrypt(encryptedData, password) {
        return await this.decryptApiKey(encryptedData, password);
    }

    /**
     * Check if authenticated
     */
    isAuth() {
        return this.isAuthenticated;
    }

    /**
     * Check if password is set up
     */
    hasPasswordSetup() {
        return localStorage.getItem('auth_hash') !== null;
    }
}
