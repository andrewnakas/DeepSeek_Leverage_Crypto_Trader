# 🔐 Password Protection & API Key Encryption

Your trading bot is now secured with military-grade encryption to protect your API keys!

## 🎯 What's Protected?

### ✅ **API Keys are Encrypted**
- All API keys are encrypted using **AES-256-GCM** encryption
- Your password is the encryption key
- Keys are stored encrypted in browser's localStorage
- Even if someone accesses your browser storage, they can't read the keys without your password

### ✅ **Session-Based Authentication**
- Password required on first access
- Stays unlocked during browser session
- Automatically locks when you close browser
- Manual lock button available

### ✅ **Password Hashing**
- Your password is hashed using **SHA-256**
- Only the hash is stored, never the actual password
- Impossible to recover password from hash

## 🚀 Quick Start

### First Time Setup

1. **Open the trading bot**
   - You'll see a password setup screen

2. **Create Your Password**
   - Enter a password (minimum 6 characters)
   - Confirm the password
   - Click "Set Password & Continue"

   ⚠️ **Important**: Remember this password! It encrypts your API keys.

3. **You're In!**
   - The app is now unlocked
   - All API keys you save will be encrypted

### Using the Bot

1. **Adding API Keys**
   - Select your AI provider
   - Enter your API key
   - Check "Save encrypted API key" (enabled by default)
   - Start the bot
   - Your key is automatically encrypted and saved!

2. **Switching Providers**
   - Select different provider from dropdown
   - If you previously saved a key, it's automatically loaded and decrypted
   - Enter new key if you haven't saved one

3. **Locking the App**
   - Click the 🔒 Lock button in header
   - Bot stops automatically
   - Password required to unlock

### Next Session

1. **Open the bot**
   - You'll see the login screen
   - Enter your password
   - Click "Unlock"

2. **Saved Keys Load Automatically**
   - All your encrypted API keys are decrypted
   - Switch between providers - keys load automatically
   - No need to enter keys again!

## 🔒 Security Features

### Encryption Details

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
- Industry standard encryption
- Used by banks and governments
- Authenticated encryption (prevents tampering)

**Key Derivation**: PBKDF2
- 100,000 iterations
- Makes brute-force attacks impractical
- Unique salt for each encryption

**Password Hashing**: SHA-256
- One-way hash function
- Password cannot be recovered from hash

### What's Stored Where?

**localStorage** (Permanent):
- Password hash (SHA-256)
- Encrypted API keys (AES-256-GCM)
- Trading bot settings

**sessionStorage** (Temporary - cleared on browser close):
- Session authentication token
- Cleared when browser closes
- Forces re-authentication

**Never Stored**:
- Your actual password (only hash)
- Decrypted API keys
- Session data after browser closes

## 🛡️ Best Practices

### Password Security

✅ **DO**:
- Use a unique password for this bot
- Use 8+ characters
- Mix letters, numbers, symbols
- Store password in password manager

❌ **DON'T**:
- Use same password as other sites
- Use easily guessable passwords
- Share your password
- Write password on sticky notes

### API Key Security

✅ **DO**:
- Enable "Save encrypted API key"
- Lock the app when stepping away
- Use different API keys for different purposes
- Rotate keys periodically

❌ **DON'T**:
- Share API keys
- Use production API keys for testing
- Leave bot unlocked on shared computer

## 🔧 Advanced Features

### Forgot Password?

If you forget your password:

1. Click "Forgot Password? (Reset All)"
2. Confirm the reset
3. **All encrypted data is deleted**:
   - Saved API keys
   - Password hash
   - You'll need to re-enter everything

⚠️ **Warning**: This is destructive! You'll lose all saved API keys.

### Changing Password

Currently, to change password:

1. Click "Forgot Password"
2. Set up new password
3. Re-enter your API keys

(Note: Future version will allow password change without losing keys)

### Multiple Devices

Each device has its own encrypted storage:
- Password must be set on each device
- API keys must be entered on each device
- They don't sync across devices

