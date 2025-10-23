/**
 * URLFilter - Filters URLs to determine which pages should be processed
 * Prevents processing of non-content pages like search results, directories, etc.
 */

export class URLFilter {
  constructor() {
    this.excludedPatterns = [
      // Search engines
      /google\.com\/search/,
      /bing\.com\/search/,
      /duckduckgo\.com\/\?/,
      /yahoo\.com\/search/,
      
      // Directory/listing pages
      /\/category\//,
      /\/archive\//,
      /\/index\.html?$/,
      /\/sitemap/,
      /\/tag\//,
      /\/tags\//,
      
      // Social media feeds
      /facebook\.com\/feed/,
      /twitter\.com\/home/,
      /linkedin\.com\/feed/,
      
      // E-commerce category pages
      /\/products\//,
      /\/category\//,
      /\/shop\//,
      
      // File downloads
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i,
      
      // Image/video files
      /\.(jpg|jpeg|png|gif|mp4|avi|mov)$/i
    ];
    
    this.directoryKeywords = [
      'search results',
      'category',
      'archive', 
      'index',
      'directory',
      'sitemap',
      'tag',
      'tags',
      'products',
      'shop',
      'browse'
    ];
    
    console.log('[URLFilter] Initialized with', this.excludedPatterns.length, 'exclusion patterns');
  }

  /**
   * Check if URL should be processed (filter out non-content pages)
   * @param {string} url - The URL to check
   * @param {string} title - The page title to check
   * @returns {boolean} - True if URL should be processed
   */
  shouldProcess(url, title) {
    if (!url || typeof url !== 'string') {
      console.log('[URLFilter] Invalid URL provided:', url);
      return false;
    }
    
    const urlLower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    
    // Check URL patterns
    for (const pattern of this.excludedPatterns) {
      if (pattern.test(urlLower)) {
        console.log('[URLFilter] URL filtered out by pattern:', url, pattern);
        return false;
      }
    }
    
    // Check title patterns for directory pages
    for (const keyword of this.directoryKeywords) {
      if (titleLower.includes(keyword)) {
        console.log('[URLFilter] URL filtered out by title keyword:', url, keyword);
        return false;
      }
    }
    
    // Special Google filtering - only allow YouTube videos
    if (urlLower.includes('google.com') && !urlLower.includes('/watch')) {
      console.log('[URLFilter] URL filtered out - Google non-video page:', url);
      return false;
    }
    
    console.log('[URLFilter] URL approved for processing:', url);
    return true;
  }

  /**
   * Filter an array of tabs to only include processable ones
   * @param {Array} tabs - Array of tab objects with url and title properties
   * @returns {Array} - Filtered array of processable tabs
   */
  filterTabs(tabs) {
    if (!Array.isArray(tabs)) {
      console.warn('[URLFilter] Invalid tabs array provided');
      return [];
    }
    
    const processableTabs = tabs.filter(tab => {
      const shouldProcess = this.shouldProcess(tab.url || '', tab.title || '');
      if (!shouldProcess) {
        console.log('[URLFilter] Filtered out tab:', tab.url, tab.title);
      }
      return shouldProcess;
    });
    
    console.log('[URLFilter] Filtered', tabs.length, 'tabs down to', processableTabs.length, 'processable tabs');
    return processableTabs;
  }

  /**
   * Add a custom exclusion pattern
   * @param {RegExp} pattern - Regular expression pattern to exclude
   */
  addExclusionPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.excludedPatterns.push(pattern);
      console.log('[URLFilter] Added exclusion pattern:', pattern);
    } else {
      console.warn('[URLFilter] Invalid pattern provided, must be RegExp');
    }
  }

  /**
   * Add a custom directory keyword
   * @param {string} keyword - Keyword to exclude from titles
   */
  addDirectoryKeyword(keyword) {
    if (typeof keyword === 'string') {
      this.directoryKeywords.push(keyword.toLowerCase());
      console.log('[URLFilter] Added directory keyword:', keyword);
    } else {
      console.warn('[URLFilter] Invalid keyword provided, must be string');
    }
  }

  /**
   * Get statistics about filtering
   * @param {Array} originalTabs - Original tabs array
   * @param {Array} filteredTabs - Filtered tabs array
   * @returns {Object} - Filtering statistics
   */
  getFilteringStats(originalTabs, filteredTabs) {
    const totalTabs = originalTabs.length;
    const filteredCount = totalTabs - filteredTabs.length;
    const filterRate = totalTabs > 0 ? (filteredCount / totalTabs * 100).toFixed(1) : 0;
    
    return {
      totalTabs,
      filteredCount,
      processableCount: filteredTabs.length,
      filterRate: `${filterRate}%`,
      excludedPatterns: this.excludedPatterns.length,
      directoryKeywords: this.directoryKeywords.length
    };
  }

  /**
   * Get favicon URL for a domain
   * @param {string} url - The URL to get favicon for
   * @returns {string} - Favicon URL
   */
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Use Google's favicon service for reliable favicons
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (error) {
      console.warn('[URLFilter] Invalid URL for favicon:', url, error);
      return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
    }
  }

  /**
   * Extract domain from URL
   * @param {string} url - The URL to extract domain from
   * @returns {string} - Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.warn('[URLFilter] Invalid URL for domain extraction:', url, error);
      return 'unknown';
    }
  }

  /**
   * Check if URL is from a specific domain
   * @param {string} url - The URL to check
   * @param {string} domain - The domain to check against
   * @returns {boolean} - True if URL is from the domain
   */
  isFromDomain(url, domain) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
    } catch (error) {
      console.warn('[URLFilter] Invalid URL for domain check:', url, error);
      return false;
    }
  }
}

export default URLFilter;
