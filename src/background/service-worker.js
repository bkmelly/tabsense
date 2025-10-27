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
    this.messageHandlers.set('GET_API_KEYS', this.handleGetAPIKeys.bind(this));
    this.messageHandlers.set('SAVE_API_KEY', this.handleSaveAPIKey.bind(this));
    this.messageHandlers.set('DELETE_API_KEY', this.handleDeleteAPIKey.bind(this));
    this.messageHandlers.set('TOGGLE_API_ENABLED', this.handleToggleAPIEnabled.bind(this));
    this.messageHandlers.set('GET_API_ENABLED_STATES', this.handleGetAPIEnabledStates.bind(this));
    
    // Additional handlers
    this.messageHandlers.set('TAB_PROCESSED', this.handleTabProcessed.bind(this));
    this.messageHandlers.set('PAGE_DATA_EXTRACTED', this.handlePageDataExtracted.bind(this));
    this.messageHandlers.set('GET_CATEGORY_STATS', this.handleGetCategoryStats.bind(this));
    this.messageHandlers.set('ADAPTIVE_SUMMARIZE', this.handleAdaptiveSummarize.bind(this));
    this.messageHandlers.set('ENHANCE_CONTEXT', this.handleEnhanceContext.bind(this));
    
    // Data management additional handlers
    this.messageHandlers.set('DATA_RESET_SETTINGS', this.handleDataResetSettings.bind(this));
    this.messageHandlers.set('DATA_EXPORT_DATA', this.handleDataExportData.bind(this));
    this.messageHandlers.set('CHECK_CACHED_SUMMARIES', this.handleCheckCachedSummaries.bind(this));
    this.messageHandlers.set('GET_CACHED_SUMMARY_BY_URL', this.handleGetCachedSummaryByUrl.bind(this));
    
    // Tab operations
    this.messageHandlers.set('GET_TABS', this.handleGetTabs.bind(this));
    this.messageHandlers.set('PROCESS_TAB', this.handleProcessTab.bind(this));
    
    // Config handlers
    this.messageHandlers.set('GET_CONFIG', this.handleGetConfig.bind(this));
    this.messageHandlers.set('UPDATE_CONFIG', this.handleUpdateConfig.bind(this));
    
    // Advanced AI handlers
    this.messageHandlers.set('SUMMARIZE_MULTI_TAB', this.handleSummarizeMultiTab.bind(this));
    this.messageHandlers.set('ANSWER_MULTI_TAB_QUESTION', this.handleAnswerMultiTabQuestion.bind(this));
    this.messageHandlers.set('GET_EXTERNAL_CONTEXT', this.handleGetExternalContext.bind(this));
    this.messageHandlers.set('EXTRACT_DATA_FROM_URL', this.handleExtractDataFromUrl.bind(this));
    
    console.log('[TabSense] Message handlers set up:', this.messageHandlers.size);
  }

  async initialize() {
    console.log('[TabSense] Starting initialization...');
    
    // Create offscreen document for heavy processing
    await this.createOffscreenDocument();
    
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
      console.log('[TabSense] Received message:', action, 'Payload:', message);
      
      // Extract payload - support both payload object and flat message structure
      let payload = message.payload || {};
      if (Object.keys(payload).length === 0 && Object.keys(message).length > 1) {
        // Message is flat structure, remove action to get payload
        const { action: _, ...rest } = message;
        payload = rest;
      }
      
      const handler = this.messageHandlers.get(action);
      if (handler) {
        const result = handler(payload, sender);
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

    // Listen for tab updates to auto-process tabs
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Only process when tab is complete and has a valid URL
      if (changeInfo.status === 'complete' && tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('edge://') &&
          !tab.url.startsWith('about:')) {
        console.log('[TabSense] Tab loaded, checking if should auto-process:', tab.url);
        
        // Auto-process after a short delay to ensure page is ready
        setTimeout(() => {
          this.autoProcessTab(tab);
        }, 1000);
      }
    });

    this.initialized = true;
    console.log('[TabSense] Service worker initialized');
  }

  async createOffscreenDocument() {
    try {
      // Check if offscreen document already exists
      const hasOffscreen = await chrome.offscreen.hasDocument();
      console.log('[TabSense] Checking offscreen document existence:', hasOffscreen);
      
      if (hasOffscreen) {
        console.log('[TabSense] Offscreen document already exists');
        // Send a test message to see if it's responsive
        try {
          const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'PING_OFFSCREEN',
            payload: { message: 'Test from service worker' }
          });
          console.log('[TabSense] Offscreen document is responsive:', response);
        } catch (error) {
          console.warn('[TabSense] Offscreen document exists but not responsive:', error.message);
        }
        return;
      }

      // Create offscreen document
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'AI summarization and heavy content processing'
      });
      console.log('[TabSense] ✅ Offscreen document created');
      
      // Wait a moment for it to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send a test message
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'PING_OFFSCREEN',
          payload: { message: 'Test from service worker' }
        });
        console.log('[TabSense] Offscreen document responded to ping:', response);
      } catch (error) {
        console.warn('[TabSense] Offscreen document created but not responsive:', error.message);
      }
    } catch (error) {
      console.log('[TabSense] Offscreen document creation failed:', error.message, error);
      // Continue anyway - offscreen may not be needed for basic functionality
    }
  }

  async autoProcessTab(tab) {
    try {
      console.log('[TabSense] Auto-processing tab:', tab.url);
      
      // Filter out unwanted pages
      const url = tab.url || '';
      
      // Don't process search engines, directory pages, or empty URLs
      if (url.includes('google.com/search') ||
          url.includes('bing.com/search') ||
          url.includes('duckduckgo.com/?q=') ||
          url.includes('yahoo.com/search') ||
          url.match(/\/category\/|\/archive\/|\/tag\/|\/tags\//) ||
          url.match(/bbc\.com\/(news|sport|culture)(?!\/[^\/]+\/)/)) {
        console.log('[TabSense] Skipping filtered URL:', url);
        return;
      }
      
      // Inject content script and get page data
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageContent
        });
        
        const extractedData = results[0]?.result || {};
        console.log('[TabSense] Extracted data:', { 
          hasContent: !!extractedData.content, 
          contentLength: extractedData.content?.length || 0,
          title: extractedData.title
        });
        
        // Generate adaptive summary using offscreen document
        let summary = extractedData.summary || 'Content extracted';
        
        // Only try adaptive summarization if we have actual content
        if (extractedData.content && extractedData.content.length > 100) {
          try {
            console.log('[TabSense] Calling adaptive summarizer with content length:', extractedData.content.length);
            
            // Try offscreen adaptive summarizer
            try {
              const response = await chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'ADAPTIVE_SUMMARIZE',
                text: extractedData.content.substring(0, 10000), // Limit content
                url: tab.url,
                title: extractedData.title,
                metadata: {
                  category: extractedData.category,
                  wordCount: extractedData.content.split(/\s+/).length
                }
              });
              
              if (response && response.success && response.data?.summary) {
                summary = response.data.summary;
                console.log('[TabSense] ✅ Adaptive summary generated successfully');
              } else {
                console.log('[TabSense] ⚠️ Adaptive summary failed, using basic extractive summary');
                const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
                summary = sentences.slice(0, 3).join('. ') + '.';
              }
            } catch (offscreenError) {
              console.log('[TabSense] Offscreen not responding:', offscreenError.message);
              // Fallback to basic summarization
              const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
              summary = sentences.slice(0, 3).join('. ') + '.';
            }
          } catch (summaryError) {
            console.error('[TabSense] Adaptive summary failed:', summaryError);
            // Fallback to basic summarization
            const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
            summary = sentences.slice(0, 3).join('. ') + '.';
          }
        } else {
          console.log('[TabSense] Skipping adaptive summary - insufficient content');
        }
        
        // Store tab data
        const tabData = {
          id: tab.id,
          title: extractedData.title || tab.title || 'Untitled',
          url: tab.url,
          content: extractedData.content || `Content from ${tab.title || tab.url}`,
          summary: summary,
          category: extractedData.category || 'generic',
          processed: true,
          timestamp: Date.now()
        };
        
        // Get existing tabs and add this one
        const result = await chrome.storage.local.get(['multi_tab_collection']);
        const existingTabs = result.multi_tab_collection || [];
        
        // Check if tab already exists
        const existingIndex = existingTabs.findIndex(t => t.id === tab.id);
        
        if (existingIndex >= 0) {
          // Update existing tab
          existingTabs[existingIndex] = tabData;
        } else {
          // Add new tab
          existingTabs.push(tabData);
        }
        
        await chrome.storage.local.set({ multi_tab_collection: existingTabs });
        console.log('[TabSense] Tab auto-processed and stored:', tab.url);
        
        // Broadcast to UI that a tab was processed
        this.broadcastMessage({
          action: 'TAB_AUTO_PROCESSED',
          data: tabData
        });
    } catch (error) {
        console.error('[TabSense] Error extracting content from tab:', error);
      }
    } catch (error) {
      console.error('[TabSense] Error auto-processing tab:', error);
    }
  }

  broadcastMessage(message) {
    console.log('[TabSense] Broadcasting message:', message.action);
    try {
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors if no listeners
      });
      } catch (error) {
      console.log('[TabSense] No listeners for broadcast message:', error.message);
    }
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
      // Remove all summary-related storage keys
      await chrome.storage.local.remove([
        'tab_summaries',
        'processed_tabs',
        'multi_tab_collection'
      ]);
      console.log('[TabSense] Deleted all summaries and tab data');
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
          stats: {
            summaries: (allData.tab_summaries?.length || 0) + (allData.processed_tabs?.length || 0),
            conversations: allData.archive_conversations?.length || 0,
            settings: 1, // There's always at least a config object
            totalSize: this.formatBytes(dataSize)
          },
          metadata: {
            totalItems: Object.keys(allData).length,
            totalSize: dataSize,
            totalSizeFormatted: this.formatBytes(dataSize),
            lastUpdated: new Date().toISOString()
          }
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
      // Remove all cache and summary data
      await chrome.storage.local.remove([
        'cache',
        'processed_tabs',
        'tab_summaries',
        'multi_tab_collection'
      ]);
      console.log('[TabSense] Cleared all cache and summary data');
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
      const { question, context } = payload || {};
      console.log('[TabSense] Question:', question);
      console.log('[TabSense] Context tabs:', context?.length || 0);
      
      // For now, create a context-aware response
      if (context && context.length > 0) {
        const contextSummary = context.map((tab, i) => 
          `${i + 1}. ${tab.title}: ${tab.summary || 'No summary available'}`
        ).join('\n\n');
        
        // Simple placeholder response that uses the context
      return {
        success: true,
        data: {
            answer: `Based on ${context.length} tab(s):\n\n${contextSummary}\n\nThis is a placeholder response. AI integration coming soon.`,
            sources: context.map(tab => ({ title: tab.title, url: tab.url })),
            confidence: 0.7
          }
        };
      }
      
      // No context - just placeholder
      return {
            success: true,
            data: {
          answer: 'AI response functionality coming soon. Please ask a question about your tabs.',
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
      const processableTabs = tabs.filter(tab => {
        if (!tab.url) return false;
        
        // Filter internal pages
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://')) return false;
        
        // Filter search engines
        if (tab.url.includes('google.com/search') ||
            tab.url.includes('bing.com/search') ||
            tab.url.includes('duckduckgo.com/?q=') ||
            tab.url.includes('yahoo.com/search')) return false;
        
        // Filter directory pages
        if (tab.url.match(/\/category\/|\/archive\/|\/tag\/|\/tags\//)) return false;
        
        // Filter BBC directory pages (e.g., bbc.com/news, not bbc.com/news/articles/)
        if (tab.url.match(/bbc\.com\/(news|sport|culture)(?!\/[^\/]+\/)/)) return false;
        
        return true;
      });
      
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

  async handleGetAPIKeys(payload, sender) {
    console.log('[TabSense] GET_API_KEYS received');
    try {
      const result = await chrome.storage.local.get(['tabsense_api_keys', 'ai_api_keys', 'other_api_keys']);

      return {
        success: true,
        data: {
          tabsense: result.tabsense_api_keys || {},
          ai: result.ai_api_keys || {},
          other: result.other_api_keys || {}
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting API keys:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSaveAPIKey(payload, sender) {
    console.log('[TabSense] SAVE_API_KEY received with payload:', payload);
    try {
      const { provider, apiKey, type = 'other' } = payload || {};
      
      if (!provider || !apiKey) {
        return { success: false, error: 'Provider and API key are required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_keys' : 'other_api_keys';
      const result = await chrome.storage.local.get([storageKey]);
      const keys = result[storageKey] || {};
      keys[provider] = apiKey;
      await chrome.storage.local.set({ [storageKey]: keys });
      
      return {
        success: true,
        data: { message: 'API key saved successfully' }
      };
    } catch (error) {
      console.error('[TabSense] Error saving API key:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDeleteAPIKey(payload, sender) {
    console.log('[TabSense] DELETE_API_KEY received');
    try {
      const { provider, type = 'other' } = payload || {};
      
      if (!provider) {
        return { success: false, error: 'Provider is required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_keys' : 'other_api_keys';
      const result = await chrome.storage.local.get([storageKey]);
      const keys = result[storageKey] || {};
      delete keys[provider];
      await chrome.storage.local.set({ [storageKey]: keys });

      return {
        success: true,
        data: { message: 'API key deleted successfully' }
      };
    } catch (error) {
      console.error('[TabSense] Error deleting API key:', error);
      return { success: false, error: error.message };
    }
  }

  async handleToggleAPIEnabled(payload, sender) {
    console.log('[TabSense] TOGGLE_API_ENABLED received');
    try {
      const { provider, enabled, type = 'other' } = payload || {};
      
      if (!provider || typeof enabled !== 'boolean') {
        return { success: false, error: 'Provider and enabled state are required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_enabled' : 'other_api_enabled';
      const result = await chrome.storage.local.get([storageKey]);
      const enabledStates = result[storageKey] || {};
      enabledStates[provider] = enabled;
      await chrome.storage.local.set({ [storageKey]: enabledStates });

      return {
        success: true,
        data: { message: 'API enabled state updated' }
      };
    } catch (error) {
      console.error('[TabSense] Error toggling API enabled:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAPIEnabledStates(payload, sender) {
    console.log('[TabSense] GET_API_ENABLED_STATES received');
    try {
      const result = await chrome.storage.local.get(['ai_api_enabled', 'other_api_enabled', 'chrome_ai_available']);
      
      // Check Chrome AI availability if not already checked
      let chromeAiAvailable = result.chrome_ai_available;
      if (chromeAiAvailable === undefined) {
        chromeAiAvailable = await this.checkChromeAIAvailability();
        await chrome.storage.local.set({ chrome_ai_available: chromeAiAvailable });
      }

      return {
        success: true,
        data: {
          ai_enabled: result.ai_api_enabled || {},
          other_enabled: result.other_api_enabled || {},
          chrome_ai_available: chromeAiAvailable
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting API enabled states:', error);
      return { success: false, error: error.message };
    }
  }

  async checkChromeAIAvailability() {
    try {
      // Check if Chrome AI APIs are available
      if (chrome.readingMode && chrome.ai) {
        // Try to create a reading mode reader to test availability
        const reader = await chrome.readingMode.createReader();
        if (reader) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log('[TabSense] Chrome AI not available:', error.message);
      return false;
    }
  }

  async handlePageDataExtracted(payload, sender) {
    console.log('[TabSense] PAGE_DATA_EXTRACTED received');
    try {
      // This is for content scripts that send page data - we can just acknowledge it
      return { success: true, data: { message: 'Page data received' } };
    } catch (error) {
      console.error('[TabSense] Error handling page data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleTabProcessed(payload, sender) {
    console.log('[TabSense] TAB_PROCESSED received');
    try {
      const { tabId, data } = payload || {};
      if (tabId && data) {
        const result = await chrome.storage.local.get(['processed_tabs']);
        const tabs = result.processed_tabs || [];
        const existingIndex = tabs.findIndex(t => t.id === tabId);
      if (existingIndex >= 0) {
          tabs[existingIndex] = { ...tabs[existingIndex], ...data };
      } else {
          tabs.push({ id: tabId, ...data });
      }
        await chrome.storage.local.set({ processed_tabs: tabs });
      }
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error processing tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetCategoryStats(payload, sender) {
    console.log('[TabSense] GET_CATEGORY_STATS received');
    try {
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      
      const stats = tabs.reduce((acc, tab) => {
        const category = tab.category || 'generic';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: { categories: stats, total: tabs.length }
      };
    } catch (error) {
      console.error('[TabSense] Error getting category stats:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAdaptiveSummarize(payload, sender) {
    console.log('[TabSense] ADAPTIVE_SUMMARIZE received');
    try {
      const { text, options } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ADAPTIVE_SUMMARIZE',
          payload: { text, options }
        });
        
        if (response && response.success) {
          return {
            success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic summarization');
      }
      
      // Fallback: basic summarization
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';

      return {
        success: true,
        data: { summary }
      };
    } catch (error) {
      console.error('[TabSense] Error adapting summarize:', error);
      return { success: false, error: error.message };
    }
  }

  async handleEnhanceContext(payload, sender) {
    console.log('[TabSense] ENHANCE_CONTEXT received');
    try {
      const { pageData, contextType } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ENHANCE_CONTEXT',
          payload: { pageData, contextType }
        });
        
        if (response && response.success) {
          return {
            success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, returning basic context');
      }
      
      // Fallback: return basic page data
      return {
        success: true,
        data: {
          title: pageData?.title || 'No title',
          summary: pageData?.summary || 'No summary available',
          context: []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error enhancing context:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataResetSettings(payload, sender) {
    console.log('[TabSense] DATA_RESET_SETTINGS received');
    try {
      const defaults = { theme: 'system', language: 'en', autoSummarize: false };
      await chrome.storage.local.set({ config: defaults });
      return { success: true, data: { message: 'Settings reset' } };
    } catch (error) {
      console.error('[TabSense] Error resetting settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataExportData(payload, sender) {
    console.log('[TabSense] DATA_EXPORT_DATA received');
    try {
      const allData = await chrome.storage.local.get();
      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: 'tabsense-export.json', saveAs: true });
      return { success: true, data: { message: 'Export started' } };
    } catch (error) {
      console.error('[TabSense] Error exporting data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleCheckCachedSummaries(payload, sender) {
    console.log('[TabSense] CHECK_CACHED_SUMMARIES received');
    try {
      const result = await chrome.storage.local.get(['cache']);
      const cache = result.cache || {};
      const count = Object.keys(cache).length;
      return { success: true, data: { count, cached: count > 0 } };
    } catch (error) {
      console.error('[TabSense] Error checking cache:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetCachedSummaryByUrl(payload, sender) {
    console.log('[TabSense] GET_CACHED_SUMMARY_BY_URL received');
    try {
      const { url } = payload || {};
      if (!url) return { success: false, error: 'URL required' };
      
      const result = await chrome.storage.local.get(['cache']);
      const cache = result.cache || {};
      const summary = cache[url];
      
      if (summary) {
        return { success: true, data: { summary, cached: true } };
      }
      return { success: true, data: { summary: null, cached: false } };
    } catch (error) {
      console.error('[TabSense] Error getting cached summary:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetTabs(payload, sender) {
    console.log('[TabSense] GET_TABS received');
    try {
      const tabs = await chrome.tabs.query({});
      return { success: true, data: { tabs: tabs.filter(t => t.url && !t.url.startsWith('chrome://')) } };
    } catch (error) {
      console.error('[TabSense] Error getting tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async handleProcessTab(payload, sender) {
    console.log('[TabSense] PROCESS_TAB received');
    try {
      const { tabId } = payload || {};
      if (!tabId) return { success: false, error: 'Tab ID required' };
      
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || tab.url.startsWith('chrome://')) {
        return { success: false, error: 'Cannot process internal pages' };
      }
      
      return { success: true, data: { tabId, url: tab.url, title: tab.title } };
    } catch (error) {
      console.error('[TabSense] Error processing tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetConfig(payload, sender) {
    console.log('[TabSense] GET_CONFIG received');
    try {
      const result = await chrome.storage.local.get(['config']);
      return { success: true, data: { config: result.config || {} } };
        } catch (error) {
      console.error('[TabSense] Error getting config:', error);
      return { success: false, error: error.message };
    }
  }

  async handleUpdateConfig(payload, sender) {
    console.log('[TabSense] UPDATE_CONFIG received');
    try {
      const { config } = payload || {};
      await chrome.storage.local.set({ config });
      return { success: true, data: { message: 'Config updated' } };
    } catch (error) {
      console.error('[TabSense] Error updating config:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSummarizeMultiTab(payload, sender) {
    console.log('[TabSense] SUMMARIZE_MULTI_TAB received');
    try {
      const { tabIds } = payload || {};
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      const relevantTabs = tabIds ? tabs.filter(t => tabIds.includes(t.id)) : tabs;
      
      if (relevantTabs.length === 0) {
        return { success: false, error: 'No tabs to summarize' };
      }
      
      const combinedContent = relevantTabs.map(t => `${t.title}: ${t.summary || 'No summary'}`).join('\n\n');
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'SUMMARIZE_MULTI_TAB',
          payload: { content: combinedContent }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic summarization');
      }
      
      // Fallback: extract first 200 chars
      const summary = combinedContent.substring(0, 200) + '...';
      return { success: true, data: { summary, tabCount: relevantTabs.length } };
        } catch (error) {
      console.error('[TabSense] Error summarizing multi-tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAnswerMultiTabQuestion(payload, sender) {
    console.log('[TabSense] ANSWER_MULTI_TAB_QUESTION received');
    try {
      const { question, tabIds } = payload || {};
      
      if (!question) {
        return { success: false, error: 'Question is required' };
      }
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ANSWER_MULTI_TAB_QUESTION',
          payload: { question, tabIds }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using placeholder response');
      }
      
      // Fallback: placeholder
      return {
        success: true,
        data: {
          answer: 'Multi-tab Q&A feature coming soon. This requires AI integration.',
          sources: [],
          confidence: 0.5
        }
      };
    } catch (error) {
      console.error('[TabSense] Error answering multi-tab question:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetExternalContext(payload, sender) {
    console.log('[TabSense] GET_EXTERNAL_CONTEXT received');
    try {
      const { topic, contextType } = payload || {};
      
      if (!topic) {
        return { success: false, error: 'Topic is required' };
      }
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'GET_EXTERNAL_CONTEXT',
          payload: { topic, contextType }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, returning empty context');
      }
      
      // Fallback: return empty context
      return {
        success: true,
        data: {
          topic,
          context: [],
          sources: []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting external context:', error);
      return { success: false, error: error.message };
    }
  }

  async handleExtractDataFromUrl(payload, sender) {
    console.log('[TabSense] EXTRACT_DATA_FROM_URL received');
    try {
      const { url } = payload || {};
      
      if (!url) {
        return { success: false, error: 'URL is required' };
      }
      
      // Try offscreen first for external API integration
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'EXTRACT_DATA_FROM_URL',
          payload: { url }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic extraction');
      }
      
      // Fallback: return basic URL data
      return {
        success: true,
        data: {
          url,
          type: url.includes('youtube.com') ? 'youtube' : 'generic',
          extracted: false,
          message: 'External API extraction requires API keys'
        }
      };
    } catch (error) {
      console.error('[TabSense] Error extracting data from URL:', error);
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

