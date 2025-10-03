/**
 * TabSense Service Worker - Milestone 1
 * Foundation service worker with message handling and configuration
 */

// Service worker startup log
console.log('[TabSense] Service worker script loading...');

import { configManager, DEFAULT_CONFIG } from '../config/index.js';
import { CredentialManager } from '../lib/credentialManager.js';
import { AIAdapter } from '../lib/aiAdapter.js';
import { log } from '../utils/index.js';

console.log('[TabSense] Service worker imports loaded');

/**
 * Service Worker Main Class
 * Handles extension lifecycle and core functionality
 */
class TabSenseServiceWorker {
  constructor() {
    this.initialized = false;
    this.messageHandlers = new Map();
    this.credentialManager = new CredentialManager();
    this.aiAdapter = new AIAdapter();
    this.setupMessageHandlers();
  }

  /**
   * Initialize the service worker
   */
  async initialize() {
    if (this.initialized) {
      log('warn', 'Service worker already initialized');
      return;
    }

    try {
      log('info', 'Initializing TabSense Service Worker...');
      
      // Initialize configuration
      log('info', 'Loading configuration...');
      await configManager.load();
      log('info', 'Configuration loaded successfully');
      
      // Credential manager is already initialized
      log('info', 'Credential manager initialized');

      // Initialize AI Adapter
      log('info', 'Initializing AI Adapter...');
      await this.aiAdapter.initialize();
      log('info', 'AI Adapter initialized successfully');
      
      // Set up Chrome extension listeners
      log('info', 'Setting up Chrome listeners...');
      this.setupChromeListeners();
      log('info', 'Chrome listeners set up successfully');
      
      this.initialized = true;
      log('info', 'Service worker initialization complete');
      
      // Send initialization status to UI
      this.broadcastMessage({
        action: 'SERVICE_WORKER_READY',
        payload: { timestamp: Date.now() }
      });
      
    } catch (error) {
      log('error', 'Service worker initialization failed', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Setup message handlers for different actions
   */
  setupMessageHandlers() {
    // Basic system messages
    this.messageHandlers.set('PING', this.handlePing.bind(this));
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    this.messageHandlers.set('GET_CONFIG', this.handleGetConfig.bind(this));
    this.messageHandlers.set('UPDATE_CONFIG', this.handleUpdateConfig.bind(this));
    
    // Page data extraction messages (Milestone 2)
    this.messageHandlers.set('PAGE_DATA_EXTRACTED', this.handlePageDataExtracted.bind(this));
    this.messageHandlers.set('EXTRACT_PAGE_DATA', this.handleExtractPageData.bind(this));
    this.messageHandlers.set('GET_PAGE_DATA', this.handleGetPageData.bind(this));
    
    // Multi-tab operations (Milestone 2+)
    this.messageHandlers.set('GET_MULTI_TAB_COLLECTION', this.handleGetMultiTabCollection.bind(this));
    this.messageHandlers.set('CLEAR_MULTI_TAB_COLLECTION', this.handleClearMultiTabCollection.bind(this));
    this.messageHandlers.set('GET_ALL_TABS_DATA', this.handleGetAllTabsData.bind(this));
    
    // Multi-tab AI operations (Milestone 3)
    this.messageHandlers.set('SUMMARIZE_MULTI_TAB', this.handleSummarizeMultiTab.bind(this));
    this.messageHandlers.set('ANSWER_MULTI_TAB_QUESTION', this.handleAnswerMultiTabQuestion.bind(this));
    
    // AI-related messages (will be implemented in later milestones)
    this.messageHandlers.set('SUMMARIZE_TEXT', this.handleSummarizeText.bind(this));
    this.messageHandlers.set('ANSWER_QUESTION', this.handleAnswerQuestion.bind(this));
    
    // Tab-related messages (will be implemented in later milestones)
    this.messageHandlers.set('GET_TABS', this.handleGetTabs.bind(this));
    this.messageHandlers.set('PROCESS_TAB', this.handleProcessTab.bind(this));
  }

  /**
   * Setup Chrome extension event listeners
   */
  setupChromeListeners() {
    // Handle messages from content scripts and UI
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle tab updates (for future milestones)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
  }

  /**
   * Handle incoming messages
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Response function
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      const { action, payload } = message;
      
      log('info', `Received message: ${action}`, { sender: sender.tab?.url, payload });
      
      const handler = this.messageHandlers.get(action);
      if (handler) {
        const result = await handler(payload, sender);
        sendResponse({ success: true, data: result });
      } else {
        log('warn', `No handler for action: ${action}`);
        sendResponse({ success: false, error: `Unknown action: ${action}` });
      }
      
    } catch (error) {
      log('error', 'Message handling failed', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Broadcast message to all connected contexts
   * @param {Object} message - Message to broadcast
   */
  broadcastMessage(message) {
    chrome.runtime.sendMessage(message).catch(error => {
      // Ignore errors when no listeners are available
      log('debug', 'No listeners for broadcast message', error.message);
    });
  }

  // ==================== MESSAGE HANDLERS ====================

  /**
   * Handle ping message (for testing connectivity)
   */
  async handlePing(payload, sender) {
    log('info', 'PING received', { sender: sender.tab?.url, initialized: this.initialized });
    
    // Always respond to PING, even if not fully initialized
    const response = {
      pong: true, // Always respond to show service worker is alive
      initialized: this.initialized,
      timestamp: Date.now(),
      sender: sender.tab?.url || 'unknown'
    };
    
    log('info', 'PING response', response);
    return response;
  }

  /**
   * Handle get status message
   */
  async handleGetStatus(payload, sender) {
    return {
      initialized: this.initialized,
      config: configManager.getAll(),
      credentials: 'Credential manager ready',
      timestamp: Date.now()
    };
  }

  /**
   * Handle get config message
   */
  async handleGetConfig(payload, sender) {
    return configManager.getAll();
  }

  /**
   * Handle update config message
   */
  async handleUpdateConfig(payload, sender) {
    const { key, value } = payload;
    await configManager.set(key, value);
    return { success: true, updated: { key, value } };
  }

  /**
   * Handle summarize text message (Milestone 3)
   */
  async handleSummarizeText(payload, sender) {
    log('info', 'Summarize text requested', { sender: sender.tab?.url });
    
    try {
      const { text, options = {} } = payload;
      
      if (!text || text.length === 0) {
        throw new Error('No text provided for summarization');
      }
      
      log('info', 'Starting AI summarization', { 
        textLength: text.length,
        options,
        aiAdapterInitialized: !!this.aiAdapter
      });
      
      // Check if AI adapter is properly initialized
      if (!this.aiAdapter) {
        throw new Error('AI adapter not initialized');
      }
      
      const summary = await this.aiAdapter.summarizeText(text, options);
      
      log('info', 'AI summarization completed', { 
        summaryLength: summary.length,
        summary: summary.substring(0, 100) + '...' // First 100 chars for debugging
      });
      
      return {
        success: true,
        data: {
          summary,
          originalLength: text.length,
          summaryLength: summary.length,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      log('error', 'AI summarization failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle answer question message (Milestone 3)
   */
  async handleAnswerQuestion(payload, sender) {
    log('info', 'Answer question requested', { sender: sender.tab?.url });
    
    try {
      const { question, context = [] } = payload;
      
      if (!question || question.length === 0) {
        throw new Error('No question provided');
      }
      
      log('info', 'Starting AI Q&A', { 
        questionLength: question.length,
        contextCount: context.length 
      });
      
      const answer = await this.aiAdapter.answerQuestion(question, context);
      
      log('info', 'AI Q&A completed', { 
        answerLength: answer.length 
      });
      
      return {
        success: true,
        data: {
          answer,
          question,
          contextCount: context.length,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      log('error', 'AI Q&A failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle get tabs message (placeholder for Milestone 2)
   */
  async handleGetTabs(payload, sender) {
    log('info', 'Get tabs requested (placeholder)');
    return {
      message: 'Tab management will be implemented in Milestone 2',
      placeholder: true
    };
  }

  /**
   * Handle process tab message (placeholder for Milestone 2)
   */
  async handleProcessTab(payload, sender) {
    log('info', 'Process tab requested (placeholder)');
    return {
      message: 'Tab processing will be implemented in Milestone 2',
      placeholder: true,
      payload
    };
  }

  // ==================== PAGE DATA EXTRACTION HANDLERS (MILESTONE 2) ====================

  /**
   * Handle page data extracted message from content script
   */
  async handlePageDataExtracted(payload, sender) {
    log('info', 'Page data received from content script', {
      url: payload.url,
      title: payload.title,
      contentLength: payload.content?.length || 0,
      sender: sender.tab?.url
    });

    try {
      // Store page data for later use
      await this.storePageData(payload);
      
      // Broadcast to other components that new page data is available
      this.broadcastMessage({
        action: 'PAGE_DATA_AVAILABLE',
        payload: {
          url: payload.url,
          title: payload.title,
          timestamp: Date.now()
        }
      });

      return {
        success: true,
        message: 'Page data stored successfully',
        data: {
          url: payload.url,
          title: payload.title,
          contentLength: payload.content?.length || 0
        }
      };

    } catch (error) {
      log('error', 'Failed to store page data', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle extract page data request
   */
  async handleExtractPageData(payload, sender) {
    log('info', 'Extract page data requested', { sender: sender.tab?.url });

    try {
      // If message comes from popup, get the active tab
      let tabId = sender.tab?.id;
      
      if (!tabId) {
        // Message from popup - get active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
        tabId = tabs[0].id;
        log('info', 'Using active tab for extraction', { tabId, url: tabs[0].url });
      }

      // Try to send message to content script
      let response;
      try {
        response = await chrome.tabs.sendMessage(tabId, {
          action: 'EXTRACT_PAGE_DATA'
        });
      } catch (connectionError) {
        log('warn', 'Content script not responding, attempting to inject', connectionError.message);
        
        // Try to inject content script
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
          
          // Wait a moment for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try again
          response = await chrome.tabs.sendMessage(tabId, {
            action: 'EXTRACT_PAGE_DATA'
          });
          
          log('info', 'Content script injected and responding');
        } catch (injectionError) {
          log('error', 'Failed to inject content script', injectionError);
          throw new Error('Could not establish connection with content script');
        }
      }

      if (response && response.success) {
        log('info', 'Page data extraction successful');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response?.error || 'Page data extraction failed');
      }

    } catch (error) {
      log('error', 'Failed to extract page data', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle get page data request
   */
  async handleGetPageData(payload, sender) {
    log('info', 'Get page data requested', { sender: sender.tab?.url });

    try {
      // If message comes from popup, get the active tab
      let tabId = sender.tab?.id;
      
      if (!tabId) {
        // Message from popup - get active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
        tabId = tabs[0].id;
        log('info', 'Using active tab for getting page data', { tabId, url: tabs[0].url });
      }

      // Send message to content script to get page data
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'GET_PAGE_DATA'
      });

      if (response && response.success) {
        log('info', 'Page data retrieved successfully');
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response?.error || 'Failed to get page data');
      }

    } catch (error) {
      log('error', 'Failed to get page data', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store page data for later use
   * @param {Object} pageData - Page data to store
   */
  async storePageData(pageData) {
    try {
      const storageKey = `page_data_${pageData.url}`;
      const dataToStore = {
        ...pageData,
        storedAt: Date.now()
      };

      await chrome.storage.local.set({ [storageKey]: dataToStore });
      log('info', 'Page data stored successfully', { url: pageData.url });

      // Also add to multi-tab collection
      await this.addToMultiTabCollection(dataToStore);

    } catch (error) {
      log('error', 'Failed to store page data', error);
      throw error;
    }
  }

  /**
   * Add page data to multi-tab collection for cross-tab operations
   * @param {Object} pageData - Page data to add to collection
   */
  async addToMultiTabCollection(pageData) {
    try {
      // Get existing collection
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      let collection = result.multi_tab_collection || {
        tabs: [],
        lastUpdated: Date.now(),
        totalContentLength: 0
      };

      // Check if this URL already exists in collection
      const existingIndex = collection.tabs.findIndex(tab => tab.url === pageData.url);
      
      if (existingIndex >= 0) {
        // Update existing tab data
        collection.tabs[existingIndex] = pageData;
        log('info', 'Updated existing tab in collection', { url: pageData.url });
      } else {
        // Add new tab to collection
        collection.tabs.push(pageData);
        log('info', 'Added new tab to collection', { url: pageData.url });
      }

      // Update collection metadata
      collection.lastUpdated = Date.now();
      collection.totalContentLength = collection.tabs.reduce((total, tab) => total + (tab.content?.length || 0), 0);
      collection.tabCount = collection.tabs.length;

      // Store updated collection
      await chrome.storage.local.set({ multi_tab_collection: collection });
      
      log('info', 'Multi-tab collection updated', {
        tabCount: collection.tabCount,
        totalContentLength: collection.totalContentLength,
        urls: collection.tabs.map(tab => tab.url)
      });

    } catch (error) {
      log('error', 'Failed to add to multi-tab collection', error);
    }
  }

  /**
   * Get multi-tab collection for cross-tab operations
   * @returns {Object} Multi-tab collection data
   */
  async getMultiTabCollection() {
    try {
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      return result.multi_tab_collection || {
        tabs: [],
        lastUpdated: Date.now(),
        totalContentLength: 0,
        tabCount: 0
      };
    } catch (error) {
      log('error', 'Failed to get multi-tab collection', error);
      return { tabs: [], lastUpdated: Date.now(), totalContentLength: 0, tabCount: 0 };
    }
  }

  /**
   * Clear multi-tab collection
   */
  async clearMultiTabCollection() {
    try {
      await chrome.storage.local.remove(['multi_tab_collection']);
      log('info', 'Multi-tab collection cleared');
    } catch (error) {
      log('error', 'Failed to clear multi-tab collection', error);
    }
  }

  // ==================== MULTI-TAB OPERATION HANDLERS ====================

  /**
   * Handle get multi-tab collection request
   */
  async handleGetMultiTabCollection(payload, sender) {
    log('info', 'Get multi-tab collection requested', { sender: sender.tab?.url });

    try {
      const collection = await this.getMultiTabCollection();
      
      log('info', 'Multi-tab collection retrieved', {
        tabCount: collection.tabCount,
        totalContentLength: collection.totalContentLength
      });

      return {
        success: true,
        data: collection
      };

    } catch (error) {
      log('error', 'Failed to get multi-tab collection', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle clear multi-tab collection request
   */
  async handleClearMultiTabCollection(payload, sender) {
    log('info', 'Clear multi-tab collection requested', { sender: sender.tab?.url });

    try {
      await this.clearMultiTabCollection();
      
      return {
        success: true,
        data: { message: 'Multi-tab collection cleared successfully' }
      };

    } catch (error) {
      log('error', 'Failed to clear multi-tab collection', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle get all tabs data request
   */
  async handleGetAllTabsData(payload, sender) {
    log('info', 'Get all tabs data requested', { sender: sender.tab?.url });

    try {
      // Get all open tabs
      const tabs = await chrome.tabs.query({});
      
      // Get data for each tab that has been processed
      const tabsData = [];
      for (const tab of tabs) {
        try {
          const storageKey = `page_data_${tab.url}`;
          const result = await chrome.storage.local.get([storageKey]);
          if (result[storageKey]) {
            tabsData.push({
              tabId: tab.id,
              url: tab.url,
              title: tab.title,
              data: result[storageKey]
            });
          }
        } catch (error) {
          log('warn', `Failed to get data for tab ${tab.id}`, error);
        }
      }

      log('info', 'All tabs data retrieved', {
        totalTabs: tabs.length,
        processedTabs: tabsData.length
      });

      return {
        success: true,
        data: {
          totalTabs: tabs.length,
          processedTabs: tabsData.length,
          tabs: tabsData
        }
      };

    } catch (error) {
      log('error', 'Failed to get all tabs data', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== CHROME EVENT HANDLERS ====================

  /**
   * Handle extension installation/update
   */
  async handleInstallation(details) {
    log('info', 'Extension installed/updated', details);
    
    if (details.reason === 'install') {
      // First time installation
      await this.handleFirstInstall();
    } else if (details.reason === 'update') {
      // Extension update
      await this.handleUpdate(details.previousVersion);
    }
  }

  /**
   * Handle extension startup
   */
  async handleStartup() {
    log('info', 'Extension startup');
    await this.initialize();
  }

  /**
   * Handle first installation
   */
  async handleFirstInstall() {
    log('info', 'First time installation - setting up defaults');
    
    // Set default configuration
    await configManager.reset();
    
    // Initialize with default settings
    await this.initialize();
  }

  /**
   * Handle extension update
   */
  async handleUpdate(previousVersion) {
    log('info', `Extension updated from ${previousVersion}`);
    
    // Re-initialize after update
    await this.initialize();
  }

  /**
   * Handle tab update (placeholder for future milestones)
   */
  async handleTabUpdate(tabId, changeInfo, tab) {
    // Will be implemented in later milestones
    log('debug', 'Tab updated', { tabId, changeInfo, url: tab.url });
  }

  /**
   * Handle initialization error
   */
  handleInitializationError(error) {
    log('error', 'Critical initialization error', error);
    
    // Send error status to UI
    this.broadcastMessage({
      action: 'SERVICE_WORKER_ERROR',
      payload: { error: error.message, timestamp: Date.now() }
    });
  }

  // ==================== MULTI-TAB AI OPERATION HANDLERS (MILESTONE 3) ====================

  /**
   * Clean content for summarization by removing navigation and metadata
   */
  cleanContentForSummarization(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Remove common navigation and metadata patterns
    const patterns = [
      // Wikipedia patterns
      /Categories:.*?(?=\n\n|\n===|$)/gs,
      /Hidden categories:.*?(?=\n\n|\n===|$)/gs,
      /Pages with.*?(?=\n\n|\n===|$)/gs,
      /Articles containing.*?(?=\n\n|\n===|$)/gs,
      /All articles with.*?(?=\n\n|\n===|$)/gs,
      /Articles with.*?(?=\n\n|\n===|$)/gs,
      /CS1.*?(?=\n\n|\n===|$)/gs,
      /Pages using.*?(?=\n\n|\n===|$)/gs,
      /Wikipedia.*?(?=\n\n|\n===|$)/gs,
      /Use.*?(?=\n\n|\n===|$)/gs,
      
      // Website navigation patterns
      /Skip to content.*?(?=\n\n|\n===|$)/gs,
      /For Customers.*?(?=\n\n|\n===|$)/gs,
      /Support.*?(?=\n\n|\n===|$)/gs,
      /Follow.*?(?=\n\n|\n===|$)/gs,
      /Products.*?(?=\n\n|\n===|$)/gs,
      /Company.*?(?=\n\n|\n===|$)/gs,
      /Media.*?(?=\n\n|\n===|$)/gs,
      /Bloomberg.*?(?=\n\n|\n===|$)/gs,
      /Americas\+1.*?(?=\n\n|\n===|$)/gs,
      /EMEA\+44.*?(?=\n\n|\n===|$)/gs,
      /Asia Pacific\+65.*?(?=\n\n|\n===|$)/gs,
      
      // Reddit-style patterns
      /r\/\w+.*?(?=\n\n|\n===|$)/gs,
      
      // Section headers
      /^\s*===.*?===\s*$/gm,
      
      // Standalone numbers and short lines
      /^\s*\d+\s*$/gm,
      /^\s*[A-Z\s]{2,20}\s*$/gm,
      /^\s*[a-z\s]{2,20}\s*$/gm,
      
      // Social media links
      /Facebook|Instagram|LinkedIn|YouTube|Twitter/i,
      
      // Common navigation words
      /^(Categories|Hidden|Skip|For|Support|Follow|Products|Company|Media|Bloomberg|Americas|EMEA|Asia|Pacific|Facebook|Instagram|LinkedIn|YouTube|Twitter)$/gmi
    ];

    let cleaned = content;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  }

  /**
   * Handle multi-tab summarization request
   */
  async handleSummarizeMultiTab(payload, sender) {
    log('info', 'Multi-tab summarization requested', { sender: sender.tab?.url });

    try {
      // Get multi-tab collection
      const collection = await this.getMultiTabCollection();
      
      if (!collection.tabs || collection.tabs.length === 0) {
        throw new Error('No tabs available for summarization');
      }

      // Prepare content from all tabs
      const tabContents = collection.tabs.map(tab => ({
        title: tab.title,
        url: tab.url,
        content: tab.content || '',
        domain: tab.domain || new URL(tab.url).hostname
      }));

      // Clean and combine content for summarization
      const cleanedTabContents = tabContents.map(tab => ({
        ...tab,
        content: this.cleanContentForSummarization(tab.content)
      }));

      const combinedContent = cleanedTabContents
        .map(tab => `=== ${tab.title} (${tab.domain}) ===\n${tab.content}`)
        .join('\n\n');

      log('info', 'Starting multi-tab summarization', {
        tabCount: collection.tabCount,
        totalContentLength: collection.totalContentLength,
        combinedLength: combinedContent.length,
        cleanedLength: combinedContent.length
      });

      // Use AI adapter to summarize
      const summary = await this.aiAdapter.summarizeText(combinedContent, { maxLength: 'medium' });

      log('info', 'Multi-tab summarization completed', {
        summaryLength: summary.length
      });

      return {
        success: true,
        data: {
          summary,
          tabCount: collection.tabCount,
          totalContentLength: collection.totalContentLength,
          summaryLength: summary.length,
          tabs: tabContents.map(tab => ({
            title: tab.title,
            domain: tab.domain,
            contentLength: tab.content.length
          })),
          timestamp: Date.now()
        }
      };

    } catch (error) {
      log('error', 'Multi-tab summarization failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle multi-tab Q&A request
   */
  async handleAnswerMultiTabQuestion(payload, sender) {
    log('info', 'Multi-tab Q&A requested', { sender: sender.tab?.url });

    try {
      const { question } = payload;
      
      if (!question || question.length === 0) {
        throw new Error('No question provided');
      }

      // Get multi-tab collection
      const collection = await this.getMultiTabCollection();
      
      if (!collection.tabs || collection.tabs.length === 0) {
        throw new Error('No tabs available for Q&A');
      }

      // Prepare context from all tabs
      const context = collection.tabs.map(tab => 
        `${tab.title} (${tab.domain}): ${tab.content?.substring(0, 1000) || ''}`
      );

      log('info', 'Starting multi-tab Q&A', {
        questionLength: question.length,
        tabCount: collection.tabCount,
        contextCount: context.length
      });

      // Use AI adapter to answer question
      const answer = await this.aiAdapter.answerQuestion(question, context);

      log('info', 'Multi-tab Q&A completed', {
        answerLength: answer.length
      });

      return {
        success: true,
        data: {
          answer,
          question,
          tabCount: collection.tabCount,
          contextCount: context.length,
          tabs: collection.tabs.map(tab => ({
            title: tab.title,
            domain: tab.domain,
            url: tab.url
          })),
          timestamp: Date.now()
        }
      };

    } catch (error) {
      log('error', 'Multi-tab Q&A failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ==================== SERVICE WORKER INITIALIZATION ====================

// Create service worker instance
const serviceWorker = new TabSenseServiceWorker();

// Initialize when service worker starts
log('info', 'Starting service worker initialization...');
serviceWorker.initialize()
  .then(() => {
    log('info', 'Service worker initialization completed successfully');
  })
  .catch(error => {
    log('error', 'Failed to initialize service worker', error);
  });

// Export for testing (if needed)
export default serviceWorker;
