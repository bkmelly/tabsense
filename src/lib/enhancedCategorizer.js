/**
 * Enhanced Tab Categorizer - Unified categorization system
 * Combines URL patterns, content analysis, and AI classification
 * Provides consistent categories across UI and backend
 */

import { log } from '../utils/index.js';

export class EnhancedCategorizer {
  constructor() {
    // Unified category definitions with UI mapping
    this.categories = {
      'youtube': {
        label: 'YouTube',
        icon: '🎬',
        color: '#FF0000',
        priority: 10,
        urlPatterns: [
          /youtube\.com\/watch/,
          /youtube\.com\/channel/,
          /youtube\.com\/playlist/,
          /youtu\.be\//
        ],
        contentIndicators: [
          'video', 'youtube', 'watch', 'channel', 'subscribe',
          'views', 'likes', 'comments', 'playlist', 'upload'
        ],
        processing: {
          extractComments: true,
          extractTranscript: true,
          extractMetadata: true,
          specialHandling: 'youtube_analysis'
        }
      },
      
      'news': {
        label: 'News',
        icon: '📰',
        color: '#1E40AF',
        priority: 9,
        urlPatterns: [
          /bbc\.com\/news/,
          /cnn\.com/,
          /reuters\.com/,
          /bloomberg\.com/,
          /nytimes\.com/,
          /washingtonpost\.com/,
          /theguardian\.com/,
          /npr\.org/,
          /wsj\.com/,
          /ft\.com/,
          /news\.com/,
          /breaking/
        ],
        contentIndicators: [
          'breaking', 'report', 'story', 'headline', 'journalism',
          'press', 'media', 'reporter', 'correspondent', 'byline'
        ],
        processing: {
          extractComments: false,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'news_analysis'
        }
      },
      
      'documentation': {
        label: 'Documentation',
        icon: '📚',
        color: '#059669',
        priority: 8,
        urlPatterns: [
          /wikipedia\.org/,
          /developer\.mozilla\.org/,
          /docs\.microsoft\.com/,
          /nodejs\.org/,
          /react\.dev/,
          /vue\.js/,
          /angular\.io/,
          /github\.com\/.*\/wiki/,
          /stackoverflow\.com/,
          /britannica\.com/,
          /dictionary\.com/,
          /merriam-webster\.com/
        ],
        contentIndicators: [
          'wiki', 'encyclopedia', 'reference', 'documentation',
          'guide', 'manual', 'tutorial', 'help', 'wikipedia',
          'api', 'docs', 'reference', 'guide'
        ],
        processing: {
          extractComments: false,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'reference_analysis'
        }
      },
      
      'forum': {
        label: 'Forums',
        icon: '💬',
        color: '#10B981',
        priority: 7,
        urlPatterns: [
          /reddit\.com/,
          /quora\.com/,
          /stackoverflow\.com/,
          /discord\.com/,
          /forum/,
          /discussion/
        ],
        contentIndicators: [
          'comment', 'reply', 'discussion', 'thread', 'post',
          'reddit', 'quora', 'forum', 'community'
        ],
        processing: {
          extractComments: true,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'social_analysis'
        }
      },
      
      'blog': {
        label: 'Blogs',
        icon: '📝',
        color: '#7C3AED',
        priority: 6,
        urlPatterns: [
          /medium\.com/,
          /substack\.com/,
          /wordpress\.com/,
          /blogspot\.com/,
          /blog/,
          /post/
        ],
        contentIndicators: [
          'blog', 'post', 'opinion', 'editorial', 'commentary',
          'author', 'writer', 'personal', 'thoughts'
        ],
        processing: {
          extractComments: true,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'article_analysis'
        }
      },
      
      'ecommerce': {
        label: 'Shopping',
        icon: '🛒',
        color: '#F59E0B',
        priority: 5,
        urlPatterns: [
          /amazon\.com/,
          /ebay\.com/,
          /shopify\.com/,
          /etsy\.com/,
          /alibaba\.com/,
          /walmart\.com/,
          /target\.com/,
          /shop/,
          /store/
        ],
        contentIndicators: [
          'product', 'price', 'buy', 'cart', 'shop', 'store',
          'sale', 'discount', 'shipping', 'reviews'
        ],
        processing: {
          extractComments: true,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'product_analysis'
        }
      },
      
      'academic': {
        label: 'Academic',
        icon: '🎓',
        color: '#7C3AED',
        priority: 4,
        urlPatterns: [
          /scholar\.google\.com/,
          /jstor\.org/,
          /arxiv\.org/,
          /researchgate\.net/,
          /pubmed\.ncbi\.nlm\.nih\.gov/,
          /ieee\.org/,
          /acm\.org/,
          /university/,
          /edu/
        ],
        contentIndicators: [
          'research', 'study', 'paper', 'journal', 'academic',
          'university', 'scholar', 'thesis', 'publication'
        ],
        processing: {
          extractComments: false,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'research_analysis'
        }
      },
      
      'entertainment': {
        label: 'Entertainment',
        icon: '🎭',
        color: '#EC4899',
        priority: 3,
        urlPatterns: [
          /netflix\.com/,
          /hulu\.com/,
          /disneyplus\.com/,
          /spotify\.com/,
          /twitch\.tv/,
          /imdb\.com/,
          /music/,
          /movie/
        ],
        contentIndicators: [
          'movie', 'music', 'game', 'streaming', 'entertainment',
          'film', 'song', 'album', 'playlist'
        ],
        processing: {
          extractComments: true,
          extractTranscript: true,
          extractMetadata: true,
          specialHandling: 'media_analysis'
        }
      },
      
      'generic': {
        label: 'General',
        icon: '📄',
        color: '#6B7280',
        priority: 1,
        urlPatterns: [],
        contentIndicators: [],
        processing: {
          extractComments: false,
          extractTranscript: false,
          extractMetadata: true,
          specialHandling: 'general_analysis'
        }
      }
    };
    
    // UI category order (for consistent display)
    this.uiCategoryOrder = [
      'youtube', 'news', 'documentation', 'forum', 'blog', 
      'ecommerce', 'academic', 'entertainment', 'generic'
    ];
  }

