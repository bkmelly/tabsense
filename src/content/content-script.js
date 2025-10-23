/**
 * TabSense Content Script - Milestone 2
 * Enhanced content script for page extraction and communication
 */

// Import Readability for content extraction
import { Readability } from '@mozilla/readability';
import { YouTubeExtractor } from '../lib/youtubeExtractor.js';
import { CommentNavigator } from '../lib/commentNavigator.js';

// Simple logging function for content script
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  switch (level) {
    case 'error':
      console.error(logMessage, data);
      break;
    case 'warn':
      console.warn(logMessage, data);
      break;
    default:
      console.log(logMessage, data);
  }
}

// Initialize content script
log('info', 'TabSense content script loaded on:', location.href);
console.log('[TabSense] Content script loaded successfully on:', location.href);
console.log('[TabSense] Document ready state:', document.readyState);
console.log('[TabSense] YouTube detection:', location.href.includes('youtube.com'));

/**
 * Page Data Extractor Class
 * Handles extraction of page content, metadata, and communication with service worker
 */
class PageDataExtractor {
  constructor() {
    this.pageData = null;
    this.isExtracting = false;
    this.setupMessageListener();
  }

  /**
   * Extract comprehensive page data
   * @returns {Object} Page data including title, URL, content, metadata
   */
  async extractPageData() {
    if (this.isExtracting) {
      log('warn', 'Page extraction already in progress');
      return this.pageData;
    }

    this.isExtracting = true;
    log('info', 'Starting page data extraction');

    try {
      const pageData = {
        // Basic page information
        url: location.href,
        title: document.title,
        domain: location.hostname,
        timestamp: Date.now(),

        // Content extraction
        content: await this.extractReadableContent(),
        
        // Metadata
        metadata: this.extractMetadata(),
        
        // Page structure
        structure: this.extractPageStructure(),
        
        // Images and media
        media: this.extractMediaInfo()
      };

      this.pageData = pageData;
      log('info', 'Page data extraction completed', {
        url: pageData.url,
        title: pageData.title,
        contentLength: pageData.content.length,
        hasImages: pageData.media.images.length > 0
      });

      return pageData;

    } catch (error) {
      log('error', 'Page data extraction failed', error);
      throw error;
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Extract readable content using Mozilla Readability
   * @returns {Promise<string>} Clean, readable text content
   */
  async extractReadableContent() {
    try {
      // Try to use Readability if available (bundled with extension)
      if (typeof Readability !== 'undefined') {
        // Check if document is too complex for Readability
        const elementCount = document.querySelectorAll('*').length;
        
        if (elementCount > 2000) {
          log('warn', `Document too complex for Readability (${elementCount} elements), using enhanced fallback`);
          return this.extractEnhancedContent();
        }
        
        // Create a clone of the document for processing
        const documentClone = document.cloneNode(true);
        
        // Create Readability instance with optimized settings
        const reader = new Readability(documentClone, {
          debug: false,
          maxElemsToParse: Math.min(elementCount, 1500), // Dynamic limit based on complexity
          nbTopCandidates: 5,
          charThreshold: 500,
          classesToPreserve: ['caption', 'emoji', 'hidden'],
          // Additional options for better handling
          keepClasses: false,
          serializer: null
        });
        
        // Parse the document
        const article = reader.parse();
        
        if (article && article.textContent && article.textContent.length > 100) {
          log('info', 'Readability extraction successful', {
            title: article.title,
            length: article.textContent.length,
            excerpt: article.excerpt,
            elementCount: elementCount
          });
          
          return article.textContent || article.content || '';
        } else {
          log('warn', 'Readability extracted insufficient content, using enhanced fallback');
          return this.extractEnhancedContent();
        }
      }
      
      log('warn', 'Readability not available, using enhanced fallback');
      return this.extractEnhancedContent();
      
    } catch (error) {
      log('error', 'Readability extraction failed, using enhanced fallback', error);
      return this.extractEnhancedContent();
    }
  }

  /**
   * Clean extracted content to remove navigation and metadata
   */
  cleanExtractedContent(text) {
    if (!text) return '';
    
    // Remove common patterns that indicate navigation/metadata
    const patterns = [
      /Categories:.*?(?=\n\n|\n===|$)/gs,
      /Hidden categories:.*?(?=\n\n|\n===|$)/gs,
      /Skip to content.*?(?=\n\n|\n===|$)/gs,
      /For Customers.*?(?=\n\n|\n===|$)/gs,
      /Support.*?(?=\n\n|\n===|$)/gs,
      /Follow.*?(?=\n\n|\n===|$)/gs,
      /Products.*?(?=\n\n|\n===|$)/gs,
      /Company.*?(?=\n\n|\n===|$)/gs,
      /Media.*?(?=\n\n|\n===|$)/gs,
      /Bloomberg.*?(?=\n\n|\n===|$)/gs,
      /^\s*===.*?===\s*$/gm,
      /^\s*\d+\s*$/gm,
      /^\s*[A-Z\s]{2,20}\s*$/gm,
      /Facebook|Instagram|LinkedIn|YouTube|Twitter/i,
      /r\/\w+.*?(?=\n\n|\n===|$)/gs,
      /\d+\s+(hours?|minutes?|days?)\s+ago.*?(?=\n|$)/gi
    ];
    
    let cleaned = text;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned.trim();
  }

  /**
   * Enhanced content extraction for complex pages
   * @returns {string} Enhanced text content
   */
  extractEnhancedContent() {
    log('info', 'Using enhanced content extraction for complex page');
    
    try {
      // Remove unwanted elements
      const unwantedSelectors = [
        'script', 'style', 'noscript', 'nav', 'header', 'footer',
        '.advertisement', '.ads', '.ad', '.sidebar', '.menu',
        '.navigation', '.nav', '.footer', '.header', '.social',
        '.share', '.comments', '.related', '.recommended',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.cookie-banner', '.popup', '.modal', '.overlay'
      ];
      
      unwantedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      // Try multiple strategies for content extraction
      const strategies = [
        // Strategy 1: Main content areas (prioritize article content)
        () => {
          const mainSelectors = [
            'article', 'main', '[role="main"]', '.article-content', '.post-content',
            '.entry-content', '.content', '#content', '#main-content',
            '.story', '.article', '.post', '.page-content', '.news-content',
            '.story-body', '.article-body', '.post-body'
          ];
          
          for (const selector of mainSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              // Clean the content before returning
              const text = this.cleanExtractedContent(element.textContent || element.innerText || '');
              if (text.length > 300) {
                log('info', `Found content using main selector: ${selector}`);
                return text;
              }
            }
          }
          return null;
        },
        
        // Strategy 2: Largest text blocks
        () => {
          const textBlocks = Array.from(document.querySelectorAll('p, div, section'))
            .map(el => ({
              element: el,
              text: el.textContent || el.innerText || '',
              length: (el.textContent || el.innerText || '').length
            }))
            .filter(block => block.length > 100)
            .sort((a, b) => b.length - a.length);
          
          if (textBlocks.length > 0) {
            const topBlocks = textBlocks.slice(0, 5);
            const combinedText = topBlocks.map(block => block.text).join('\n\n');
            log('info', `Found content using text blocks strategy: ${textBlocks.length} blocks`);
            return combinedText;
          }
          return null;
        },
        
        // Strategy 3: Headings and paragraphs
        () => {
          const contentElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
          const textParts = Array.from(contentElements)
            .map(el => el.textContent || el.innerText || '')
            .filter(text => text.length > 20)
            .slice(0, 20); // Limit to prevent too much content
          
          if (textParts.length > 0) {
            const combinedText = textParts.join('\n\n');
            log('info', `Found content using headings/paragraphs strategy: ${textParts.length} elements`);
            return combinedText;
          }
          return null;
        }
      ];
      
      // Try each strategy
      for (const strategy of strategies) {
        try {
          const content = strategy();
          if (content && content.length > 200) {
            return this.cleanTextContent(content);
          }
        } catch (error) {
          log('warn', 'Strategy failed', error);
        }
      }
      
      // Final fallback
      log('warn', 'All strategies failed, using basic fallback');
      return this.extractBasicContent();
      
    } catch (error) {
      log('error', 'Enhanced content extraction failed', error);
      return this.extractBasicContent();
    }
  }

  /**
   * Fallback content extraction method
   * @returns {string} Basic text content
   */
  extractBasicContent() {
    try {
      // Remove script and style elements
      const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside');
      elementsToRemove.forEach(el => el.remove());

      // Get text content from main content areas
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#content',
        '.main-content'
      ];

      let content = '';
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = element.textContent || element.innerText || '';
          if (content.length > 100) break; // Use first substantial content found
        }
      }

