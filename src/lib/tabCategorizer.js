/**
 * Smart Tab Categorization System
 * Categorizes tabs based on URL patterns, content analysis, and AI classification
 */

class TabCategorizer {
  constructor(apiKey, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
    
    // URL-based category rules
    this.urlPatterns = {
      'youtube': {
        patterns: [
          /youtube\.com\/watch/,
          /youtube\.com\/channel/,
          /youtube\.com\/playlist/,
          /youtu\.be\//
        ],
        priority: 10,
        icon: '🎬',
        color: '#FF0000'
      },
      'news': {
        patterns: [
          /bbc\.com\/news/,
          /cnn\.com/,
          /reuters\.com/,
          /bloomberg\.com/,
          /nytimes\.com/,
          /washingtonpost\.com/,
          /theguardian\.com/,
          /npr\.org/,
          /wsj\.com/,
          /ft\.com/
        ],
        priority: 9,
        icon: '📰',
        color: '#1E40AF'
      },
      'social': {
        patterns: [
          /twitter\.com/,
          /x\.com/,
          /facebook\.com/,
          /instagram\.com/,
          /linkedin\.com/,
          /reddit\.com/,
          /tiktok\.com/
        ],
        priority: 8,
        icon: '💬',
        color: '#10B981'
      },
      'ecommerce': {
        patterns: [
          /amazon\.com/,
          /ebay\.com/,
          /shopify\.com/,
          /etsy\.com/,
          /alibaba\.com/,
          /walmart\.com/,
          /target\.com/
        ],
        priority: 7,
        icon: '🛒',
        color: '#F59E0B'
      },
      'academic': {
        patterns: [
          /scholar\.google\.com/,
          /jstor\.org/,
          /arxiv\.org/,
          /researchgate\.net/,
          /pubmed\.ncbi\.nlm\.nih\.gov/,
          /ieee\.org/,
          /acm\.org/
        ],
        priority: 6,
        icon: '🎓',
        color: '#7C3AED'
      },
      'reference': {
        patterns: [
          /wikipedia\.org/,
          /britannica\.com/,
          /dictionary\.com/,
          /merriam-webster\.com/,
          /investopedia\.com/
        ],
        priority: 5,
        icon: '📚',
        color: '#059669'
      },
      'developer': {
        patterns: [
          /github\.com/,
          /stackoverflow\.com/,
          /developer\.mozilla\.org/,
          /docs\.microsoft\.com/,
          /nodejs\.org/,
          /react\.dev/,
          /vue\.js/,
          /angular\.io/
        ],
        priority: 4,
        icon: '💻',
        color: '#DC2626'
      },
      'entertainment': {
        patterns: [
          /netflix\.com/,
          /hulu\.com/,
          /disneyplus\.com/,
          /spotify\.com/,
          /twitch\.tv/,
          /imdb\.com/
        ],
        priority: 3,
        icon: '🎭',
        color: '#EC4899'
      }
    };
  }

  /**
   * Categorize a tab based on URL and content
   */
  async categorizeTab(tabData) {
    const { url, title, content } = tabData;
    
    console.log('[TabCategorizer] Categorizing tab:', { url, title: title.substring(0, 50) });
    
    // Step 1: URL-based categorization
    const urlCategory = this.categorizeByURL(url);
    console.log('[TabCategorizer] URL category:', urlCategory);
    
    // Step 2: AI-powered content analysis for refinement
    let aiCategory = null;
    if (content && content.length > 100) {
      aiCategory = await this.categorizeByContent(title, content);
      console.log('[TabCategorizer] AI category:', aiCategory);
    }
    
    // Step 3: Combine results with priority
    const finalCategory = this.combineCategories(urlCategory, aiCategory);
    console.log('[TabCategorizer] Final category:', finalCategory);
    
    return finalCategory;
  }

  /**
   * Categorize based on URL patterns
   */
  categorizeByURL(url) {
    for (const [categoryName, config] of Object.entries(this.urlPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(url)) {
          return {
            name: categoryName,
            confidence: 0.9,
            method: 'url',
            priority: config.priority,
            icon: config.icon,
            color: config.color,
            reasoning: `URL matches ${categoryName} pattern`
          };
        }
      }
    }
    