  /**
   * Categorize a tab with enhanced analysis
   * @param {Object} tabData - {url, title, content, metadata}
   * @returns {Object} Categorization result
   */
  async categorizeTab(tabData) {
    const { url, title, content } = tabData;
    
    log('info', '[EnhancedCategorizer] Categorizing tab:', { 
      url, 
      title: title?.substring(0, 50) 
    });
    
    try {
      // Step 1: URL-based categorization (highest priority)
      const urlCategory = this.categorizeByURL(url);
      log('info', '[EnhancedCategorizer] URL category:', urlCategory);
      
      // Step 2: Content-based categorization
      const contentCategory = this.categorizeByContent(title, content);
      log('info', '[EnhancedCategorizer] Content category:', contentCategory);
      
      // Step 3: Combine results with intelligent weighting
      const finalCategory = this.combineCategories(urlCategory, contentCategory);
      log('info', '[EnhancedCategorizer] Final category:', finalCategory);
      
      return finalCategory;
      
    } catch (error) {
      log('error', '[EnhancedCategorizer] Categorization failed:', error);
      return this.getDefaultCategory();
    }
  }

  /**
   * Categorize based on URL patterns
   */
  categorizeByURL(url) {
    if (!url) return this.getDefaultCategory();
    
    for (const [categoryName, config] of Object.entries(this.categories)) {
      if (categoryName === 'generic') continue; // Skip generic
      
      for (const pattern of config.urlPatterns) {
        if (pattern.test(url)) {
          return {
            name: categoryName,
            confidence: 0.95, // High confidence for URL matches
            method: 'url',
            priority: config.priority,
            icon: config.icon,
            color: config.color,
            label: config.label,
            reasoning: `URL matches ${categoryName} pattern: ${pattern}`
          };
        }
      }
    }
    
    return this.getDefaultCategory();
  }

