/**
 * PageClassifier - Detects page type for adaptive summarization
 * Uses heuristics + content analysis to classify web pages
 */

export class PageClassifier {
  constructor() {
    this.classificationRules = {
      news: {
        indicators: [
          'breaking', 'report', 'story', 'headline', 'journalism', 
          'press', 'media', 'reporter', 'correspondent', 'byline'
        ],
        selectors: ['.news', '.story', '.post', '.article-content', '.news-content'],
        urlPatterns: [/news/, /breaking/, /report/, /story/, /journalism/],
        titlePatterns: [/breaking/, /news/, /report/, /story/, /journalism/],
        priority: 5  // Lower priority than reference
      },
      
      blog: {
        indicators: [
          'blog', 'post', 'opinion', 'editorial', 'commentary',
          'author', 'writer', 'personal', 'thoughts'
        ],
        selectors: ['.blog', '.post', '.entry', '.article', 'main'],
        urlPatterns: [/blog/, /post/, /opinion/, /editorial/],
        titlePatterns: [/opinion/, /thoughts/, /editorial/]
      },
      
      forum: {
        indicators: [
          'comment', 'reply', 'discussion', 'thread', 'post',
          'reddit', 'quora', 'forum', 'community'
        ],
        selectors: ['.comment', '.reply', '.thread', '.discussion'],
        urlPatterns: [/reddit/, /quora/, /forum/, /discussion/],
        titlePatterns: [/discussion/, /thread/, /comments/]
      },
      
      ecommerce: {
        indicators: [
          'product', 'price', 'buy', 'cart', 'shop', 'store',
          'sale', 'discount', 'shipping', 'reviews'
        ],
        selectors: ['.product', '.price', '.buy', '.cart', '.shop'],
        urlPatterns: [/shop/, /store/, /product/, /buy/],
        titlePatterns: [/buy/, /shop/, /product/]
      },
      
      reference: {
        indicators: [
          'wiki', 'encyclopedia', 'reference', 'documentation',
          'guide', 'manual', 'tutorial', 'help', 'wikipedia',
          'encyclopedia', 'knowledge', 'information', 'facts'
        ],
        selectors: ['#content', '.wiki', '.reference', '.documentation', '#mw-content-text', '.mw-parser-output'],
        urlPatterns: [/wiki/, /reference/, /docs/, /guide/, /wikipedia/, /encyclopedia/],
        titlePatterns: [/wiki/, /reference/, /guide/, /wikipedia/, /encyclopedia/],
        priority: 10  // High priority for Wikipedia
      },
      
      academic: {
        indicators: [
          'research', 'study', 'paper', 'journal', 'academic',
          'university', 'scholar', 'thesis', 'publication'
        ],
        selectors: ['.research', '.paper', '.study', '.academic'],
        urlPatterns: [/research/, /academic/, /journal/, /paper/],
        titlePatterns: [/research/, /study/, /paper/]
      },
      
      youtube: {
        indicators: [
          'video', 'youtube', 'watch', 'channel', 'subscribe',
          'views', 'likes', 'comments', 'playlist', 'upload'
        ],
        selectors: ['#player', '#primary', '#comments', '.ytd-video-primary-info-renderer'],
        urlPatterns: [/youtube\.com\/watch/, /youtu\.be/, /youtube\.com\/channel/],
        titlePatterns: [/video/, /speech/, /address/, /interview/, /debate/],
        priority: 15  // Highest priority for YouTube videos
      }
    };
  }

