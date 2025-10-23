/**
 * YouTube Content Extractor
 * Specialized extractor for YouTube videos, comments, and metadata
 */

// Add a global flag to indicate the script loaded
console.log('[YouTubeExtractor] Script file loaded - checking if constructor will be called');

class YouTubeExtractor {
  constructor() {
    console.log('[YouTubeExtractor] Constructor called - content script loaded successfully');
    console.log('[YouTubeExtractor] Window location:', window.location.href);
    console.log('[YouTubeExtractor] Document ready state:', document.readyState);
    
    this.commentSelectors = {
      commentText: '#content-text',
      author: '#author-text',
      likes: '#vote-count-middle',
      timestamp: 'a#published-time-text',
      replies: '#replies',
      commentThread: 'ytd-comment-thread-renderer'
    };
    
    this.videoSelectors = {
      title: 'h1.title',
      description: '#description',
      channel: '#owner-name a',
      views: '#count',
      likes: '#top-level-buttons-computed #segmented-like-button button',
      transcript: '#segments-container',
      metadata: '#info-contents'
    };
  }

  /**
   * Extract comprehensive YouTube data
   */
  async extractYouTubeData() {
    try {
      console.log('[YouTubeExtractor] Starting YouTube data extraction...');
      console.log('[YouTubeExtractor] Current URL:', window.location.href);
      console.log('[YouTubeExtractor] Page title:', document.title);
      
      const [videoData, comments] = await Promise.all([
        this.extractVideoData(),
        this.extractComments()
      ]);
      
      console.log('[YouTubeExtractor] Video data extracted:', videoData);
      console.log('[YouTubeExtractor] Comments extracted:', comments.length);
      
      const result = {
        type: 'youtube',
        video: videoData,
        comments: comments,
        metadata: {
          extractedAt: new Date().toISOString(),
          commentCount: comments.length,
          hasTranscript: !!videoData.transcript
        }
      };
      
      console.log('[YouTubeExtractor] Final result:', result);
      return result;
    } catch (error) {
      console.error('[YouTubeExtractor] Extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract video metadata
   */
  async extractVideoData() {
    console.log('[YouTubeExtractor] Extracting video data...');
    console.log('[YouTubeExtractor] Looking for title selector:', this.videoSelectors.title);
    console.log('[YouTubeExtractor] Title element found:', document.querySelector(this.videoSelectors.title));
    
    const videoData = {
      title: this.getTextContent(this.videoSelectors.title),
      description: this.getTextContent(this.videoSelectors.description),
      channel: this.getTextContent(this.videoSelectors.channel),
      views: this.getTextContent(this.videoSelectors.views),
      likes: this.getTextContent(this.videoSelectors.likes),
      url: window.location.href,
      videoId: this.extractVideoId(window.location.href)
    };
    
    // Try to extract transcript
    try {
      videoData.transcript = await this.extractTranscript();
    } catch (error) {
      console.log('[YouTubeExtractor] No transcript available');
      videoData.transcript = null;
    }
    
    console.log('[YouTubeExtractor] Video data extracted:', {
      title: videoData.title?.substring(0, 50),
      channel: videoData.channel,
      views: videoData.views
    });
    
    return videoData;
  }

  /**
   * Extract comments with progressive loading
   */
  async extractComments(limit = 500) {
    console.log('[YouTubeExtractor] Starting comment extraction...');
    
    const comments = [];
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite scrolling
    
    // Scroll to load more comments
    while (comments.length < limit && attempts < maxAttempts) {
      const currentComments = this.getCurrentComments();
      comments.push(...currentComments);
      
      // Remove duplicates
      const uniqueComments = this.removeDuplicateComments(comments);
      comments.length = 0;
      comments.push(...uniqueComments);
      
      if (comments.length >= limit) break;
      
      // Scroll down to load more
      window.scrollTo(0, document.documentElement.scrollHeight);
      await this.wait(1000); // Wait for lazy loading
      attempts++;
    }
    
    console.log('[YouTubeExtractor] Extracted comments:', comments.length);
    return comments.slice(0, limit);
  }

  /**
   * Get currently visible comments
   */
  getCurrentComments() {
    const commentThreads = document.querySelectorAll(this.commentSelectors.commentThread);
    const comments = [];
    
    commentThreads.forEach(thread => {
      try {
        const commentData = this.extractCommentFromThread(thread);
        if (commentData && commentData.text) {
          comments.push(commentData);
        }
      } catch (error) {
        console.log('[YouTubeExtractor] Error extracting comment:', error);
      }
    });
    
    return comments;
  }

  /**
   * Extract individual comment data
   */
  extractCommentFromThread(thread) {
    const text = this.getTextContent(this.commentSelectors.commentText, thread);
    const author = this.getTextContent(this.commentSelectors.author, thread);
    const likes = this.getTextContent(this.commentSelectors.likes, thread);
    const timestamp = this.getTextContent(this.commentSelectors.timestamp, thread);
    const replies = this.getTextContent(this.commentSelectors.replies, thread);
    
    if (!text) return null;
    
    return {
      text: text.trim(),
      author: author?.trim() || 'Unknown',
      likes: this.parseNumber(likes) || 0,
      timestamp: timestamp?.trim() || '',
      replies: this.parseNumber(replies) || 0,
      url: window.location.href
    };
  }

  /**
   * Extract video transcript if available
   */
  async extractTranscript() {
    try {
      // Look for transcript button and click it
      const transcriptButton = document.querySelector('button[aria-label*="transcript"], button[aria-label*="Transcript"]');
      if (transcriptButton) {
        transcriptButton.click();
        await this.wait(1000);
      }
      
      // Extract transcript segments
      const segments = document.querySelectorAll('#segments-container ytd-transcript-segment-renderer');
      if (segments.length === 0) return null;
      
      const transcript = Array.from(segments).map(segment => {
        const time = segment.querySelector('.segment-timestamp')?.textContent?.trim();
        const text = segment.querySelector('.segment-text')?.textContent?.trim();
        return { time, text };
      }).filter(segment => segment.text);
      
      return transcript;
    } catch (error) {
      console.log('[YouTubeExtractor] Transcript extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract video ID from URL
   */
  extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  /**
   * Remove duplicate comments
   */
  removeDuplicateComments(comments) {
    const seen = new Set();
    return comments.filter(comment => {
      const key = `${comment.author}-${comment.text.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get text content from selector
   */
  getTextContent(selector, parent = document) {
    const element = parent.querySelector(selector);
    return element?.textContent?.trim() || '';
  }

  /**
   * Parse number from text
   */
  parseNumber(text) {
    if (!text) return 0;
    const match = text.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }

  /**
   * Wait for specified time
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if current page is a YouTube video
   */
  static isYouTubeVideo() {
    return window.location.hostname === 'www.youtube.com' && 
           window.location.pathname.startsWith('/watch');
  }

  /**
   * Get YouTube-specific processing instructions
   */
  static getProcessingInstructions() {
    return {
      extractComments: true,
      extractTranscript: true,
      extractMetadata: true,
      specialHandling: 'comment_analysis',
      maxComments: 500,
      includeReplies: false,
      filterSpam: true
    };
  }
}

// Make YouTubeExtractor available globally for content script execution
window.YouTubeExtractor = YouTubeExtractor;
console.log('[YouTubeExtractor] Made available globally as window.YouTubeExtractor');

// Export for use in other modules
export { YouTubeExtractor };
export default YouTubeExtractor;