  /**
   * Categorize based on content analysis
   */
  categorizeByContent(title, content) {
    if (!title && !content) return null;
    
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    const scores = {};
    
    // Score each category based on content indicators
    for (const [categoryName, config] of Object.entries(this.categories)) {
      if (categoryName === 'generic') continue;
      
      let score = 0;
      config.contentIndicators.forEach(indicator => {
        const matches = (text.match(new RegExp(indicator, 'g')) || []).length;
        score += Math.min(matches, 3); // Cap at 3 per indicator
      });
      
      scores[categoryName] = score;
    }
    
    // Find highest scoring category
    const bestMatch = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (!bestMatch || bestMatch[1] === 0) {
      return null;
    }
    
    const [categoryName, score] = bestMatch;
    const config = this.categories[categoryName];
    
    return {
      name: categoryName,
      confidence: Math.min(score / 10, 0.8), // Max 0.8 for content-only
      method: 'content',
      priority: config.priority,
      icon: config.icon,
      color: config.color,
      label: config.label,
      reasoning: `Content analysis: ${score} matches for ${categoryName}`
    };
  }

  /**
   * Combine URL and content categorization results
   */
  combineCategories(urlCategory, contentCategory) {
    if (!contentCategory) {
      return urlCategory;
    }
    
    // If URL has high confidence and content agrees, use URL
    if (urlCategory.confidence > 0.9 && urlCategory.name === contentCategory.name) {
      return {
        ...urlCategory,
        method: 'url_content_agreement',
        reasoning: `URL and content both indicate ${urlCategory.name}`
      };
    }
    
    // If URL has high priority and content is uncertain, use URL
    if (urlCategory.priority > contentCategory.priority && contentCategory.confidence < 0.5) {
      return {
        ...urlCategory,
        method: 'url_priority',
        reasoning: `URL priority over uncertain content (${contentCategory.name})`
      };
    }
    
    // If content has high confidence and different from URL, use content
    if (contentCategory.confidence > 0.7 && contentCategory.name !== urlCategory.name) {
      return {
        ...contentCategory,
        method: 'content_override',
        reasoning: `Content override: ${contentCategory.reasoning} (URL was: ${urlCategory.name})`
      };
    }
    
    // Default to URL category
    return urlCategory;
  }

  /**
   * Get default category
   */
  getDefaultCategory() {
    const config = this.categories.generic;
    return {
      name: 'generic',
      confidence: 0.5,
      method: 'default',
      priority: config.priority,
      icon: config.icon,
      color: config.color,
      label: config.label,
      reasoning: 'No specific pattern matched, using generic category'
    };
  }

  /**
   * Get category configuration
   */
  getCategoryConfig(categoryName) {
    return this.categories[categoryName] || this.categories.generic;
  }

  /**
   * Get processing instructions for a category
   */
  getProcessingInstructions(categoryName) {
    const config = this.getCategoryConfig(categoryName);
    return config.processing;
  }

  /**
   * Get all categories for UI display
   */
  getUICategories() {
    return this.uiCategoryOrder.map(categoryName => ({
      id: categoryName,
      label: this.categories[categoryName].label,
      icon: this.categories[categoryName].icon,
      color: this.categories[categoryName].color
    }));
  }

  /**
   * Get category statistics
   */
  getCategoryStats(tabs) {
    const stats = {};
    
    // Initialize all categories
    Object.keys(this.categories).forEach(categoryName => {
      stats[categoryName] = {
        count: 0,
        label: this.categories[categoryName].label,
        icon: this.categories[categoryName].icon,
        color: this.categories[categoryName].color
      };
    });
    
    // Count tabs by category
    tabs.forEach(tab => {
      const category = tab.category || 'generic';
      if (stats[category]) {
        stats[category].count++;
      }
    });
    
    return stats;
  }

  /**
   * Validate category name
   */
  isValidCategory(categoryName) {
    return categoryName in this.categories;
  }

  /**
   * Get category display name
   */
  getCategoryLabel(categoryName) {
    return this.categories[categoryName]?.label || 'Unknown';
  }

  /**
   * Get category icon
   */
  getCategoryIcon(categoryName) {
    return this.categories[categoryName]?.icon || '📄';
  }

  /**
   * Get category color
   */
  getCategoryColor(categoryName) {
    return this.categories[categoryName]?.color || '#6B7280';
  }
}

// Export singleton instance
export const enhancedCategorizer = new EnhancedCategorizer();
