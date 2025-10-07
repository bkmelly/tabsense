/**
 * CachingManager - Handles content hashing and summary caching
 * Uses SHA256 for content fingerprinting and Chrome storage for persistence
 */

export class CachingManager {
  constructor() {
    this.cachePrefix = 'tabSense_cache_';
    this.maxCacheSize = 1000; // Maximum cached summaries
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Generate SHA256 hash of content for caching
   * @param {string} content - The content to hash
   * @param {Object} metadata - Additional metadata to include in hash
   * @returns {Promise<string>} SHA256 hash
   */
  async generateContentHash(content, metadata = {}) {
    try {
      // Create hash input from content and metadata
      const hashInput = JSON.stringify({
        content: content.trim(),
        title: metadata.title || '',
        url: metadata.url || '',
        // Include page type in hash for template-specific caching
        pageType: metadata.pageType || 'generic',
        // Include summary length in hash
        summaryLength: metadata.summaryLength || 'medium'
      });

      // Generate SHA256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(hashInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('[CachingManager] Generated hash:', hashHex.substring(0, 16) + '...');
      return hashHex;
    } catch (error) {
      console.error('[CachingManager] Hash generation failed:', error);
      // Fallback to simple hash
      return this.simpleHash(hashInput);
    }
  }

  /**
   * Simple hash fallback for environments without crypto.subtle
   */
  simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get cached summary if available and not expired
   * @param {string} hash - Content hash
   * @returns {Promise<Object|null>} Cached summary or null
   */
  async getCachedSummary(hash) {
    try {
      const cacheKey = this.cachePrefix + hash;
      const result = await chrome.storage.local.get([cacheKey]);
      
      if (result[cacheKey]) {
        const cached = result[cacheKey];
        const now = Date.now();
        
        // Check if cache is expired
        if (now - cached.timestamp > this.cacheExpiry) {
          console.log('[CachingManager] Cache expired for hash:', hash.substring(0, 16) + '...');
          await this.removeCachedSummary(hash);
          return null;
        }
        
        console.log('[CachingManager] Cache hit for hash:', hash.substring(0, 16) + '...');
        return {
          summary: cached.summary,
          metadata: cached.metadata,
          cached: true,
          cacheAge: now - cached.timestamp
        };
      }
      
      console.log('[CachingManager] Cache miss for hash:', hash.substring(0, 16) + '...');
      return null;
    } catch (error) {
      console.error('[CachingManager] Cache retrieval failed:', error);
      return null;
    }
  }

  /**
   * Store summary in cache
   * @param {string} hash - Content hash
   * @param {string} summary - Generated summary
   * @param {Object} metadata - Summary metadata
   * @returns {Promise<boolean>} Success status
   */
  async storeCachedSummary(hash, summary, metadata = {}) {
    try {
      const cacheKey = this.cachePrefix + hash;
      const cacheEntry = {
        summary: summary,
        metadata: {
          ...metadata,
          pageType: metadata.pageType || 'generic',
          summaryLength: metadata.summaryLength || 'medium',
          wordCount: summary.split(' ').length,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ [cacheKey]: cacheEntry });
      console.log('[CachingManager] Stored cache for hash:', hash.substring(0, 16) + '...');
      
      // Clean up old cache entries
      await this.cleanupCache();
      
      return true;
    } catch (error) {
      console.error('[CachingManager] Cache storage failed:', error);
      return false;
    }
  }

  /**
   * Remove cached summary
   * @param {string} hash - Content hash
   * @returns {Promise<boolean>} Success status
   */
  async removeCachedSummary(hash) {
    try {
      const cacheKey = this.cachePrefix + hash;
      await chrome.storage.local.remove([cacheKey]);
      console.log('[CachingManager] Removed cache for hash:', hash.substring(0, 16) + '...');
      return true;
    } catch (error) {
      console.error('[CachingManager] Cache removal failed:', error);
      return false;
    }
  }

  /**
   * Clean up old cache entries to prevent storage bloat
   * @returns {Promise<number>} Number of entries cleaned
   */
  async cleanupCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.cachePrefix))
        .map(([key, value]) => ({
          key,
          timestamp: value.timestamp || 0,
          hash: key.replace(this.cachePrefix, '')
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      // Remove entries beyond max cache size
      if (cacheEntries.length > this.maxCacheSize) {
        const toRemove = cacheEntries.slice(this.maxCacheSize);
        const keysToRemove = toRemove.map(entry => entry.key);
        
        await chrome.storage.local.remove(keysToRemove);
        console.log('[CachingManager] Cleaned up', keysToRemove.length, 'old cache entries');
        return keysToRemove.length;
      }

      // Remove expired entries
      const now = Date.now();
      const expiredEntries = cacheEntries.filter(entry => 
        now - entry.timestamp > this.cacheExpiry
      );

      if (expiredEntries.length > 0) {
        const keysToRemove = expiredEntries.map(entry => entry.key);
        await chrome.storage.local.remove(keysToRemove);
        console.log('[CachingManager] Removed', keysToRemove.length, 'expired cache entries');
        return keysToRemove.length;
      }

      return 0;
    } catch (error) {
      console.error('[CachingManager] Cache cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.cachePrefix))
        .map(([key, value]) => ({
          hash: key.replace(this.cachePrefix, ''),
          timestamp: value.timestamp || 0,
          wordCount: value.metadata?.wordCount || 0,
          pageType: value.metadata?.pageType || 'unknown'
        }));

      const now = Date.now();
      const stats = {
        totalEntries: cacheEntries.length,
        expiredEntries: cacheEntries.filter(entry => 
          now - entry.timestamp > this.cacheExpiry
        ).length,
        totalWords: cacheEntries.reduce((sum, entry) => sum + entry.wordCount, 0),
        pageTypes: cacheEntries.reduce((acc, entry) => {
          acc[entry.pageType] = (acc[entry.pageType] || 0) + 1;
          return acc;
        }, {}),
        oldestEntry: cacheEntries.length > 0 ? 
          Math.min(...cacheEntries.map(e => e.timestamp)) : null,
        newestEntry: cacheEntries.length > 0 ? 
          Math.max(...cacheEntries.map(e => e.timestamp)) : null
      };

      console.log('[CachingManager] Cache stats:', stats);
      return stats;
    } catch (error) {
      console.error('[CachingManager] Cache stats failed:', error);
      return { totalEntries: 0, error: error.message };
    }
  }

  /**
   * Clear all cached summaries
   * @returns {Promise<boolean>} Success status
   */
  async clearAllCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData)
        .filter(key => key.startsWith(this.cachePrefix));
      
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
        console.log('[CachingManager] Cleared all', cacheKeys.length, 'cache entries');
        return true;
      }
      
      console.log('[CachingManager] No cache entries to clear');
      return true;
    } catch (error) {
      console.error('[CachingManager] Cache clear failed:', error);
      return false;
    }
  }
}

export default CachingManager;
