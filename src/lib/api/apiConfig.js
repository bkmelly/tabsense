/**
 * API Configuration Manager
 * Centralized configuration for all external APIs
 */

export const API_CONFIG = {
  // YouTube Data API v3
  youtube: {
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    apiKey: process.env.YOUTUBE_API_KEY || '', // Will be set via environment or user input
    endpoints: {
      videos: '/videos',
      search: '/search',
      channels: '/channels',
      comments: '/commentThreads',
      playlists: '/playlists'
    },
    rateLimits: {
      dailyQuota: 10000,
      requestsPerMinute: 100
    }
  },

  // News APIs
  news: {
    newsapi: {
      baseUrl: 'https://newsapi.org/v2',
      apiKey: process.env.NEWS_API_KEY || '',
      endpoints: {
        everything: '/everything',
        headlines: '/top-headlines',
        sources: '/sources'
      },
      rateLimits: {
        dailyQuota: 1000,
        requestsPerMinute: 5
      }
    },
    guardian: {
      baseUrl: 'https://content.guardianapis.com',
      apiKey: process.env.GUARDIAN_API_KEY || '',
      endpoints: {
        search: '/search',
        content: '/content'
      },
      rateLimits: {
        dailyQuota: 5000,
        requestsPerMinute: 12
      }
    }
  },

  // Social Media APIs
  social: {
    twitter: {
      baseUrl: 'https://api.twitter.com/2',
      apiKey: process.env.TWITTER_API_KEY || '',
      endpoints: {
        tweets: '/tweets',
        users: '/users'
      }
    },
    reddit: {
      baseUrl: 'https://www.reddit.com/api/v1',
      endpoints: {
        search: '/search',
        subreddit: '/r'
      }
    }
  },

  // Academic/Research APIs
  academic: {
    arxiv: {
      baseUrl: 'http://export.arxiv.org/api/query',
      endpoints: {
        search: '/query'
      }
    },
    pubmed: {
      baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      endpoints: {
        search: '/esearch.fcgi',
        fetch: '/efetch.fcgi'
      }
    }
  }
};

/**
 * API Key Manager
 * Handles secure storage and retrieval of API keys
 */
export class APIKeyManager {
  constructor() {
    this.storageKey = 'tabsense_api_keys';
  }

  /**
   * Store API key securely
   * @param {string} service - Service name (e.g., 'youtube', 'news')
   * @param {string} key - API key
   */
  async setAPIKey(service, key) {
    try {
      const keys = await this.getAllKeys();
      keys[service] = key;
      await chrome.storage.local.set({ [this.storageKey]: keys });
      console.log(`[APIKeyManager] API key stored for ${service}`);
    } catch (error) {
      console.error(`[APIKeyManager] Failed to store API key for ${service}:`, error);
    }
  }

  /**
   * Get API key for service
   * @param {string} service - Service name
   * @returns {Promise<string>} API key
   */
  async getAPIKey(service) {
    try {
      const keys = await this.getAllKeys();
      return keys[service] || '';
    } catch (error) {
      console.error(`[APIKeyManager] Failed to get API key for ${service}:`, error);
      return '';
    }
  }

  /**
   * Get all stored API keys
   * @returns {Promise<Object>} All API keys
   */
  async getAllKeys() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || {};
    } catch (error) {
      console.error('[APIKeyManager] Failed to get all keys:', error);
      return {};
    }
  }

  /**
   * Check if API key is configured for service
   * @param {string} service - Service name
   * @returns {Promise<boolean>} True if key exists
   */
  async hasAPIKey(service) {
    const key = await this.getAPIKey(service);
    return key && key.length > 0;
  }
}

/**
 * Rate Limiter
 * Manages API rate limiting and quota tracking
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map(); // service -> { count, resetTime }
  }

  /**
   * Check if request is allowed for service
   * @param {string} service - Service name
   * @param {Object} limits - Rate limits from API_CONFIG
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest(service, limits) {
    const now = Date.now();
    const serviceData = this.requests.get(service) || { count: 0, resetTime: now + 60000 };

    // Reset counter if minute has passed
    if (now > serviceData.resetTime) {
      serviceData.count = 0;
      serviceData.resetTime = now + 60000;
    }

    // Check if under limit
    if (serviceData.count < limits.requestsPerMinute) {
      serviceData.count++;
      this.requests.set(service, serviceData);
      return true;
    }

    return false;
  }

  /**
   * Get time until next request is allowed
   * @param {string} service - Service name
   * @returns {number} Milliseconds until next request
   */
  getTimeUntilNextRequest(service) {
    const serviceData = this.requests.get(service);
    if (!serviceData) return 0;
    
    const now = Date.now();
    return Math.max(0, serviceData.resetTime - now);
  }
}

// Export singleton instances
export const apiKeyManager = new APIKeyManager();
export const rateLimiter = new RateLimiter();
