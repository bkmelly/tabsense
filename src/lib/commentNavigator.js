/**
 * CommentNavigator - Handles clicking on comment usernames to navigate to actual comments
 * Works by finding matching usernames in the YouTube page DOM
 */

export class CommentNavigator {
  constructor() {
    this.isYouTube = this.detectYouTube();
    this.commentSelectors = [
      '#comments #author-text', // YouTube comment authors
      '.ytd-comment-thread-renderer #author-text', // Alternative selector
      '[id="author-text"]', // Generic author text
      '.comment-author', // Generic comment author
      '.ytd-comment-renderer #author-text' // Another YouTube variant
    ];
  }

  /**
   * Detect if we're on YouTube
   */
  detectYouTube() {
    return window.location.hostname.includes('youtube.com') || 
           window.location.hostname.includes('youtu.be');
  }

  /**
   * Initialize comment navigation for the current page
   */
  initialize() {
    if (!this.isYouTube) {
      console.log('[CommentNavigator] Not on YouTube, skipping initialization');
      return;
    }

    console.log('[CommentNavigator] Initializing comment navigation...');
    this.addClickHandlers();
  }

  /**
   * Add click handlers to comment links in summaries
   */
  addClickHandlers() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupHandlers());
    } else {
      this.setupHandlers();
    }
  }

  /**
   * Setup click handlers for comment links
   */
  setupHandlers() {
    // Find all comment links in the page
    const commentLinks = document.querySelectorAll('.comment-link');
    
    commentLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const username = link.getAttribute('data-username');
        this.navigateToComment(username);
      });

      // Add visual styling
      link.style.cssText = `
        color: #1976d2;
        text-decoration: underline;
        cursor: pointer;
        font-weight: 500;
      `;
      
      link.title = `Click to find this comment by ${username}`;
    });

    console.log(`[CommentNavigator] Added handlers to ${commentLinks.length} comment links`);
  }

  /**
   * Navigate to a specific comment by username
   */
  navigateToComment(username) {
    console.log(`[CommentNavigator] Looking for comment by: ${username}`);
    
    // Clean username (remove @ if present)
    const cleanUsername = username.replace('@', '');
    
    // Find all comment authors on the page
    const authors = this.findAllCommentAuthors();
    
    if (authors.length === 0) {
      console.log('[CommentNavigator] No comment authors found on page');
      this.showNotification('No comments found on this page', 'warning');
      return;
    }

    // Look for matching username
    const matchingAuthor = this.findMatchingAuthor(authors, cleanUsername);
    
    if (matchingAuthor) {
      this.scrollToComment(matchingAuthor);
      this.highlightComment(matchingAuthor);
      this.showNotification(`Found comment by ${username}`, 'success');
    } else {
      console.log(`[CommentNavigator] No matching author found for: ${cleanUsername}`);
      this.showNotification(`Comment by ${username} not found`, 'info');
    }
  }

  /**
   * Find all comment authors on the page
   */
  findAllCommentAuthors() {
    const authors = [];
    
    this.commentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent && el.textContent.trim()) {
          authors.push({
            element: el,
            username: el.textContent.trim(),
            commentContainer: this.findCommentContainer(el)
          });
        }
      });
    });

    console.log(`[CommentNavigator] Found ${authors.length} comment authors`);
    return authors;
  }

  /**
   * Find the comment container for an author element
   */
  findCommentContainer(authorElement) {
    // Navigate up the DOM to find the comment container
    let current = authorElement;
    
    while (current && current !== document.body) {
      if (current.classList.contains('ytd-comment-thread-renderer') ||
          current.classList.contains('ytd-comment-renderer') ||
          current.classList.contains('comment-container') ||
          current.id?.includes('comment')) {
        return current;
      }
      current = current.parentElement;
    }
    
    return authorElement.closest('[id*="comment"]') || authorElement.parentElement;
  }

  /**
   * Find matching author by username
   */
  findMatchingAuthor(authors, targetUsername) {
    // Try exact match first
    let match = authors.find(author => 
      author.username.toLowerCase() === targetUsername.toLowerCase()
    );
    
    if (match) return match;
    
    // Try partial match
    match = authors.find(author => 
      author.username.toLowerCase().includes(targetUsername.toLowerCase()) ||
      targetUsername.toLowerCase().includes(author.username.toLowerCase())
    );
    
    return match;
  }

  /**
   * Scroll to the comment
   */
  scrollToComment(author) {
    const commentContainer = author.commentContainer;
    
    if (commentContainer) {
      commentContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      console.log(`[CommentNavigator] Scrolled to comment by ${author.username}`);
    }
  }

  /**
   * Highlight the comment temporarily
   */
  highlightComment(author) {
    const commentContainer = author.commentContainer;
    
    if (commentContainer) {
      // Add highlight class
      commentContainer.style.cssText = `
        background-color: #fff3cd !important;
        border: 2px solid #ffc107 !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      `;
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        commentContainer.style.cssText = '';
      }, 3000);
    }
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `;
    
    // Set color based on type
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#4caf50';
        break;
      case 'warning':
        notification.style.backgroundColor = '#ff9800';
        break;
      case 'error':
        notification.style.backgroundColor = '#f44336';
        break;
      default:
        notification.style.backgroundColor = '#2196f3';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Auto-initialize if on YouTube
if (typeof window !== 'undefined') {
  const navigator = new CommentNavigator();
  navigator.initialize();
}