      // Fallback to body if no specific content found
      if (!content || content.length < 100) {
        content = document.body.textContent || document.body.innerText || '';
      }

      // Clean up the content
      content = content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();

      log('info', 'Basic content extraction completed', {
        length: content.length,
        preview: content.substring(0, 200) + '...'
      });

      return content;

    } catch (error) {
      log('error', 'Basic content extraction failed', error);
      return document.title || 'Content extraction failed';
    }
  }

  /**
   * Extract page metadata
   * @returns {Object} Page metadata
   */
  extractMetadata() {
    const metadata = {
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      author: this.getMetaContent('author'),
      publishedTime: this.getMetaContent('article:published_time'),
      modifiedTime: this.getMetaContent('article:modified_time'),
      category: this.getMetaContent('article:section'),
      tags: this.getMetaContent('article:tag'),
      language: document.documentElement.lang || 'en',
      charset: document.characterSet || 'utf-8'
    };

    log('info', 'Metadata extracted', metadata);
    return metadata;
  }

  /**
   * Get meta content by name or property
   * @param {string} name - Meta name or property
   * @returns {string|null} Meta content
   */
  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.content : null;
  }

  /**
   * Extract page structure information
   * @returns {Object} Page structure data
   */
  extractPageStructure() {
    const structure = {
      headings: this.extractHeadings(),
      links: this.extractLinks(),
      paragraphs: document.querySelectorAll('p').length,
      images: document.querySelectorAll('img').length,
      videos: document.querySelectorAll('video').length,
      iframes: document.querySelectorAll('iframe').length
    };

    log('info', 'Page structure extracted', structure);
    return structure;
  }

  /**
   * Extract headings hierarchy
   * @returns {Array} Array of heading objects
   */
  extractHeadings() {
    const headings = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach(heading => {
      headings.push({
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent.trim(),
        id: heading.id || null
      });
    });

    return headings;
  }

  /**
   * Extract links information
   * @returns {Array} Array of link objects
   */
  extractLinks() {
    const links = [];
    const linkElements = document.querySelectorAll('a[href]');
    
    linkElements.forEach(link => {
      const href = link.href;
      const text = link.textContent.trim();
      
      if (href && text && href !== '#' && !href.startsWith('javascript:')) {
        links.push({
          url: href,
          text: text,
          isExternal: !href.startsWith(location.origin),
          isInternal: href.startsWith(location.origin)
        });
      }
    });

    return links.slice(0, 50); // Limit to first 50 links
  }

  /**
   * Extract media information
   * @returns {Object} Media data
   */
  extractMediaInfo() {
    const media = {
      images: this.extractImages(),
      videos: this.extractVideos(),
      audio: this.extractAudio()
    };

    log('info', 'Media information extracted', {
      images: media.images.length,
      videos: media.videos.length,
      audio: media.audio.length
    });

    return media;
  }

  /**
   * Extract images information
   * @returns {Array} Array of image objects
   */
  extractImages() {
    const images = [];
    const imgElements = document.querySelectorAll('img[src]');
    
    imgElements.forEach(img => {
      if (img.src && !img.src.startsWith('data:')) {
        images.push({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0,
          title: img.title || ''
        });
      }
    });

    return images.slice(0, 20); // Limit to first 20 images
  }

  /**
   * Extract videos information
   * @returns {Array} Array of video objects
   */
  extractVideos() {
    const videos = [];
    const videoElements = document.querySelectorAll('video[src], video source[src]');
    
    videoElements.forEach(video => {
      const src = video.src || video.querySelector('source')?.src;
      if (src) {
        videos.push({
          src: src,
          poster: video.poster || '',
          duration: video.duration || 0,
          title: video.title || ''
        });
      }
    });

    return videos;
  }

  /**
   * Extract audio information
   * @returns {Array} Array of audio objects
   */
  extractAudio() {
    const audio = [];
    const audioElements = document.querySelectorAll('audio[src], audio source[src]');
    
    audioElements.forEach(audioEl => {
      const src = audioEl.src || audioEl.querySelector('source')?.src;
      if (src) {
        audio.push({
          src: src,
          title: audioEl.title || ''
        });
      }
    });

    return audio;
  }

  /**
   * Send page data to service worker
   * @param {Object} pageData - Page data to send
   */
  async sendPageDataToServiceWorker(pageData) {
    try {
      log('info', 'Sending page data to service worker', {
        url: pageData.url,
        title: pageData.title,
        contentLength: pageData.content.length
      });

      const response = await chrome.runtime.sendMessage({
        action: 'PAGE_DATA_EXTRACTED',
        payload: pageData
      });

      if (response && response.success) {
        log('info', 'Page data sent successfully to service worker');
      } else {
        log('warn', 'Service worker response indicates failure', response);
      }

    } catch (error) {
      log('error', 'Failed to send page data to service worker', error);
    }
  }

  /**
   * Setup message listener for communication with service worker
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      log('info', 'Content script received message', request);

      switch (request.action) {
        case 'EXTRACT_PAGE_DATA':
          this.handleExtractPageData(sendResponse);
          return true; // Keep message channel open for async response

        case 'GET_PAGE_DATA':
          this.handleGetPageData(sendResponse);
          return true;

        case 'PING':
          this.handlePing(sendResponse);
          return true;

        case 'EXTRACT_YOUTUBE_DATA':
          this.handleExtractYouTubeData(sendResponse);
          return true;

        case 'GET_YOUTUBE_COMMENTS':
          this.handleGetYouTubeComments(request, sendResponse);
          return true;

        case 'NAVIGATE_TO_COMMENT':
          this.handleNavigateToComment(request, sendResponse);
          return true;

        default:
          log('warn', 'Unknown message action received', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
          return true;
      }
    });
  }

  /**
   * Handle extract page data request
   * @param {Function} sendResponse - Response function
   */
  async handleExtractPageData(sendResponse) {
    try {
      // Check if this is a YouTube video page
      if (YouTubeExtractor.isYouTubeVideo()) {
        log('info', 'Detected YouTube video page, using YouTube-specific extraction');
        
        // Use YouTube-specific extraction
        const extractor = new YouTubeExtractor();
        const youtubeData = await extractor.extractYouTubeData();
        
        // Send YouTube data to service worker
        await this.sendPageDataToServiceWorker({
          ...youtubeData,
          type: 'youtube',
          url: location.href,
          extractedAt: new Date().toISOString()
        });
        
        sendResponse({
          success: true,
          data: {
            message: 'YouTube data extracted and sent to service worker',
            pageData: youtubeData
          }
        });
        return;
      }

      // Standard page extraction for non-YouTube pages
      const pageData = await this.extractPageData();
      await this.sendPageDataToServiceWorker(pageData);
      
      sendResponse({
        success: true,
        data: {
          message: 'Page data extracted and sent to service worker',
          pageData: pageData
        }
      });
    } catch (error) {
      log('error', 'Failed to extract page data', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle get page data request
   * @param {Function} sendResponse - Response function
   */
  async handleGetPageData(sendResponse) {
    try {
      if (!this.pageData) {
        const pageData = await this.extractPageData();
        await this.sendPageDataToServiceWorker(pageData);
      }

      sendResponse({
        success: true,
        data: this.pageData
      });
    } catch (error) {
      log('error', 'Failed to get page data', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle ping request
   * @param {Function} sendResponse - Response function
   */
  handlePing(sendResponse) {
    sendResponse({
      success: true,
      data: {
        pong: true,
        timestamp: Date.now(),
        url: location.href,
        title: document.title
      }
    });
  }

  // ==================== YOUTUBE-SPECIFIC HANDLERS ====================

  /**
   * Handle YouTube data extraction request
   */
  async handleExtractYouTubeData(sendResponse) {
    try {
      log('info', 'YouTube data extraction requested');

      // Check if we're on a YouTube video page
      if (!YouTubeExtractor.isYouTubeVideo()) {
        sendResponse({
          success: false,
          error: 'Not on a YouTube video page',
          data: null
        });
        return;
      }

      // Extract YouTube data
      const extractor = new YouTubeExtractor();
      const youtubeData = await extractor.extractYouTubeData();

      log('info', 'YouTube data extracted successfully', {
        videoTitle: youtubeData.video?.title?.substring(0, 50),
        commentCount: youtubeData.comments?.length || 0,
        hasTranscript: !!youtubeData.video?.transcript
      });

      sendResponse({
        success: true,
        data: youtubeData,
        message: 'YouTube data extracted successfully'
      });
    } catch (error) {
      log('error', 'YouTube extraction failed', error);
      sendResponse({
        success: false,
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Handle YouTube comments retrieval request
   */
  async handleGetYouTubeComments(request, sendResponse) {
    try {
      log('info', 'YouTube comments retrieval requested');

      // Check if we're on a YouTube video page
      if (!YouTubeExtractor.isYouTubeVideo()) {
        sendResponse({
          success: false,
          error: 'Not on a YouTube video page',
          data: null
        });
        return;
      }

      const limit = request.limit || 500;

      // Extract comments
      const extractor = new YouTubeExtractor();
      const comments = await extractor.extractComments(limit);

      log('info', 'YouTube comments extracted', {
        commentCount: comments.length,
        limit: limit
      });

      sendResponse({
        success: true,
        data: comments,
        message: `Extracted ${comments.length} comments`
      });
    } catch (error) {
      log('error', 'YouTube comments extraction failed', error);
      sendResponse({
        success: false,
        error: error.message,
        data: null
      });
    }
  }

  /**
   * Handle comment navigation request
   */
  async handleNavigateToComment(request, sendResponse) {
    try {
      log('info', 'Comment navigation requested', { username: request.username });

      // Check if we're on a YouTube video page
      if (!YouTubeExtractor.isYouTubeVideo()) {
        sendResponse({
          success: false,
          error: 'Not on a YouTube video page',
          data: null
        });
        return;
      }

      // Navigate to comment
      const navigator = new CommentNavigator();
      navigator.navigateToComment(request.username);

      log('info', 'Comment navigation executed', {
        username: request.username
      });

      sendResponse({
        success: true,
        data: { success: true, username: request.username },
        message: `Navigated to comment by ${request.username}`
      });
    } catch (error) {
      log('error', 'Comment navigation failed', error);
      sendResponse({
        success: false,
        error: error.message,
        data: null
      });
    }
  }
}

// Initialize the page data extractor
const pageExtractor = new PageDataExtractor();

// Auto-extract page data on page load (with delay to ensure page is fully loaded)
setTimeout(async () => {
  try {
    log('info', 'Auto-extracting page data');
    await pageExtractor.extractPageData();
    await pageExtractor.sendPageDataToServiceWorker(pageExtractor.pageData);
  } catch (error) {
    log('error', 'Auto-extraction failed', error);
  }
}, 2000); // 2 second delay

// Page extractor is now available globally for testing
window.pageExtractor = pageExtractor;
