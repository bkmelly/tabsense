/**
 * ContentScorer - Page quality scoring and filtering
 * Implements quality checks to filter low-quality or thin content
 */

export class ContentScorer {
  constructor(options = {}) {
    this.thresholds = {
      minWordCount: options.minWordCount || 200,
      minContentDensity: options.minContentDensity || 0.1,
      maxLinkRatio: options.maxLinkRatio || 0.5,
      requireHeading: options.requireHeading !== false,
      ...options
    };
    
    console.log('[ContentScorer] Initialized with thresholds:', this.thresholds);
  }

  /**
   * Process and enhance metadata from extracted page data
   * @param {Object} pageData - Raw page data from content script
   * @returns {Object} Enhanced metadata with quality scoring
   */
  async processMetadata(pageData) {
    console.log('[ContentScorer] Processing metadata for:', pageData.url);
    
    const { url, title, metadata, content, structure } = pageData;
    
    // Score the content quality using existing scoring logic
    const qualityResult = this.score({
      content: content || { sections: [] },
      metadata: metadata || {},
      stats: {
        wordCount: this.getWordCount(content),
        contentDensity: this.calculateContentDensity(content),
        hasHeadings: this.hasHeadings(content)
      }
    });
    
    // Enhanced metadata with quality scoring
    const enhancedMetadata = {
      // Core information
      url: url,
      title: title || 'Untitled',
      domain: this.extractDomain(url),
      
      // Extracted metadata
      description: metadata?.description || '',
      author: metadata?.author || '',
      publishedTime: metadata?.publishedTime || '',
      modifiedTime: metadata?.modifiedTime || '',
      language: metadata?.language || 'en',
      
      // Content analysis
      wordCount: qualityResult.stats.wordCount,
      readingTime: this.calculateReadingTime(content),
      
      // Quality scoring (using existing logic)
      qualityScore: qualityResult.scores.overall,
      qualityPassed: qualityResult.passed,
      qualityReason: qualityResult.reason,
      
      // Enhanced fields
      tags: this.extractTags(metadata),
      topics: this.extractTopics(content, title),
      
      // Timestamps
      extractedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    console.log('[ContentScorer] Enhanced metadata with quality scoring:', enhancedMetadata);
    return enhancedMetadata;
  }

  /**
   * Score content quality
   * @param {Object} extractionResult - Result from ContentExtractor
   * @returns {Object} Scoring result with pass/fail and detailed scores
   */
  score(extractionResult) {
    console.log('[ContentScorer] Scoring content...');
    
    const { content, metadata, stats } = extractionResult;
    
    const scores = {
      wordCount: this.scoreWordCount(stats.wordCount),
      contentDensity: this.scoreContentDensity(stats.contentDensity),
      hasHeading: this.scoreHeading(stats.hasHeadings),
      linkRatio: this.scoreLinkRatio(content),
      overall: 0
    };
    
    // Calculate overall score (0-100)
    scores.overall = Math.round(
      (scores.wordCount.score * 0.3) +
      (scores.contentDensity.score * 0.3) +
      (scores.hasHeading.score * 0.2) +
      (scores.linkRatio.score * 0.2)
    );
    
    // Determine if content passes quality checks
    const passed = 
      scores.wordCount.pass &&
      scores.contentDensity.pass &&
      scores.hasHeading.pass &&
      scores.linkRatio.pass;
    
    const result = {
      passed,
      scores,
      stats,
      metadata,
      reason: passed ? 'Content meets quality standards' : this.getFailureReason(scores)
    };
    
    console.log('[ContentScorer] Result:', result);
    
    return result;
  }

  /**
   * Score word count
   */
  scoreWordCount(wordCount) {
    const pass = wordCount >= this.thresholds.minWordCount;
    
    let score = 0;
    if (wordCount >= 1000) score = 100;
    else if (wordCount >= 500) score = 80;
    else if (wordCount >= this.thresholds.minWordCount) score = 60;
    else score = Math.round((wordCount / this.thresholds.minWordCount) * 60);
    
    return {
      pass,
      score,
      value: wordCount,
      threshold: this.thresholds.minWordCount,
      message: pass ? 
        `Sufficient word count (${wordCount} words)` : 
        `Insufficient word count (${wordCount} < ${this.thresholds.minWordCount})`
    };
  }

  /**
   * Score content density (text/HTML ratio)
   */
  scoreContentDensity(density) {
    const densityValue = parseFloat(density);
    const pass = densityValue >= this.thresholds.minContentDensity;
    
    let score = 0;
    if (densityValue >= 0.3) score = 100;
    else if (densityValue >= 0.2) score = 80;
    else if (densityValue >= this.thresholds.minContentDensity) score = 60;
    else score = Math.round((densityValue / this.thresholds.minContentDensity) * 60);
    
    return {
      pass,
      score,
      value: densityValue,
      threshold: this.thresholds.minContentDensity,
      message: pass ? 
        `Good content density (${density})` : 
        `Low content density (${density} < ${this.thresholds.minContentDensity})`
    };
  }

  /**
   * Score heading presence
   */
  scoreHeading(hasHeadings) {
    const pass = this.thresholds.requireHeading ? hasHeadings : true;
    
    return {
      pass,
      score: hasHeadings ? 100 : 0,
      value: hasHeadings,
      threshold: this.thresholds.requireHeading,
      message: hasHeadings ? 
        'Has proper headings' : 
        'Missing headings'
    };
  }

  /**
   * Score link/text ratio
   */
  scoreLinkRatio(content) {
    let allText = '';
    
    // Handle both structured content (from ContentExtractor) and raw text (from service worker)
    if (content && typeof content === 'string') {
      // Raw text content from service worker
      allText = content;
    } else if (content && content.sections && Array.isArray(content.sections)) {
      // Structured content from ContentExtractor
      allText = content.sections
        .flatMap(s => s.content.map(c => c.text))
        .join(' ');
    } else {
      // Fallback for empty or invalid content
      allText = '';
    }
    
    // Count links (approximate)
    const linkMatches = allText.match(/https?:\/\/[^\s]+/g) || [];
    const linkCount = linkMatches.length;
    
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    
    const ratio = totalWords > 0 ? linkCount / totalWords : 0;
    const pass = ratio <= this.thresholds.maxLinkRatio;
    
    let score = 0;
    if (ratio <= 0.1) score = 100;
    else if (ratio <= 0.3) score = 80;
    else if (ratio <= this.thresholds.maxLinkRatio) score = 60;
    else score = Math.max(0, 100 - Math.round(ratio * 200));
    
    return {
      pass,
      score,
      value: ratio.toFixed(3),
      threshold: this.thresholds.maxLinkRatio,
      message: pass ? 
        `Acceptable link ratio (${(ratio * 100).toFixed(1)}%)` : 
        `Too many links (${(ratio * 100).toFixed(1)}% > ${this.thresholds.maxLinkRatio * 100}%)`
    };
  }

  /**
   * Get failure reason
   */
  getFailureReason(scores) {
    const failures = [];
    
    if (!scores.wordCount.pass) failures.push(scores.wordCount.message);
    if (!scores.contentDensity.pass) failures.push(scores.contentDensity.message);
    if (!scores.hasHeading.pass) failures.push(scores.hasHeading.message);
    if (!scores.linkRatio.pass) failures.push(scores.linkRatio.message);
    
    return failures.join('; ');
  }

  /**
   * Check if page is likely a directory/listing page
   */
  isDirectoryPage(content, metadata) {
    const title = metadata.title.toLowerCase();
    const directoryKeywords = [
      'category', 'archive', 'index', 'directory',
      'sitemap', 'search results', 'tag'
    ];
    
    return directoryKeywords.some(keyword => title.includes(keyword));
  }

  /**
   * Check if page has substantial unique content
   * Returns false for pages that are mostly templates/boilerplate
   */
  hasUniqueContent(content, threshold = 0.7) {
    const sections = content.sections;
    
    if (sections.length === 0) return false;
    
    // Count unique vs total paragraphs
    const allParagraphs = sections.flatMap(s => 
      s.content.filter(c => c.type === 'p').map(c => c.text)
    );
    
    const uniqueParagraphs = new Set(allParagraphs.map(p => 
      p.toLowerCase().trim()
    ));
    
    const uniqueRatio = uniqueParagraphs.size / allParagraphs.length;
    
    return uniqueRatio >= threshold;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.warn('[ContentScorer] Invalid URL for domain extraction:', url, error);
      return 'unknown';
    }
  }

