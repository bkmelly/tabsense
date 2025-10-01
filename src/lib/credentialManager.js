/**
 * Credential Management for TabSense AI Providers
 * Secure credential storage and management
 */

import { log } from '../utils/index.js';
import { AI_PROVIDERS } from './aiProviders.js';

/**
 * Credential Manager Class
 * Handles secure storage and retrieval of AI provider credentials
 */
export class CredentialManager {
  constructor() {
    this.credentials = new Map();
    this.encrypted = true;
    this.initialize();
  }

  /**
   * Initialize credential manager
   */
  async initialize() {
    try {
      // Load credentials from Chrome storage
      const result = await chrome.storage.local.get(['ai_credentials']);
      if (result.ai_credentials) {
        this.credentials = new Map(Object.entries(result.ai_credentials));
        log('info', 'Credentials loaded from storage');
      }
    } catch (error) {
      log('error', 'Failed to load credentials', error);
    }
  }

  /**
   * Set credential for a provider
   * @param {string} provider - Provider name
   * @param {string} key - Credential key
   * @param {string} value - Credential value
   */
  async setCredential(provider, key, value) {
    try {
      if (!this.credentials.has(provider)) {
        this.credentials.set(provider, {});
      }
      
      const providerCreds = this.credentials.get(provider);
      providerCreds[key] = value;
      this.credentials.set(provider, providerCreds);
      
      // Save to Chrome storage
      await this.saveCredentials();
      
      log('info', `Credential set for ${provider}: ${key}`);
    } catch (error) {
      log('error', 'Failed to set credential', error);
    }
  }

  /**
   * Get credential for a provider
   * @param {string} provider - Provider name
   * @param {string} key - Credential key
   * @returns {string|null} - Credential value
   */
  getCredential(provider, key) {
    const providerCreds = this.credentials.get(provider);
    return providerCreds ? providerCreds[key] : null;
  }

  /**
   * Get all credentials for a provider
   * @param {string} provider - Provider name
   * @returns {Object} - Provider credentials
   */
  getProviderCredentials(provider) {
    return this.credentials.get(provider) || {};
  }

  /**
   * Check if provider has required credentials
   * @param {string} provider - Provider name
   * @returns {boolean} - True if has required credentials
   */
  hasRequiredCredentials(provider) {
    const creds = this.getProviderCredentials(provider);
    
    switch (provider) {
      case AI_PROVIDERS.OPENAI:
        return !!creds.api_key;
      case AI_PROVIDERS.ANTHROPIC:
        return !!creds.api_key;
      case AI_PROVIDERS.GOOGLE_CLOUD:
        return !!creds.api_key && !!creds.project_id;
      case AI_PROVIDERS.CHROME:
        return true; // No credentials needed
      case AI_PROVIDERS.LOCAL:
        return !!creds.model_path;
      case AI_PROVIDERS.FALLBACK:
        return true; // No credentials needed
      default:
        return false;
    }
  }

  /**
   * Save credentials to Chrome storage
   */
  async saveCredentials() {
    try {
      const credentialsObj = Object.fromEntries(this.credentials);
      await chrome.storage.local.set({ ai_credentials: credentialsObj });
      log('info', 'Credentials saved to storage');
    } catch (error) {
      log('error', 'Failed to save credentials', error);
    }
  }

  /**
   * Clear all credentials
   */
  async clearCredentials() {
    try {
      this.credentials.clear();
      await chrome.storage.local.remove(['ai_credentials']);
      log('info', 'All credentials cleared');
    } catch (error) {
      log('error', 'Failed to clear credentials', error);
    }
  }

  /**
   * Clear credentials for specific provider
   * @param {string} provider - Provider name
   */
  async clearProviderCredentials(provider) {
    try {
      this.credentials.delete(provider);
      await this.saveCredentials();
      log('info', `Credentials cleared for ${provider}`);
    } catch (error) {
      log('error', 'Failed to clear provider credentials', error);
    }
  }

  /**
   * Get credential status for all providers
   * @returns {Object} - Status for each provider
   */
  getCredentialStatus() {
    const status = {};
    
    Object.values(AI_PROVIDERS).forEach(provider => {
      status[provider] = {
        hasCredentials: this.hasRequiredCredentials(provider),
        credentials: this.getProviderCredentials(provider)
      };
    });
    
    return status;
  }

  /**
   * Validate credential format
   * @param {string} provider - Provider name
   * @param {string} key - Credential key
   * @param {string} value - Credential value
   * @returns {Object} - Validation result
   */
  validateCredential(provider, key, value) {
    const validation = {
      valid: false,
      error: null
    };

    try {
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          if (key === 'api_key') {
            validation.valid = value.startsWith('sk-') && value.length > 20;
            validation.error = validation.valid ? null : 'Invalid OpenAI API key format';
          }
          break;
          
        case AI_PROVIDERS.ANTHROPIC:
          if (key === 'api_key') {
            validation.valid = value.startsWith('sk-ant-') && value.length > 20;
            validation.error = validation.valid ? null : 'Invalid Anthropic API key format';
          }
          break;
          
        case AI_PROVIDERS.GOOGLE_CLOUD:
          if (key === 'api_key') {
            validation.valid = value.length > 20;
            validation.error = validation.valid ? null : 'Invalid Google Cloud API key format';
          } else if (key === 'project_id') {
            validation.valid = /^[a-z0-9-]+$/.test(value);
            validation.error = validation.valid ? null : 'Invalid project ID format';
          }
          break;
          
        default:
          validation.valid = true;
      }
    } catch (error) {
      validation.error = error.message;
    }

    return validation;
  }
}

// Create singleton instance
export const credentialManager = new CredentialManager();

/**
 * Quick setup functions for common providers
 */
export const QuickSetup = {
  /**
   * Setup OpenAI credentials
   * @param {string} apiKey - OpenAI API key
   */
  async setupOpenAI(apiKey) {
    const validation = credentialManager.validateCredential(AI_PROVIDERS.OPENAI, 'api_key', apiKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    await credentialManager.setCredential(AI_PROVIDERS.OPENAI, 'api_key', apiKey);
    log('info', 'OpenAI credentials configured');
  },

  /**
   * Setup Anthropic credentials
   * @param {string} apiKey - Anthropic API key
   */
  async setupAnthropic(apiKey) {
    const validation = credentialManager.validateCredential(AI_PROVIDERS.ANTHROPIC, 'api_key', apiKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    await credentialManager.setCredential(AI_PROVIDERS.ANTHROPIC, 'api_key', apiKey);
    log('info', 'Anthropic credentials configured');
  },

  /**
   * Setup Google Cloud credentials
   * @param {string} apiKey - Google Cloud API key
   * @param {string} projectId - Google Cloud project ID
   */
  async setupGoogleCloud(apiKey, projectId) {
    const keyValidation = credentialManager.validateCredential(AI_PROVIDERS.GOOGLE_CLOUD, 'api_key', apiKey);
    const projectValidation = credentialManager.validateCredential(AI_PROVIDERS.GOOGLE_CLOUD, 'project_id', projectId);
    
    if (!keyValidation.valid) {
      throw new Error(keyValidation.error);
    }
    if (!projectValidation.valid) {
      throw new Error(projectValidation.error);
    }
    
    await credentialManager.setCredential(AI_PROVIDERS.GOOGLE_CLOUD, 'api_key', apiKey);
    await credentialManager.setCredential(AI_PROVIDERS.GOOGLE_CLOUD, 'project_id', projectId);
    log('info', 'Google Cloud credentials configured');
  }
};

export default CredentialManager;