  /**
   * Classify a page based on URL, title, and content
   * @param {Object} pageData - {url, title, content, metadata}
   * @returns {Object} {type, confidence, reasoning}
   */
  classify(pageData) {
    const { url, title, content, metadata } = pageData;
    
    console.log('[PageClassifier] Classifying page:', { url, title });
    
    const scores = {};
    const reasoning = {};
    
    // Score each page type
    for (const [type, rules] of Object.entries(this.classificationRules)) {
      scores[type] = 0;
      reasoning[type] = [];
      
      // URL analysis
      const urlScore = this.scoreUrl(url, rules);
      scores[type] += urlScore;
      if (urlScore > 0) reasoning[type].push(`URL: ${urlScore} points`);
      
      // Title analysis
      const titleScore = this.scoreTitle(title, rules);
      scores[type] += titleScore;
      if (titleScore > 0) reasoning[type].push(`Title: ${titleScore} points`);
      
      // Content analysis
      const contentScore = this.scoreContent(content, rules);
      scores[type] += contentScore;
      if (contentScore > 0) reasoning[type].push(`Content: ${contentScore} points`);
      
      // Metadata analysis
      const metadataScore = this.scoreMetadata(metadata, rules);
      scores[type] += metadataScore;
      if (metadataScore > 0) reasoning[type].push(`Metadata: ${metadataScore} points`);
    }
    
    // Find best match with priority consideration
    const sortedTypes = Object.entries(scores)
      .map(([type, score]) => ({
        type,
        score,
        priority: this.classificationRules[type].priority || 1
      }))
      .sort((a, b) => {
        // First sort by priority (higher priority wins)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Then by score (higher score wins)
        return b.score - a.score;
      });
    
    const bestMatch = sortedTypes[0];
    const confidence = Math.min(bestMatch.score / 10, 1); // Normalize to 0-1
    
    // Enhanced confidence thresholds based on page type
    const confidenceThresholds = {
      reference: 0.4,  // Wikipedia needs high confidence
      academic: 0.5,   // Research papers need very high confidence
      news: 0.3,       // News can be lower confidence
      blog: 0.25,      // Blogs can be lower confidence
      ecommerce: 0.35, // E-commerce needs medium confidence
      forum: 0.2,      // Forums can be low confidence
      generic: 0.1     // Generic is always available
    };
    
    const threshold = confidenceThresholds[bestMatch.type] || 0.3;
    const finalType = confidence > threshold ? bestMatch.type : 'generic';
    
    console.log('[PageClassifier] Classification result:', {
      type: finalType,
      confidence: confidence.toFixed(2),
      scores,
      reasoning: reasoning[bestMatch.type],
      priority: bestMatch.priority,
      sortedTypes: sortedTypes.slice(0, 3).map(t => ({type: t.type, score: t.score, priority: t.priority}))
    });
    
    return {
      type: finalType,
      confidence,
      scores,
      reasoning: reasoning[bestMatch.type] || ['Low confidence, using generic template']
    };
  }

  /**
   * Score URL against classification rules
   */
  scoreUrl(url, rules) {
    let score = 0;
    const urlLower = url.toLowerCase();
    
    // Check URL patterns
    rules.urlPatterns.forEach(pattern => {
      if (pattern.test(urlLower)) score += 3;
    });
    
    // Check URL indicators
    rules.indicators.forEach(indicator => {
      if (urlLower.includes(indicator)) score += 2;
    });
    
    return score;
  }

  /**
   * Score title against classification rules
   */
  scoreTitle(title, rules) {
    let score = 0;
    const titleLower = title.toLowerCase();
    
    // Check title patterns
    rules.titlePatterns.forEach(pattern => {
      if (pattern.test(titleLower)) score += 2;
    });
    
    // Check title indicators
    rules.indicators.forEach(indicator => {
      if (titleLower.includes(indicator)) score += 1;
    });
    
    return score;
  }

  /**
   * Score content against classification rules with enhanced analysis
   */
  scoreContent(content, rules) {
    let score = 0;
    const contentLower = content.toLowerCase();
    
    // Basic indicator matching
    rules.indicators.forEach(indicator => {
      const matches = (contentLower.match(new RegExp(indicator, 'g')) || []).length;
      score += Math.min(matches, 3); // Cap at 3 per indicator
    });
    
    // Enhanced content analysis
    score += this.analyzeContentStructure(content, rules);
    score += this.analyzeContentDensity(content, rules);
    score += this.analyzeContentPatterns(content, rules);
    
    return score;
  }

