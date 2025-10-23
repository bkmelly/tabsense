/**
 * Unified API Manager
 * Coordinates all external API services and provides a unified interface
 */

import { youtubeAPI } from './youtubeAPI.js';
import { newsAPI } from './newsAPI.js';
import { apiKeyManager } from './apiConfig.js';

export class UnifiedAPIManager {
  constructor() {
    this.services = {
      youtube: youtubeAPI,
      news: newsAPI
    };
    
    this.initialized = false;
  }

  /**
   * Initialize all API services with their keys
   * @param {Object} apiKeys - Object with service names as keys and API keys as values
   */
  async initialize(apiKeys = {}) {
    try {
      console.log('[UnifiedAPI] Initializing API services...');
      
      // Load API keys from storage if not provided
      if (Object.keys(apiKeys).length === 0) {
        const storedKeys = await this.loadStoredAPIKeys();
        apiKeys = { ...apiKeys, ...storedKeys };
      }
      
      // Initialize YouTube API
      if (apiKeys.youtube) {
        await this.services.youtube.initialize(apiKeys.youtube);
        console.log('[UnifiedAPI] YouTube API initialized');
      }

      // Initialize News API
      if (apiKeys.newsapi || apiKeys.guardian) {
        await this.services.news.initialize({
          newsapi: apiKeys.newsapi,
          guardian: apiKeys.guardian
        });
        console.log('[UnifiedAPI] News API initialized');
      }

      this.initialized = true;
      console.log('[UnifiedAPI] All services initialized successfully');
    } catch (error) {
      console.error('[UnifiedAPI] Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Load API keys from Chrome storage
   */
  async loadStoredAPIKeys() {
    try {
      const result = await chrome.storage.local.get(['other_api_keys', 'other_api_enabled']);
      const keys = result.other_api_keys || {};
      const enabled = result.other_api_enabled || {};
      
      // Only return keys for enabled APIs
      const enabledKeys = {};
      for (const [provider, key] of Object.entries(keys)) {
        if (enabled[provider] && key) {
          enabledKeys[provider] = key;
        }
      }
      
      console.log('[UnifiedAPI] Loaded stored API keys:', Object.keys(enabledKeys));
      return enabledKeys;
    } catch (error) {
      console.error('[UnifiedAPI] Failed to load stored API keys:', error);
      return {};
    }
  }

  /**
   * Check if a service is available and configured
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} True if service is available
   */
  async isServiceAvailable(serviceName) {
    switch (serviceName) {
      case 'youtube':
        return await apiKeyManager.hasAPIKey('youtube');
      case 'news':
        return await apiKeyManager.hasAPIKey('newsapi') || await apiKeyManager.hasAPIKey('guardian');
      default:
        return false;
    }
  }

  /**
   * Extract data from a URL using the appropriate service
   * @param {string} url - URL to extract data from
   * @returns {Promise<Object>} Extracted data
   */
  async extractDataFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // YouTube extraction
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        if (!(await this.isServiceAvailable('youtube'))) {
          throw new Error('YouTube API not configured. Please set your YouTube API key in the extension settings.');
        }
        
        console.log('[UnifiedAPI] Extracting YouTube data from:', url);
        return await this.services.youtube.extractYouTubeData(url);
      }

      // News extraction (for news sites)
      if (this.isNewsSite(domain)) {
        if (!(await this.isServiceAvailable('news'))) {
          throw new Error('News API not configured. Please set your News API key in the extension settings.');
        }
        
        console.log('[UnifiedAPI] Extracting news data from:', url);
        return await this.extractNewsData(url);
      }

      // Default: return null for unsupported sites
      return null;
    } catch (error) {
      console.error('[UnifiedAPI] Failed to extract data from URL:', error);
      throw error;
    }
  }

  /**
   * Check if a domain is a news site
   * @param {string} domain - Domain to check
   * @returns {boolean} True if it's a news site
   */
  isNewsSite(domain) {
    const newsDomains = [
      'bbc.com', 'cnn.com', 'reuters.com', 'ap.org', 'npr.org',
      'nytimes.com', 'washingtonpost.com', 'theguardian.com',
      'wsj.com', 'bloomberg.com', 'techcrunch.com', 'wired.com',
      'arstechnica.com', 'engadget.com', 'theverge.com'
    ];
    
    return newsDomains.some(newsDomain => domain.includes(newsDomain));
  }

  /**
   * Extract news data from a news URL
   * @param {string} url - News URL
   * @returns {Promise<Object>} News data
   */
  async extractNewsData(url) {
    try {
      // For now, we'll use a simple approach - search for the article title
      // In a more sophisticated implementation, we could use web scraping
      // or specific news APIs that support URL-based extraction
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch news article: ${response.status}`);
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract basic metadata
      const title = doc.querySelector('h1')?.textContent?.trim() || 
                   doc.querySelector('title')?.textContent?.trim() || 
                   'Untitled';
      
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                         doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         '';
      
      const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                    doc.querySelector('[rel="author"]')?.textContent?.trim() ||
                    '';
      
      const publishedTime = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                           doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
                           '';
      
      return {
        type: 'news',
        url: url,
        title: title,
        description: description,
        author: author,
        publishedTime: publishedTime,
        extractedAt: new Date().toISOString(),
        source: 'web_scraping'
      };
    } catch (error) {
      console.error('[UnifiedAPI] Failed to extract news data:', error);
      throw error;
    }
  }

  /**
   * Search for content across multiple services
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Combined search results
   */
  async searchAll(query, options = {}) {
    const results = {
      youtube: [],
      news: [],
      total: 0
    };

    try {
      // Search YouTube if available
      if (await this.isServiceAvailable('youtube')) {
        try {
          results.youtube = await this.services.youtube.searchVideos(query, options.youtubeLimit || 10);
        } catch (error) {
          console.warn('[UnifiedAPI] YouTube search failed:', error);
        }
      }

      // Search news if available
      if (await this.isServiceAvailable('news')) {
        try {
          results.news = await this.services.news.searchAllSources(query, {
            pageSize: options.newsLimit || 20,
            ...options.newsOptions
          });
        } catch (error) {
          console.warn('[UnifiedAPI] News search failed:', error);
        }
      }

      results.total = results.youtube.length + results.news.length;
      
      console.log(`[UnifiedAPI] Search completed: ${results.total} results found`);
      return results;
    } catch (error) {
      console.error('[UnifiedAPI] Search failed:', error);
      throw error;
    }
  }

  /**
   * Get API status for all services
   * @returns {Promise<Object>} Status of all services
   */
  async getAPIStatus() {
    const status = {};
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      status[serviceName] = {
        available: await this.isServiceAvailable(serviceName),
        configured: await this.isServiceConfigured(serviceName)
      };
    }
    
    return status;
  }

  /**
   * Check if a service is configured (has API key)
   * @param {string} serviceName - Service name
   * @returns {Promise<boolean>} True if configured
   */
  async isServiceConfigured(serviceName) {
    switch (serviceName) {
      case 'youtube':
        return await apiKeyManager.hasAPIKey('youtube');
      case 'news':
        return await apiKeyManager.hasAPIKey('newsapi') || await apiKeyManager.hasAPIKey('guardian');
      default:
        return false;
    }
  }
}

// Export singleton instance
export const unifiedAPI = new UnifiedAPIManager();
