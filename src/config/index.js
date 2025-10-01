/**
 * Configuration management for TabSense
 * Industry-standard configuration handling for Chrome extensions
 */

import { log } from '../utils/index.js';

// Default configuration
const DEFAULT_CONFIG = {
  // Core settings
  maxTabs: 20,
  summaryLength: 'medium', // 'short', 'medium', 'long'
  autoSummarize: true,
  
  // Cache settings
  cacheEnabled: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  
  // UI settings
  theme: 'auto', // 'light', 'dark', 'auto'
  sidebarWidth: 400,
  showWordCount: true,
  
  // AI settings
  aiProvider: 'chrome', // 'chrome', 'fallback'
  fallbackEnabled: true,
  
  // Performance settings
  maxConcurrentSummaries: 3,
  summaryTimeout: 30000, // 30 seconds
  
  // Privacy settings
  dataRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  anonymizeData: false,
  
  // Feature flags
  features: {
    crossTabQA: true,
    translation: false,
    export: true,
    contextMenu: true
  }
};

/**
 * Configuration manager class
 */
export class ConfigManager {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loaded = false;
  }

  /**
   * Load configuration from Chrome storage
   */
  async load() {
    try {
      const result = await chrome.storage.local.get(['tabsense_config']);
      if (result.tabsense_config) {
        this.config = { ...DEFAULT_CONFIG, ...result.tabsense_config };
        log('info', 'Configuration loaded', this.config);
      }
      this.loaded = true;
    } catch (error) {
      log('error', 'Failed to load configuration', error);
      this.config = { ...DEFAULT_CONFIG };
      this.loaded = true;
    }
  }

  /**
   * Save configuration to Chrome storage
   */
  async save() {
    try {
      await chrome.storage.local.set({ tabsense_config: this.config });
      log('info', 'Configuration saved', this.config);
    } catch (error) {
      log('error', 'Failed to save configuration', error);
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @returns {any} - Configuration value
   */
  get(key) {
    if (!this.loaded) {
      log('warn', 'Configuration not loaded, returning default value');
      return this.getNestedValue(DEFAULT_CONFIG, key);
    }
    return this.getNestedValue(this.config, key);
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {any} value - Configuration value
   */
  async set(key, value) {
    this.setNestedValue(this.config, key, value);
    await this.save();
  }

  /**
   * Reset configuration to defaults
   */
  async reset() {
    this.config = { ...DEFAULT_CONFIG };
    await this.save();
    log('info', 'Configuration reset to defaults');
  }

  /**
   * Get all configuration
   * @returns {Object} - Complete configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to get value from
   * @param {string} path - Dot notation path
   * @returns {any} - Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   * @param {Object} obj - Object to set value in
   * @param {string} path - Dot notation path
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result
   */
  validate(config) {
    const errors = [];
    const warnings = [];

    // Validate maxTabs
    if (config.maxTabs < 1 || config.maxTabs > 100) {
      errors.push('maxTabs must be between 1 and 100');
    }

    // Validate summaryLength
    if (!['short', 'medium', 'long'].includes(config.summaryLength)) {
      errors.push('summaryLength must be short, medium, or long');
    }

    // Validate cacheTTL
    if (config.cacheTTL < 0) {
      errors.push('cacheTTL must be positive');
    }

    // Validate theme
    if (!['light', 'dark', 'auto'].includes(config.theme)) {
      errors.push('theme must be light, dark, or auto');
    }

    // Warnings
    if (config.maxTabs > 50) {
      warnings.push('High maxTabs value may impact performance');
    }

    if (config.cacheTTL > 7 * 24 * 60 * 60 * 1000) {
      warnings.push('Long cache TTL may use significant storage');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create singleton instance
export const configManager = new ConfigManager();

// Export default configuration for reference
export { DEFAULT_CONFIG };
