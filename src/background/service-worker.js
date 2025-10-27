/**
 * TabSense Service Worker - ABSOLUTELY MINIMAL VERSION
 * No imports, no external dependencies
 */

console.log('[TabSense] Minimal service worker loaded');

// Function to extract page content (injected into tabs)
function extractPageContent() {
  try {
    // Simple content extraction
    const title = document.title;
    const textContent = document.body.innerText || document.body.textContent || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // Extract main content
    const article = document.querySelector('article') || 
                    document.querySelector('main') || 
                    document.querySelector('[role="main"]');
    
    const mainContent = article ? article.innerText : textContent;
    
    // Get images
    const images = Array.from(document.querySelectorAll('img'))
      .slice(0, 5)
      .map(img => img.src)
      .filter(src => src && !src.startsWith('data:'));
    
    return {
      title: title,
      content: mainContent.substring(0, 5000), // Limit content size
      summary: metaDescription || mainContent.substring(0, 200),
      images: images,
      category: 'generic',
      wordCount: mainContent.split(/\s+/).length
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return {
      title: document.title,
      content: '',
      summary: 'Failed to extract content',
      category: 'generic'
    };
  }
}

class TabSenseServiceWorker {
  constructor() {
    console.log('[TabSense] Service worker constructor called');
    this.initialized = false;
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    console.log('[TabSense] Setting up message handlers...');
    
    // Essential handlers
    this.messageHandlers.set('PING', this.handlePing.bind(this));
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    
    // Archive handlers
    this.messageHandlers.set('GET_ARCHIVE_CONVERSATIONS', this.handleGetArchiveConversations.bind(this));
    this.messageHandlers.set('SAVE_CONVERSATION_TO_ARCHIVE', this.handleSaveConversationToArchive.bind(this));
    this.messageHandlers.set('DELETE_ARCHIVE_CONVERSATION', this.handleDeleteArchiveConversation.bind(this));
    
    // Tab handlers
    this.messageHandlers.set('GET_MULTI_TAB_COLLECTION', this.handleGetMultiTabCollection.bind(this));
    this.messageHandlers.set('CLEAR_MULTI_TAB_COLLECTION', this.handleClearMultiTabCollection.bind(this));
    this.messageHandlers.set('GET_ALL_TABS_DATA', this.handleGetAllTabsData.bind(this));
    
    // Data management
    this.messageHandlers.set('DATA_DELETE_SUMMARIES', this.handleDataDeleteSummaries.bind(this));
    this.messageHandlers.set('DATA_DELETE_CONVERSATIONS', this.handleDataDeleteConversations.bind(this));
    this.messageHandlers.set('DATA_CLEAR_ALL', this.handleDataClearAll.bind(this));
    this.messageHandlers.set('DATA_GET_STATS', this.handleDataGetStats.bind(this));
    
    // Cache management
    this.messageHandlers.set('CLEAR_CACHE', this.handleClearCache.bind(this));
    
    // AI handlers (placeholder implementations)
    this.messageHandlers.set('ANSWER_QUESTION', this.handleAnswerQuestion.bind(this));
    this.messageHandlers.set('SUMMARIZE_TEXT', this.handleSummarizeText.bind(this));
    
    // Processing handlers
    this.messageHandlers.set('PROCESS_ALL_TABS', this.handleProcessAllTabs.bind(this));
    
    // API management handlers
    this.messageHandlers.set('GET_API_STATUS', this.handleGetAPIStatus.bind(this));
    this.messageHandlers.set('INITIALIZE_APIS', this.handleInitializeAPIs.bind(this));
    
    console.log('[TabSense] Message handlers set up:', this.messageHandlers.size);
  }

  async initialize() {
    console.log('[TabSense] Starting initialization...');
    
    // Clear any stale tab data on startup
    try {
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      if (result.multi_tab_collection && result.multi_tab_collection.length > 0) {
        console.log('[TabSense] Found', result.multi_tab_collection.length, 'old tabs, keeping them');
      }
    } catch (error) {
      console.log('[TabSense] Error checking old tabs:', error.message);
    }
    
    // Setup Chrome listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const action = message.action || 'UNKNOWN';
      console.log('[TabSense] Received message:', action);
      
      const handler = this.messageHandlers.get(action);
      if (handler) {
        const result = handler(message.payload || {}, sender);
        Promise.resolve(result).then(sendResponse);
        return true;
      } else {
        console.warn('[TabSense] No handler for:', action);
        sendResponse({ error: `No handler for ${action}` });
      }
    });

    // Extension icon click
    chrome.action.onClicked.addListener((tab) => {
      console.log('[TabSense] Extension icon clicked');
      chrome.sidePanel.open({ tabId: tab.id });
    });

    this.initialized = true;
    console.log('[TabSense] Service worker initialized');
  }

  async handlePing(payload, sender) {
    console.log('[TabSense] PING received');
    return { 
      success: true,
      data: {
        pong: true, 
        timestamp: Date.now(),
        initialized: this.initialized 
      }
    };
  }

  async handleGetStatus(payload, sender) {
    console.log('[TabSense] GET_STATUS received');
    return {
      success: true,
      data: {
        status: 'ready',
        initialized: this.initialized,
        handlers: Array.from(this.messageHandlers.keys())
      }
    };
  }

  async handleGetArchiveConversations(payload, sender) {
    console.log('[TabSense] GET_ARCHIVE_CONVERSATIONS received');
    try {
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      console.log('[TabSense] Found conversations:', conversations.length);
      return { success: true, data: { conversations } };
    } catch (error) {
      console.error('[TabSense] Error getting conversations:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSaveConversationToArchive(payload, sender) {
    console.log('[TabSense] SAVE_CONVERSATION_TO_ARCHIVE received');
    try {
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      conversations.unshift(payload);
      await chrome.storage.local.set({ archive_conversations: conversations });
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error saving conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDeleteArchiveConversation(payload, sender) {
    console.log('[TabSense] DELETE_ARCHIVE_CONVERSATION received');
    try {
      const { id } = payload || {};
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = (result.archive_conversations || []).filter(c => c.id !== id);
      await chrome.storage.local.set({ archive_conversations: conversations });
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetMultiTabCollection(payload, sender) {
    console.log('[TabSense] GET_MULTI_TAB_COLLECTION received');
    try {
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      const collection = result.multi_tab_collection || [];
      console.log('[TabSense] Retrieved multi_tab_collection:', collection.length, 'items');
      console.log('[TabSense] Collection data:', collection);
      // Return with 'tabs' key that sidebar expects
      return { success: true, data: { tabs: collection } };
    } catch (error) {
      console.error('[TabSense] Error getting collection:', error);
      return { success: false, error: error.message };
    }
  }

  async handleClearMultiTabCollection(payload, sender) {
    console.log('[TabSense] CLEAR_MULTI_TAB_COLLECTION received');
    try {
      await chrome.storage.local.remove(['multi_tab_collection']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error clearing collection:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAllTabsData(payload, sender) {
    console.log('[TabSense] GET_ALL_TABS_DATA received');
    try {
      const result = await chrome.storage.local.get(['processed_tabs']);
      return { success: true, data: { tabs: result.processed_tabs || [] } };
    } catch (error) {
      console.error('[TabSense] Error getting tabs data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataDeleteSummaries(payload, sender) {
    console.log('[TabSense] DATA_DELETE_SUMMARIES received');
    try {
      await chrome.storage.local.remove(['tab_summaries']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting summaries:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataDeleteConversations(payload, sender) {
    console.log('[TabSense] DATA_DELETE_CONVERSATIONS received');
    try {
      await chrome.storage.local.remove(['archive_conversations']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting conversations:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataClearAll(payload, sender) {
    console.log('[TabSense] DATA_CLEAR_ALL received');
    try {
      await chrome.storage.local.clear();
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataGetStats(payload, sender) {
    console.log('[TabSense] DATA_GET_STATS received');
    try {
      const allData = await chrome.storage.local.get();
      const dataSize = JSON.stringify(allData).length;
      
      return {
        success: true,
        data: {
          totalItems: Object.keys(allData).length,
          totalSize: dataSize,
          totalSizeFormatted: this.formatBytes(dataSize),
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting stats:', error);
      return { success: false, error: error.message };
    }
  }

  async handleClearCache(payload, sender) {
    console.log('[TabSense] CLEAR_CACHE received');
    try {
      await chrome.storage.local.remove(['cache', 'processed_tabs', 'tab_summaries']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async handleAnswerQuestion(payload, sender) {
    console.log('[TabSense] ANSWER_QUESTION received');
    try {
      const { question } = payload || {};
      
      // Try to forward to offscreen document for AI processing
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ANSWER_QUESTION',
          payload: { question }
        });
        
        if (response && response.success) {
          return {
            success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using placeholder');
      }
      
      // Fallback to placeholder
      return {
        success: true,
        data: {
          answer: 'AI response functionality coming soon. This is a placeholder response to test the system.',
          sources: [],
          confidence: 0.5
        }
      };
    } catch (error) {
      console.error('[TabSense] Error answering question:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSummarizeText(payload, sender) {
    console.log('[TabSense] SUMMARIZE_TEXT received');
    try {
      const { text } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'SUMMARIZE_TEXT',
          payload: { text }
        });
        
        if (response && response.success) {
          return {
            success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using placeholder');
      }
      
      // Fallback: simple extractive summarization
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';
      
      return {
        success: true,
        data: {
          summary
        }
      };
    } catch (error) {
      console.error('[TabSense] Error summarizing text:', error);
      return { success: false, error: error.message };
    }
  }

  async handleProcessAllTabs(payload, sender) {
    console.log('[TabSense] PROCESS_ALL_TABS received');
    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      console.log('[TabSense] Found tabs:', tabs.length);
      
      // Filter out internal pages
      const processableTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('edge://')
      );
      
      console.log('[TabSense] Processable tabs:', processableTabs.length);
      
      // Inject content scripts to extract real content
      const tabsData = await Promise.all(processableTabs.map(async (tab) => {
        try {
          // Inject content script and get page data
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractPageContent
          });
          
          const extractedData = results[0]?.result || {};
          
          return {
            id: tab.id,
            title: extractedData.title || tab.title || 'Untitled',
            url: tab.url,
            content: extractedData.content || `Content from ${tab.title || tab.url}`,
            summary: extractedData.summary || 'Content extracted',
            category: extractedData.category || 'generic',
            processed: true,
            timestamp: Date.now()
          };
        } catch (error) {
          console.log('[TabSense] Error extracting from tab:', tab.id, error.message);
          // Fallback to placeholder
          return {
            id: tab.id,
            title: tab.title || 'Untitled',
            url: tab.url,
            content: `Content from ${tab.title || tab.url}`,
            summary: 'Waiting for content extraction...',
            category: 'generic',
            processed: false,
            timestamp: Date.now()
          };
        }
      }));
      
      // Store in both places for compatibility
      await chrome.storage.local.set({ 
        processed_tabs: tabsData,
        multi_tab_collection: tabsData 
      });
      
      // Wait a moment to ensure storage is written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify storage
      const verify = await chrome.storage.local.get(['multi_tab_collection']);
      console.log('[TabSense] Verification - multi_tab_collection has:', verify.multi_tab_collection?.length || 0, 'items');
      
      return {
        success: true,
        data: {
          tabsProcessed: tabsData.length,
          tabs: tabsData,
          stored: verify.multi_tab_collection || []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error processing tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAPIStatus(payload, sender) {
    console.log('[TabSense] GET_API_STATUS received');
    try {
      // Get API keys from storage
      const result = await chrome.storage.local.get(['tabsense_api_keys']);
      const keys = result.tabsense_api_keys || {};
      
      return {
        success: true,
        data: {
          youtube: { available: true, configured: !!keys.youtube },
          news: { available: true, configured: !!keys.newsapi }
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting API status:', error);
      return { success: false, error: error.message };
    }
  }

  async handleInitializeAPIs(payload, sender) {
    console.log('[TabSense] INITIALIZE_APIS received');
    try {
      const { apiKeys } = payload || {};
      
      if (apiKeys) {
        // Store API keys
        await chrome.storage.local.set({
          tabsense_api_keys: apiKeys
        });
        console.log('[TabSense] API keys stored');
      }
      
      return {
        success: true,
        data: { message: 'APIs initialized' }
      };
    } catch (error) {
      console.error('[TabSense] Error initializing APIs:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create instance
const serviceWorker = new TabSenseServiceWorker();

// Initialize
serviceWorker.initialize()
  .then(() => {
    console.log('[TabSense] ✅ Service worker initialization complete');
  })
  .catch(error => {
    console.error('[TabSense] ❌ Service worker initialization failed:', error);
  });

export default serviceWorker;