  /**
   * Get word count from content
   */
  getWordCount(content) {
    let allText = '';
    
    // Handle both structured content (from ContentExtractor) and raw text (from service worker)
    if (content && typeof content === 'string') {
      // Raw text content from service worker
      allText = content;
    } else if (content && content.sections && Array.isArray(content.sections)) {
      // Structured content from ContentExtractor
      allText = content.sections
        .flatMap(s => s.content.map(c => c.text))
        .join(' ');
    } else {
      // Fallback for empty or invalid content
      return 0;
    }
    
    return allText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate content density
   */
  calculateContentDensity(content) {
    let allText = '';
    
    // Handle both structured content (from ContentExtractor) and raw text (from service worker)
    if (content && typeof content === 'string') {
      // Raw text content from service worker
      allText = content;
    } else if (content && content.sections && Array.isArray(content.sections)) {
      // Structured content from ContentExtractor
      allText = content.sections
        .flatMap(s => s.content.map(c => c.text))
        .join(' ');
    } else {
      // Fallback for empty or invalid content
      return 0;
    }
    
    const textLength = allText.length;
    const htmlLength = JSON.stringify(content).length;
    
    return htmlLength > 0 ? textLength / htmlLength : 0;
  }

  /**
   * Check if content has headings
   */
  hasHeadings(content) {
    // For raw text content from service worker, check for heading patterns
    if (content && typeof content === 'string') {
      // Look for common heading patterns in raw text
      const headingPatterns = [
        /^#{1,6}\s+/m,  // Markdown headers
        /<h[1-6][^>]*>/i,  // HTML headers
        /^[A-Z][A-Z\s]{10,}$/m  // ALL CAPS lines (common in articles)
      ];
      
      return headingPatterns.some(pattern => pattern.test(content));
    } else if (content && content.sections && Array.isArray(content.sections)) {
      // Structured content from ContentExtractor
      return content.sections.some(section => 
        section.content.some(item => 
          item.type === 'h1' || item.type === 'h2' || item.type === 'h3'
        )
      );
    }
    
    return false;
  }

  /**
   * Calculate estimated reading time
   */
  calculateReadingTime(content) {
    const wordCount = this.getWordCount(content);
    const wordsPerMinute = 200; // Average reading speed
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }

  /**
   * Extract tags from metadata
   */
  extractTags(metadata) {
    if (!metadata) return [];
    
    const tags = [];
    
    // Add keywords as tags
    if (metadata.keywords) {
      tags.push(...metadata.keywords.split(',').map(k => k.trim()).filter(k => k));
    }
    
    // Add article tags
    if (metadata.tags) {
      tags.push(...metadata.tags.split(',').map(t => t.trim()).filter(t => t));
    }
    
    // Add category as tag
    if (metadata.category) {
      tags.push(metadata.category);
    }
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }

  /**
   * Extract topics from content and title
   */
  extractTopics(content, title) {
    const topics = [];
    
    // Extract from title (simple keyword extraction)
    if (title) {
      const titleWords = title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 3); // Top 3 words from title
      topics.push(...titleWords);
    }
    
    // Extract from content (first few sentences)
    let allText = '';
    if (content && typeof content === 'string') {
      // Raw text content from service worker
      allText = content;
    } else if (content && content.sections && Array.isArray(content.sections)) {
      // Structured content from ContentExtractor
      allText = content.sections
        .flatMap(s => s.content.map(c => c.text))
        .join(' ');
    }
    
    if (allText) {
      const sentences = allText.split(/[.!?]+/).slice(0, 2);
      const contentWords = sentences.join(' ')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 5); // Top 5 words from content
      topics.push(...contentWords);
    }
    
    // Remove duplicates and return
    return [...new Set(topics)].slice(0, 8); // Max 8 topics
  }
}

export default ContentScorer;

