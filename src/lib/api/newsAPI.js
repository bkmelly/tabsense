/**
 * News API Service
 * Integration with multiple news APIs (NewsAPI, Guardian, etc.)
 */

import { API_CONFIG, apiKeyManager, rateLimiter } from './apiConfig.js';

export class NewsAPIService {
  constructor() {
    this.apis = {
      newsapi: {
        baseUrl: API_CONFIG.news.newsapi.baseUrl,
        endpoints: API_CONFIG.news.newsapi.endpoints,
        rateLimits: API_CONFIG.news.newsapi.rateLimits
      },
      guardian: {
        baseUrl: API_CONFIG.news.guardian.baseUrl,
        endpoints: API_CONFIG.news.guardian.endpoints,
        rateLimits: API_CONFIG.news.guardian.rateLimits
      }
    };
  }

  /**
   * Initialize the service with API keys
   * @param {Object} apiKeys - Object with apiKey names as keys
   */
  async initialize(apiKeys = {}) {
    for (const [service, key] of Object.entries(apiKeys)) {
      if (key) {
        await apiKeyManager.setAPIKey(service, key);
      }
    }
    
    console.log('[NewsAPI] Service initialized');
  }

  /**
   * Search for news articles using NewsAPI
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} News articles
   */
  async searchNewsAPI(query, options = {}) {
    const {
      language = 'en',
      sortBy = 'relevancy',
      pageSize = 20,
      page = 1,
      fromDate = null,
      toDate = null
    } = options;

    if (!rateLimiter.canMakeRequest('newsapi', this.apis.newsapi.rateLimits)) {
      throw new Error('NewsAPI rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('newsapi');
    if (!apiKey) {
      throw new Error('NewsAPI key not configured. Please set your API key in the extension settings.');
    }

    let url = `${this.apis.newsapi.baseUrl}${this.apis.newsapi.endpoints.everything}?q=${encodeURIComponent(query)}&language=${language}&sortBy=${sortBy}&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
    
    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('NewsAPI key invalid');
        }
        if (response.status === 429) {
          throw new Error('NewsAPI quota exceeded');
        }
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.message}`);
      }

      return data.articles.map(article => ({
        id: article.url,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          id: article.source.id,
          name: article.source.name
        },
        author: article.author
      }));
    } catch (error) {
      console.error('[NewsAPI] Failed to search news:', error);
      throw error;
    }
  }

  /**
   * Get top headlines using NewsAPI
   * @param {Object} options - Headlines options
   * @returns {Promise<Array>} Headlines
   */
  async getTopHeadlines(options = {}) {
    const {
      country = 'us',
      category = null,
      pageSize = 20,
      page = 1
    } = options;

    if (!rateLimiter.canMakeRequest('newsapi', this.apis.newsapi.rateLimits)) {
      throw new Error('NewsAPI rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('newsapi');
    if (!apiKey) {
      throw new Error('NewsAPI key not configured. Please set your API key in the extension settings.');
    }

    let url = `${this.apis.newsapi.baseUrl}${this.apis.newsapi.endpoints.headlines}?country=${country}&pageSize=${pageSize}&page=${page}&apiKey=${apiKey}`;
    
    if (category) url += `&category=${category}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('NewsAPI key invalid');
        }
        if (response.status === 429) {
          throw new Error('NewsAPI quota exceeded');
        }
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.message}`);
      }

      return data.articles.map(article => ({
        id: article.url,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          id: article.source.id,
          name: article.source.name
        }
      }));
    } catch (error) {
      console.error('[NewsAPI] Failed to get headlines:', error);
      throw error;
    }
  }

  /**
   * Search Guardian API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Guardian articles
   */
  async searchGuardian(query, options = {}) {
    const {
      section = null,
      pageSize = 20,
      page = 1,
      fromDate = null,
      toDate = null
    } = options;

    if (!rateLimiter.canMakeRequest('guardian', this.apis.guardian.rateLimits)) {
      throw new Error('Guardian API rate limit exceeded. Please wait before making another request.');
    }

    const apiKey = await apiKeyManager.getAPIKey('guardian');
    if (!apiKey) {
      throw new Error('Guardian API key not configured. Please set your API key in the extension settings.');
    }

    let url = `${this.apis.guardian.baseUrl}${this.apis.guardian.endpoints.search}?q=${encodeURIComponent(query)}&page-size=${pageSize}&page=${page}&api-key=${apiKey}`;
    
    if (section) url += `&section=${section}`;
    if (fromDate) url += `&from-date=${fromDate}`;
    if (toDate) url += `&to-date=${toDate}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Guardian API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.response.status !== 'ok') {
        throw new Error(`Guardian API error: ${data.response.message}`);
      }

      return data.response.results.map(article => ({
        id: article.id,
        title: article.webTitle,
        description: article.fields?.trailText || '',
        content: article.fields?.body || '',
        url: article.webUrl,
        publishedAt: article.webPublicationDate,
        section: article.sectionName,
        source: {
          name: 'The Guardian',
          id: 'guardian'
        }
      }));
    } catch (error) {
      console.error('[NewsAPI] Failed to search Guardian:', error);
      throw error;
    }
  }

  /**
   * Search multiple news sources
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Combined news results
   */
  async searchAllSources(query, options = {}) {
    const results = [];
    
    try {
      // Try NewsAPI first
      const newsapiResults = await this.searchNewsAPI(query, options);
      results.push(...newsapiResults.map(article => ({ ...article, source: { ...article.source, api: 'newsapi' } })));
    } catch (error) {
      console.warn('[NewsAPI] NewsAPI search failed:', error);
    }

    try {
      // Try Guardian API
      const guardianResults = await this.searchGuardian(query, options);
      results.push(...guardianResults);
    } catch (error) {
      console.warn('[NewsAPI] Guardian search failed:', error);
    }

    // Sort by published date (newest first)
    results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    console.log(`[NewsAPI] Found ${results.length} articles from multiple sources`);
    return results;
  }
}

// Export singleton instance
export const newsAPI = new NewsAPIService();
