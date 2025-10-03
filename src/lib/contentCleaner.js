/**
 * ContentCleaner - Text cleaning and normalization
 * Handles whitespace, characters, deduplication, and link processing
 */

export class ContentCleaner {
  constructor() {
    this.trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid',
      '_ga', '_gid',
      'mc_cid', 'mc_eid'
    ];
  }

  /**
   * Clean extracted content
   * @param {Object} content - Structured content from ContentExtractor
   * @param {Object} options - Cleaning options
   * @returns {Object} Cleaned content
   */
  clean(content, options = {}) {
    const opts = {
      normalizeWhitespace: true,
      normalizeCharacters: true,
      removeDuplicates: true,
      processLinks: true,
      ...options
    };
    
    console.log('[ContentCleaner] Starting cleaning with options:', opts);
    
    const cleaned = JSON.parse(JSON.stringify(content)); // Deep clone
    
    // Clean each section
    cleaned.sections = cleaned.sections.map(section => {
      return {
        ...section,
        heading: opts.normalizeWhitespace ? this.normalizeWhitespace(section.heading) : section.heading,
        content: section.content.map(item => ({
          ...item,
          text: this.cleanText(item.text, opts)
        }))
      };
    });
    
    // Remove duplicate content blocks
    if (opts.removeDuplicates) {
      cleaned.sections = this.removeDuplicateSections(cleaned.sections);
    }
    
    return cleaned;
  }

  /**
   * Clean individual text block
   */
  cleanText(text, opts) {
    let cleaned = text;
    
    if (opts.normalizeWhitespace) {
      cleaned = this.normalizeWhitespace(cleaned);
    }
    
    if (opts.normalizeCharacters) {
      cleaned = this.normalizeCharacters(cleaned);
    }
    
    if (opts.processLinks) {
      cleaned = this.processLinks(cleaned);
    }
    
    return cleaned;
  }

  /**
   * Normalize whitespace
   * - Collapse multiple spaces
   * - Normalize newlines
   * - Trim
   */
  normalizeWhitespace(text) {
    return text
      .replace(/\s+/g, ' ')           // Collapse multiple spaces
      .replace(/\n\s*\n/g, '\n')      // Collapse multiple newlines
      .trim();                         // Trim edges
  }

  /**
   * Normalize characters
   * - Remove non-printable characters
   * - Convert smart quotes to ASCII
   * - Normalize unicode
   */
  normalizeCharacters(text) {
    return text
      // Remove non-printable characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // Smart quotes to ASCII
      .replace(/[\u2018\u2019]/g, "'")  // Single quotes
      .replace(/[\u201C\u201D]/g, '"')  // Double quotes
      // Em/en dashes to hyphens
      .replace(/[\u2013\u2014]/g, '-')
      // Ellipsis
      .replace(/\u2026/g, '...')
      // Normalize unicode
      .normalize('NFKC');
  }

  /**
   * Process links
   * - Strip raw URLs but retain anchor text
   * - Remove tracking parameters
   */
  processLinks(text) {
    // Remove tracking parameters from URLs
    let processed = text;
    
    // Match URLs and remove tracking params
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processed = processed.replace(urlRegex, (url) => {
      return this.cleanUrl(url);
    });
    
    return processed;
  }

  /**
   * Clean URL by removing tracking parameters
   */
  cleanUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters
      this.trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (e) {
      // Invalid URL, return as-is
      return url;
    }
  }

  /**
   * Remove duplicate sections
   * Detects repeated blocks (menus, "related articles", etc.)
   */
  removeDuplicateSections(sections) {
    const seen = new Map();
    const unique = [];
    
    sections.forEach(section => {
      // Create hash of section content
      const contentText = section.content.map(c => c.text).join(' ');
      const hash = this.simpleHash(contentText);
      
      // Track frequency
      if (seen.has(hash)) {
        seen.set(hash, seen.get(hash) + 1);
      } else {
        seen.set(hash, 1);
        unique.push(section);
      }
    });
    
    // Filter out sections that appear multiple times (likely boilerplate)
    return unique.filter(section => {
      const contentText = section.content.map(c => c.text).join(' ');
      const hash = this.simpleHash(contentText);
      return seen.get(hash) === 1; // Only keep unique sections
    });
  }

  /**
   * Simple hash function for text comparison
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Remove repeated paragraphs within content
   */
  removeDuplicateParagraphs(content) {
    const seen = new Set();
    
    content.sections.forEach(section => {
      section.content = section.content.filter(item => {
        const normalized = this.normalizeWhitespace(item.text.toLowerCase());
        
        if (seen.has(normalized)) {
          return false; // Duplicate
        }
        
        seen.add(normalized);
        return true;
      });
    });
    
    return content;
  }
}

export default ContentCleaner;

