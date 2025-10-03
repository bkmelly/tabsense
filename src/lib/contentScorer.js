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
    const allText = content.sections
      .flatMap(s => s.content.map(c => c.text))
      .join(' ');
    
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
}

export default ContentScorer;

