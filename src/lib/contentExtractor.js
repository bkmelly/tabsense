/**
 * ContentExtractor - DOM-aware content extraction
 * Implements extraction with Readability.js fallback
 */

export class ContentExtractor {
  constructor() {
    this.prioritySelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '#content'
    ];
    
    this.keepSelectors = [
      'h1', 'h2', 'h3',
      'p',
      'ul', 'ol', 'li',
      'blockquote',
      'pre', 'code'
    ];
    
    this.discardSelectors = [
      'nav',
      'aside',
      'footer',
      'header',
      '.nav',
      '.navigation',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ad',
      '.social-share',
      '.comments',
      '.related',
      '[role="navigation"]',
      '[role="complementary"]'
    ];
  }

  /**
   * Extract main content from document
   * @param {Document} doc - The document to extract from
   * @returns {Object} Extraction result with content, metadata, and stats
   */
  extract(doc) {
    console.log('[ContentExtractor] Starting extraction...');
    
    // Try priority selectors first
    let contentElement = this.findContentElement(doc);
    
    // If no content found, try Readability.js
    if (!contentElement) {
      console.log('[ContentExtractor] No priority element found, using Readability fallback');
      return this.extractWithReadability(doc);
    }
    
    console.log('[ContentExtractor] Found content element:', contentElement.tagName);
    
    // Clone to avoid modifying original DOM
    const clone = contentElement.cloneNode(true);
    
    // Remove unwanted elements
    this.removeUnwantedElements(clone);
    
    // Extract structured content
    const content = this.extractStructuredContent(clone);
    
    // Extract metadata
    const metadata = this.extractMetadata(doc);
    
    // Calculate stats
    const stats = this.calculateStats(content, doc);
    
    return {
      success: true,
      content,
      metadata,
      stats,
      method: 'dom-aware'
    };
  }

  /**
   * Find the main content element using priority selectors
   */
  findContentElement(doc) {
    for (const selector of this.prioritySelectors) {
      const element = doc.querySelector(selector);
      if (element && this.hasSubstantialContent(element)) {
        return element;
      }
    }
    return null;
  }

  /**
   * Check if element has substantial content
   */
  hasSubstantialContent(element) {
    const text = element.textContent.trim();
    const wordCount = text.split(/\s+/).length;
    return wordCount > 50; // Minimum threshold
  }

  /**
   * Remove unwanted elements from content
   */
  removeUnwantedElements(element) {
    // Remove by selector
    this.discardSelectors.forEach(selector => {
      element.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    // Remove hidden elements
    element.querySelectorAll('[hidden], [aria-hidden="true"]').forEach(el => el.remove());
    
    // Remove empty elements
    element.querySelectorAll('p, div, span').forEach(el => {
      if (!el.textContent.trim()) {
        el.remove();
      }
    });
  }

  /**
   * Extract structured content with headings and paragraphs
   */
  extractStructuredContent(element) {
    const content = {
      title: '',
      sections: []
    };
    
    let currentSection = null;
    
    // Get all relevant elements in order
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (this.keepSelectors.some(s => node.matches(s))) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      const tagName = node.tagName.toLowerCase();
      const text = node.textContent.trim();
      
      if (!text) continue;
      
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        // Start new section
        currentSection = {
          heading: text,
          level: tagName,
          content: []
        };
        content.sections.push(currentSection);
      } else if (currentSection) {
        // Add to current section
        currentSection.content.push({
          type: tagName,
          text: text
        });
      } else {
        // No section yet, add to root
        if (!currentSection) {
          currentSection = {
            heading: '',
            level: 'root',
            content: []
          };
          content.sections.push(currentSection);
        }
        currentSection.content.push({
          type: tagName,
          text: text
        });
      }
    }
    
    return content;
  }

  /**
   * Extract metadata (title, author, date, description)
   */
  extractMetadata(doc) {
    const metadata = {
      title: '',
      author: '',
      date: '',
      description: '',
      url: doc.location?.href || ''
    };
    
    // Title - try multiple sources
    metadata.title = 
      doc.querySelector('meta[property="og:title"]')?.content ||
      doc.querySelector('meta[name="twitter:title"]')?.content ||
      doc.querySelector('h1')?.textContent?.trim() ||
      doc.title ||
      '';
    
    // Author
    metadata.author = 
      doc.querySelector('meta[name="author"]')?.content ||
      doc.querySelector('meta[property="article:author"]')?.content ||
      doc.querySelector('[rel="author"]')?.textContent?.trim() ||
      '';
    
    // Date
    metadata.date = 
      doc.querySelector('meta[property="article:published_time"]')?.content ||
      doc.querySelector('meta[name="date"]')?.content ||
      doc.querySelector('time')?.getAttribute('datetime') ||
      doc.querySelector('time')?.textContent?.trim() ||
      '';
    
    // Description
    metadata.description = 
      doc.querySelector('meta[property="og:description"]')?.content ||
      doc.querySelector('meta[name="description"]')?.content ||
      '';
    
    return metadata;
  }

  /**
   * Calculate content statistics
   */
  calculateStats(content, doc) {
    const allText = content.sections
      .flatMap(s => s.content.map(c => c.text))
      .join(' ');
    
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const chars = allText.length;
    
    // Calculate content density (text vs HTML size)
    const htmlSize = doc.documentElement.innerHTML.length;
    const density = chars / htmlSize;
    
    return {
      wordCount: words.length,
      charCount: chars,
      sectionCount: content.sections.length,
      htmlSize: htmlSize,
      contentDensity: density.toFixed(3),
      hasHeadings: content.sections.some(s => s.heading)
    };
  }

  /**
   * Fallback to Readability.js extraction
   * Note: Readability is loaded externally in the content script
   */
  extractWithReadability(doc) {
    try {
      // This will be called in context where Readability is available
      if (typeof Readability === 'undefined') {
        throw new Error('Readability library not available');
      }
      
      const reader = new Readability(doc.cloneNode(true));
      const article = reader.parse();
      
      if (!article) {
        throw new Error('Readability failed to parse article');
      }
      
      // Convert to our format
      const content = {
        title: article.title,
        sections: [{
          heading: '',
          level: 'root',
          content: [{
            type: 'text',
            text: article.textContent
          }]
        }]
      };
      
      const metadata = {
        title: article.title,
        author: article.byline || '',
        date: '',
        description: article.excerpt || '',
        url: doc.location?.href || ''
      };
      
      const stats = {
        wordCount: article.textContent.split(/\s+/).length,
        charCount: article.textContent.length,
        sectionCount: 1,
        htmlSize: doc.documentElement.innerHTML.length,
        contentDensity: (article.textContent.length / doc.documentElement.innerHTML.length).toFixed(3),
        hasHeadings: true
      };
      
      return {
        success: true,
        content,
        metadata,
        stats,
        method: 'readability'
      };
      
    } catch (error) {
      console.error('[ContentExtractor] Readability extraction failed:', error);
      return {
        success: false,
        error: error.message,
        method: 'readability'
      };
    }
  }

  /**
   * Convert structured content to plain text
   */
  toPlainText(content) {
    const parts = [];
    
    if (content.title) {
      parts.push(content.title);
      parts.push('');
    }
    
    content.sections.forEach(section => {
      if (section.heading) {
        parts.push(section.heading);
        parts.push('');
      }
      
      section.content.forEach(item => {
        parts.push(item.text);
      });
      
      parts.push(''); // Section separator
    });
    
    return parts.join('\n');
  }
}

export default ContentExtractor;