## 🤔 FAQ

### Q: Is my password stored anywhere?
**A**: No! Only a SHA-256 hash is stored. Your actual password never leaves your browser.

### Q: Can I recover a forgotten password?
**A**: No. The password is not recoverable. You'll need to reset and re-enter API keys.

### Q: Are API keys sent to any server?
**A**: No! Everything is client-side. API keys are:
- Encrypted locally in your browser
- Only decrypted when you unlock with password
- Never sent to our servers

### Q: What if someone accesses my browser?
**A**: They'd need your password to decrypt API keys. Even with access to browser storage, keys are encrypted.

### Q: Does locking stop the bot?
**A**: Yes! When you lock, the bot automatically stops trading for security.

### Q: Can I use the same password on mobile?
**A**: Yes, but you'll need to enter it separately on mobile. Passwords don't sync.

### Q: What happens if I clear browser data?
**A**: All encrypted keys are deleted. You'll need to:
1. Set up new password
2. Re-enter API keys

### Q: Is this more secure than just using API keys directly?
**A**: Yes! Without encryption:
- API keys stored in plain text
- Anyone with browser access can read them
- No protection if device is compromised

With encryption:
- Keys unreadable without password
- Protected even if device is accessed
- Session-based security

## 🔐 Technical Details

### Encryption Process

```javascript
// When you save an API key:
1. Generate random 16-byte salt
2. Derive encryption key from password (PBKDF2, 100k iterations)
3. Generate random 12-byte IV (initialization vector)
4. Encrypt API key with AES-256-GCM
5. Store: salt + IV + encrypted data (all in base64)
```

### Decryption Process

```javascript
// When you unlock and load API key:
1. Extract salt and IV from stored data
2. Derive decryption key from password
3. Decrypt with AES-256-GCM
4. Verify authentication tag
5. Return plaintext API key
```

### Session Management

```javascript
// Session security:
1. Password entered
2. Hash compared with stored hash (SHA-256)
3. Session token generated and stored in sessionStorage
4. Token cleared when:
   - Browser closes
   - You click Lock
   -
Timeout (if implemented)
```

## 📊 Security Comparison

| Feature | Without Protection | With Protection |
|---------|-------------------|-----------------|
| API Keys | Plain text | AES-256 encrypted |
| Password | N/A | SHA-256 hashed |
| Browser Access | Full access | Password required |
| Stolen Device | Keys exposed | Keys encrypted |
| Session | Always active | Auto-locks |
| Multi-user | No protection | Each needs password |

## 🎓 For Developers

### Files Added

```
js/authService.js      - Encryption & authentication logic
js/appWithAuth.js      - Main app with auth integration
PASSWORD_PROTECTION.md - This documentation
```

### Using AuthService

```javascript
import { AuthService } from './authService.js';

const auth = new AuthService();

// Setup password (first time)
await auth.setupPassword('myPassword123');

// Encrypt and save API key
await auth.saveEncryptedApiKey('openrouter', 'sk-...', 'myPassword123');

// Load and decrypt API key
const apiKey = await auth.loadEncryptedApiKey('openrouter', 'myPassword123');

// Lock application
auth.lock();

// Authenticate
await auth.authenticate('myPassword123');
```

### Web Crypto API

Uses browser's native Web Crypto API:
- Hardware-accelerated encryption
- Cryptographically secure random numbers
- Constant-time operations (prevents timing attacks)

## 📞 Support

### Issues?

**API key not loading?**
- Check console for errors
- Verify password is correct
- Try re-entering and saving key

**Can't unlock?**
- Double-check password
- Use "Forgot Password" to reset
- Check browser console for errors

**Bot not starting?**
- Ensure you're unlocked
- Check API key is entered
- Verify provider selection

### Security Concerns?

If you find a security issue, please report it responsibly. The encryption implementation uses industry-standard algorithms and best practices.

---

**Your API keys are now secure! 🔐✅**

Trade safely knowing your credentials are protected with military-grade encryption.
