/**
 * TabSense Heavy Modules Bundle
 * Contains all heavy functionality loaded via fetch
 */

// Import all heavy modules
import { AIAdapter } from '../lib/aiAdapter.js';
import { unifiedAPI } from '../lib/api/unifiedAPI.js';
import { ContentExtractor } from '../lib/contentExtractor.js';
import { ContentScorer } from '../lib/contentScorer.js';
import { URLFilter } from '../lib/urlFilter.js';
import { enhancedCategorizer } from '../lib/enhancedCategorizer.js';
import { AdaptiveSummarizer } from '../lib/adaptiveSummarizer.js';
import { CachingManager } from '../lib/cachingManager.js';
import { ContextEnhancer } from '../lib/contextEnhancer.js';
import { log } from '../utils/index.js';

/**
 * Heavy Modules Implementation
 * Contains all the actual functionality implementations
 */
class HeavyModulesImplementation {
  constructor(serviceWorker) {
    this.serviceWorker = serviceWorker;
    this.initialized = false;
  }

  /**
   * Initialize heavy modules
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[TabSense] Initializing heavy modules...');
    
    // Initialize components
    this.aiAdapter = new AIAdapter();
    this.contentExtractor = new ContentExtractor();
    this.contentScorer = new ContentScorer();
    this.urlFilter = new URLFilter();
    this.enhancedCategorizer = enhancedCategorizer;
    this.adaptiveSummarizer = null; // Will be initialized with API keys
    this.cachingManager = new CachingManager();
    this.contextEnhancer = new ContextEnhancer();
    
    // Initialize AI Adapter
    await this.aiAdapter.initialize();
    
    // Initialize APIs
    await unifiedAPI.initialize();
    
    this.initialized = true;
    console.log('[TabSense] Heavy modules initialized successfully');
  }

  /**
   * Get multi-tab collection
   */
  async getMultiTabCollection(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Getting multi-tab collection...');
      
      const tabs = await chrome.tabs.query({});
      const processedTabs = [];
      
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          try {
            const processedData = await this.processTab(tab);
            if (processedData) {
              processedTabs.push(processedData);
            }
          } catch (error) {
            console.error('[TabSense] Error processing tab:', tab.url, error);
          }
        }
      }
      
      console.log('[TabSense] Processed tabs:', processedTabs.length);
      return { tabs: processedTabs, totalTabs: processedTabs.length };
      
    } catch (error) {
      console.error('[TabSense] Error getting multi-tab collection:', error);
      return { tabs: [], totalTabs: 0, error: error.message };
    }
  }

  /**
   * Process a single tab
   */
  async processTab(tab) {
    try {
      console.log('[TabSense] Processing tab:', tab.url);
      
      // Check if tab is already being processed
      if (this.serviceWorker.processingTabs.has(tab.id)) {
        console.log('[TabSense] Tab already being processed:', tab.id);
        return null;
      }
      
      this.serviceWorker.processingTabs.add(tab.id);
      
      try {
        // Extract content
        const extractedContent = await this.contentExtractor.extractContent(tab.url);
        if (!extractedContent || !extractedContent.text) {
          console.log('[TabSense] No content extracted from:', tab.url);
          return null;
        }
        
        // Score content
        const score = await this.contentScorer.scoreContent(extractedContent);
        if (score < 0.3) {
          console.log('[TabSense] Content score too low:', score);
          return null;
        }
        
        // Filter URL
        if (!this.urlFilter.shouldProcess(extractedContent.url)) {
          console.log('[TabSense] URL filtered out:', extractedContent.url);
          return null;
        }
        
        // Categorize content
        const category = await this.enhancedCategorizer.categorizeContent(extractedContent);
        
        // Get external context
        const enhancedContext = await this.contextEnhancer.getExternalContext(extractedContent.text);
        
        // Initialize adaptive summarizer if needed
        if (!this.adaptiveSummarizer) {
          const apiKeys = await this.serviceWorker.credentialManager.getApiKeys();
          const apiKey = apiKeys.google || apiKeys.openai || apiKeys.anthropic;
          if (apiKey) {
            this.adaptiveSummarizer = new AdaptiveSummarizer(apiKey, 'gemini-2.0-flash');
          }
        }
        
        // Generate summary
        let summary = '';
        let summaryMethod = 'basic';
        
        if (this.adaptiveSummarizer) {
          try {
            const adaptiveSummary = await this.adaptiveSummarizer.summarize(
              extractedContent.text,
              extractedContent.url,
              enhancedContext
            );
            summary = adaptiveSummary.summary;
            summaryMethod = 'adaptive';
          } catch (error) {
            console.error('[TabSense] Adaptive summarization failed:', error);
            // Fallback to basic summarization
            summary = await this.generateBasicSummary(extractedContent.text);
          }
        } else {
          summary = await this.generateBasicSummary(extractedContent.text);
        }
        
        const processedData = {
          id: tab.id,
          url: extractedContent.url,
          title: extractedContent.title || tab.title,
          summary: summary,
          category: category,
          score: score,
          processedAt: new Date().toISOString(),
          metadata: {
            processedAt: new Date().toISOString(),
            summaryMethod: summaryMethod,
            cached: false,
            contextEnhanced: !!enhancedContext,
            contextSources: enhancedContext ? ['external'] : [],
            extractedAt: new Date().toISOString(),
            tabId: tab.id
          }
        };
        
        // Store in cache
        await this.cachingManager.storeSummary(extractedContent.url, processedData);
        
        // Broadcast to UI
        this.serviceWorker.broadcastMessage({
          action: 'TAB_PROCESSED',
          data: processedData
        });
        
        console.log('[TabSense] Tab processed successfully:', tab.url);
        return processedData;
        
      } finally {
        this.serviceWorker.processingTabs.delete(tab.id);
      }
      
    } catch (error) {
      console.error('[TabSense] Error processing tab:', tab.url, error);
      this.serviceWorker.processingTabs.delete(tab.id);
      return null;
    }
  }

  /**
   * Generate basic summary
   */
  async generateBasicSummary(text) {
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary;
  }

  /**
   * Get archive conversations
   */
  async getArchiveConversations(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Getting archive conversations...');
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      
      console.log('[TabSense] Found conversations:', conversations.length);
      return { conversations };
      
    } catch (error) {
      console.error('[TabSense] Error getting archive conversations:', error);
      return { conversations: [], error: error.message };
    }
  }

  /**
   * Save conversation to archive
   */
  async saveConversationToArchive(payload, sender) {
    await this.initialize();
    
    try {
      const { conversation } = payload;
      console.log('[TabSense] Saving conversation to archive...');
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      
      const newConversation = {
        id: Date.now().toString(),
        ...conversation,
        archivedAt: new Date().toISOString()
      };
      
      conversations.push(newConversation);
      
      await chrome.storage.local.set({ archive_conversations: conversations });
      
      console.log('[TabSense] Conversation saved to archive');
      return { message: 'Conversation saved to archive', conversation: newConversation };
      
    } catch (error) {
      console.error('[TabSense] Error saving conversation to archive:', error);
      return { error: error.message };
    }
  }

  /**
   * Delete archive conversation
   */
  async deleteArchiveConversation(payload, sender) {
    await this.initialize();
    
    try {
      const { conversationId } = payload;
      console.log('[TabSense] Deleting archive conversation:', conversationId);
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      
      const filteredConversations = conversations.filter(c => c.id !== conversationId);
      
      await chrome.storage.local.set({ archive_conversations: filteredConversations });
      
      console.log('[TabSense] Conversation deleted from archive');
      return { message: 'Conversation deleted from archive' };
      
    } catch (error) {
      console.error('[TabSense] Error deleting archive conversation:', error);
      return { error: error.message };
    }
  }

  /**
   * Data management methods
   */
  async deleteSummaries(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Deleting summaries...');
      
      await chrome.storage.local.remove(['processed_tabs', 'tab_summaries']);
      
      console.log('[TabSense] Summaries deleted');
      return { message: 'Summaries deleted successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error deleting summaries:', error);
      return { error: error.message };
    }
  }

  async deleteConversations(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Deleting conversations...');
      
      await chrome.storage.local.remove(['archive_conversations']);
      
      console.log('[TabSense] Conversations deleted');
      return { message: 'Conversations deleted successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error deleting conversations:', error);
      return { error: error.message };
    }
  }

  async resetSettings(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Resetting settings...');
      
      await chrome.storage.local.remove(['api_keys', 'api_enabled_openai', 'api_enabled_anthropic', 'api_enabled_google', 'api_enabled_other']);
      
      console.log('[TabSense] Settings reset');
      return { message: 'Settings reset successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error resetting settings:', error);
      return { error: error.message };
    }
  }

  async clearAll(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Clearing all data...');
      
      await chrome.storage.local.clear();
      
      console.log('[TabSense] All data cleared');
      return { message: 'All data cleared successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error clearing all data:', error);
      return { error: error.message };
    }
  }

  async exportData(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Exporting data...');
      
      const allData = await chrome.storage.local.get();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        data: allData
      };
      
      console.log('[TabSense] Data exported');
      return { message: 'Data exported successfully', data: exportData };
      
    } catch (error) {
      console.error('[TabSense] Error exporting data:', error);
      return { error: error.message };
    }
  }

  async getStats(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Getting storage stats...');
      
      const allData = await chrome.storage.local.get();
      const dataSize = JSON.stringify(allData).length;
      
      const stats = {
        totalItems: Object.keys(allData).length,
        totalSize: dataSize,
        totalSizeFormatted: this.formatBytes(dataSize),
        lastUpdated: new Date().toISOString()
      };
      
      console.log('[TabSense] Storage stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('[TabSense] Error getting storage stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Cache management methods
   */
  async clearCache(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Clearing cache...');
      
      await this.cachingManager.clearCache();
      
      console.log('[TabSense] Cache cleared');
      return { message: 'Cache cleared successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error clearing cache:', error);
      return { error: error.message };
    }
  }

  async checkCachedSummaries(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Checking cached summaries...');
      
      const stats = await this.cachingManager.getCacheStats();
      
      console.log('[TabSense] Cache stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('[TabSense] Error checking cached summaries:', error);
      return { error: error.message };
    }
  }

  async getCachedSummaryByUrl(payload, sender) {
    await this.initialize();
    
    try {
      const { url } = payload;
      console.log('[TabSense] Getting cached summary for URL:', url);
      
      const summary = await this.cachingManager.getCachedSummary(url);
      
      console.log('[TabSense] Cached summary found:', !!summary);
      return { summary };
      
    } catch (error) {
      console.error('[TabSense] Error getting cached summary:', error);
      return { error: error.message };
    }
  }

  /**
   * Adaptive summarization methods
   */
  async adaptiveSummarize(payload, sender) {
    await this.initialize();
    
    try {
      const { text, url, context } = payload;
      console.log('[TabSense] Adaptive summarization requested...');
      
      if (!this.adaptiveSummarizer) {
        const apiKeys = await this.serviceWorker.credentialManager.getApiKeys();
        const apiKey = apiKeys.google || apiKeys.openai || apiKeys.anthropic;
        if (apiKey) {
          this.adaptiveSummarizer = new AdaptiveSummarizer(apiKey, 'gemini-2.0-flash');
        }
      }
      
      if (!this.adaptiveSummarizer) {
        throw new Error('No API key available for adaptive summarization');
      }
      
      const result = await this.adaptiveSummarizer.summarize(text, url, context);
      
      console.log('[TabSense] Adaptive summarization completed');
      return result;
      
    } catch (error) {
      console.error('[TabSense] Error in adaptive summarization:', error);
      return { error: error.message };
    }
  }

  /**
   * Context enhancement methods
   */
  async enhanceContext(payload, sender) {
    await this.initialize();
    
    try {
      const { text, url } = payload;
      console.log('[TabSense] Context enhancement requested...');
      
      const enhancedContext = await this.contextEnhancer.getExternalContext(text);
      
      console.log('[TabSense] Context enhancement completed');
      return { context: enhancedContext };
      
    } catch (error) {
      console.error('[TabSense] Error in context enhancement:', error);
      return { error: error.message };
    }
  }

  async getExternalContext(payload, sender) {
    await this.initialize();
    
    try {
      const { query } = payload;
      console.log('[TabSense] External context requested for query:', query);
      
      const context = await this.contextEnhancer.getExternalContext(query);
      
      console.log('[TabSense] External context retrieved');
      return { context };
      
    } catch (error) {
      console.error('[TabSense] Error getting external context:', error);
      return { error: error.message };
    }
  }

  /**
   * Category stats methods
   */
  async getCategoryStats(payload, sender) {
    await this.initialize();
    
    try {
      console.log('[TabSense] Getting category stats...');
      
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      
      const categoryStats = {};
      tabs.forEach(tab => {
        const category = tab.category || 'uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });
      
      console.log('[TabSense] Category stats:', categoryStats);
      return { categoryStats };
      
    } catch (error) {
      console.error('[TabSense] Error getting category stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Tab processed handler
   */
  async tabProcessed(payload, sender) {
    await this.initialize();
    
    try {
      const { tabData } = payload;
      console.log('[TabSense] Tab processed event received:', tabData.url);
      
      // Store the processed tab data
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      
      // Update or add the tab
      const existingIndex = tabs.findIndex(t => t.id === tabData.id);
      if (existingIndex >= 0) {
        tabs[existingIndex] = tabData;
      } else {
        tabs.push(tabData);
      }
      
      await chrome.storage.local.set({ processed_tabs: tabs });
      
      console.log('[TabSense] Tab data stored');
      return { message: 'Tab data stored successfully' };
      
    } catch (error) {
      console.error('[TabSense] Error handling tab processed:', error);
      return { error: error.message };
    }
  }

  /**
   * Utility methods
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export the implementation as a function that can be executed
function createHeavyModulesImplementation() {
  return HeavyModulesImplementation;
}

// Also export as default for ES6 compatibility
export default HeavyModulesImplementation;
export { createHeavyModulesImplementation };