    return {
      name: 'general',
      confidence: 0.5,
      method: 'url',
      priority: 1,
      icon: '📄',
      color: '#6B7280',
      reasoning: 'No specific URL pattern matched'
    };
  }

  /**
   * Use AI to categorize based on content
   */
  async categorizeByContent(title, content) {
    try {
      const prompt = `Analyze this web page content and categorize it into one of these categories:

Categories:
- youtube: Video content, tutorials, entertainment videos
- news: Current events, breaking news, journalism
- social: Social media posts, discussions, community content
- ecommerce: Shopping, product listings, reviews
- academic: Research papers, educational content, scholarly articles
- reference: Encyclopedias, dictionaries, informational content
- developer: Programming, technical documentation, code repositories
- entertainment: Movies, music, games, streaming content
- article: Blog posts, opinion pieces, long-form content
- general: Other content

Title: "${title}"
Content Preview: "${content.substring(0, 500)}"

Respond with only the category name and confidence (0-1), like: "news,0.8"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse AI response
      const [categoryName, confidenceStr] = aiResponse.split(',');
      const confidence = parseFloat(confidenceStr) || 0.5;
      
      // Get category config
      const categoryConfig = this.urlPatterns[categoryName] || {
        priority: 1,
        icon: '📄',
        color: '#6B7280'
      };
      
      return {
        name: categoryName || 'general',
        confidence: Math.min(Math.max(confidence, 0), 1),
        method: 'ai',
        priority: categoryConfig.priority,
        icon: categoryConfig.icon,
        color: categoryConfig.color,
        reasoning: `AI analysis: ${aiResponse}`
      };
    } catch (error) {
      console.error('[TabCategorizer] AI categorization failed:', error);
      return null;
    }
  }

  /**
   * Combine URL and AI categorization results
   */
  combineCategories(urlCategory, aiCategory) {
    if (!aiCategory) {
      return urlCategory;
    }
    
    // If AI confidence is high and different from URL, use AI
    if (aiCategory.confidence > 0.7 && aiCategory.name !== urlCategory.name) {
      return {
        ...aiCategory,
        method: 'ai_override',
        reasoning: `AI override: ${aiCategory.reasoning} (URL was: ${urlCategory.name})`
      };
    }
    
    // If URL has high priority and AI is uncertain, use URL
    if (urlCategory.priority > aiCategory.priority && aiCategory.confidence < 0.6) {
      return {
        ...urlCategory,
        method: 'url_priority',
        reasoning: `URL priority: ${urlCategory.reasoning} (AI was: ${aiCategory.name})`
      };
    }
    
    // Use AI if it has higher confidence
    if (aiCategory.confidence > urlCategory.confidence) {
      return {
        ...aiCategory,
        method: 'ai_preferred',
        reasoning: `AI preferred: ${aiCategory.reasoning}`
      };
    }
    
    return urlCategory;
  }

  /**
   * Get category-specific processing instructions
   */
  getCategoryInstructions(categoryName) {
    const instructions = {
      'youtube': {
        extractComments: true,
        extractTranscript: true,
        extractMetadata: true,
        specialHandling: 'comment_analysis'
      },
      'news': {
        extractComments: false,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'news_analysis'
      },
      'social': {
        extractComments: true,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'social_analysis'
      },
      'ecommerce': {
        extractComments: true,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'product_analysis'
      },
      'academic': {
        extractComments: false,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'research_analysis'
      },
      'reference': {
        extractComments: false,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'reference_analysis'
      },
      'developer': {
        extractComments: true,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'code_analysis'
      },
      'entertainment': {
        extractComments: true,
        extractTranscript: true,
        extractMetadata: true,
        specialHandling: 'media_analysis'
      },
      'article': {
        extractComments: false,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'article_analysis'
      },
      'general': {
        extractComments: false,
        extractTranscript: false,
        extractMetadata: true,
        specialHandling: 'general_analysis'
      }
    };
    
    return instructions[categoryName] || instructions['general'];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabCategorizer;
}