  /**
   * Analyze content structure for better classification
   */
  analyzeContentStructure(content, rules) {
    let score = 0;
    
    // News-specific structure analysis
    if (rules.indicators.includes('breaking') || rules.indicators.includes('journalism')) {
      // Look for news patterns: datelines, bylines, quotes
      if (content.match(/\d{1,2}:\d{2}\s*(AM|PM)/)) score += 2; // Time stamps
      if (content.match(/by\s+[A-Z][a-z]+\s+[A-Z][a-z]+/)) score += 2; // Bylines
      if (content.match(/"[^"]{20,}"/)) score += 1; // Quotes
    }
    
    // Reference-specific structure analysis
    if (rules.indicators.includes('wiki') || rules.indicators.includes('encyclopedia')) {
      // Look for reference patterns: definitions, facts, citations
      if (content.match(/is\s+(a|an|the)\s+[^.]{10,}\./)) score += 2; // Definitions
      if (content.match(/\[\d+\]/)) score += 2; // Citations
      if (content.match(/according\s+to|sources\s+say/)) score += 1; // References
    }
    
    // E-commerce-specific structure analysis
    if (rules.indicators.includes('product') || rules.indicators.includes('price')) {
      // Look for e-commerce patterns: prices, add to cart, reviews
      if (content.match(/\$\d+\.?\d*/)) score += 3; // Prices
      if (content.match(/add\s+to\s+cart|buy\s+now/i)) score += 2; // CTAs
      if (content.match(/reviews?|ratings?/i)) score += 1; // Reviews
    }
    
    return score;
  }

  /**
   * Analyze content density for classification hints
   */
  analyzeContentDensity(content, rules) {
    let score = 0;
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // News typically has shorter, punchier sentences
    if (rules.indicators.includes('breaking') && avgWordsPerSentence < 20) {
      score += 1;
    }
    
    // Academic content has longer, complex sentences
    if (rules.indicators.includes('research') && avgWordsPerSentence > 25) {
      score += 1;
    }
    
    // Reference content has medium-length, factual sentences
    if (rules.indicators.includes('wiki') && avgWordsPerSentence >= 15 && avgWordsPerSentence <= 25) {
      score += 1;
    }
    
    return score;
  }

  /**
   * Analyze content patterns for better classification
   */
  analyzeContentPatterns(content, rules) {
    let score = 0;
    
    // Look for specific patterns that indicate page type
    const patterns = {
      news: [
        /breaking\s+news/i,
        /exclusive\s+report/i,
        /sources\s+tell/i,
        /according\s+to\s+sources/i
      ],
      reference: [
        /according\s+to\s+the\s+encyclopedia/i,
        /is\s+defined\s+as/i,
        /refers\s+to/i,
        /is\s+a\s+country|state|city/i
      ],
      academic: [
        /research\s+shows/i,
        /study\s+finds/i,
        /according\s+to\s+the\s+study/i,
        /peer-reviewed/i
      ],
      ecommerce: [
        /free\s+shipping/i,
        /limited\s+time\s+offer/i,
        /add\s+to\s+cart/i,
        /buy\s+now/i
      ]
    };
    
    // Check patterns for each page type
    Object.entries(patterns).forEach(([type, typePatterns]) => {
      if (rules.indicators.some(indicator => 
        ['breaking', 'journalism', 'press'].includes(indicator) && type === 'news' ||
        ['wiki', 'encyclopedia', 'reference'].includes(indicator) && type === 'reference' ||
        ['research', 'study', 'academic'].includes(indicator) && type === 'academic' ||
        ['product', 'price', 'buy'].includes(indicator) && type === 'ecommerce'
      )) {
        typePatterns.forEach(pattern => {
          if (pattern.test(content)) score += 2;
        });
      }
    });
    
    return score;
  }

  /**
   * Score metadata against classification rules
   */
  scoreMetadata(metadata, rules) {
    let score = 0;
    
    if (metadata.description) {
      const descLower = metadata.description.toLowerCase();
      rules.indicators.forEach(indicator => {
        if (descLower.includes(indicator)) score += 1;
      });
    }
    
    if (metadata.author) {
      const authorLower = metadata.author.toLowerCase();
      if (authorLower.includes('reporter') || authorLower.includes('journalist')) {
        score += 2; // News indicator
      }
    }
    
    return score;
  }

  /**
   * Get template configuration for page type
   */
  getTemplateConfig(pageType) {
    const templates = {
      news: {
        sections: ['headline', 'summary', 'key_facts', 'quotes'],
        maxLengths: { summary: 3, key_facts: 6, quotes: 4 },
        structure: 'news'
      },
      
      blog: {
        sections: ['main_argument', 'supporting_points', 'author_stance'],
        maxLengths: { main_argument: 2, supporting_points: 5, author_stance: 1 },
        structure: 'blog'
      },
      
      forum: {
        sections: ['original_post', 'main_themes', 'sentiment'],
        maxLengths: { original_post: 3, main_themes: 5, sentiment: 2 },
        structure: 'forum'
      },
      
      ecommerce: {
        sections: ['product_name', 'features', 'price', 'cta'],
        maxLengths: { features: 6, price: 1, cta: 2 },
        structure: 'product'
      },
      
      reference: {
        sections: ['overview', 'key_points', 'context', 'details', 'timeline'],
        maxLengths: { overview: 3, key_points: 6, context: 2, details: 8, timeline: 5 },
        structure: 'reference'
      },
      
      academic: {
        sections: ['research_question', 'methodology', 'findings', 'implications'],
        maxLengths: { research_question: 1, methodology: 3, findings: 5, implications: 3 },
        structure: 'academic'
      },
      
      generic: {
        sections: ['overview', 'key_points', 'details'],
        maxLengths: { overview: 3, key_points: 6, details: 8 },
        structure: 'generic'
      }
    };
    
    return templates[pageType] || templates.generic;
  }
}

export default PageClassifier;
