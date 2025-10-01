/**
 * TabSense Service Worker - Milestone 1
 * Foundation service worker with message handling and configuration
 */

import { configManager, DEFAULT_CONFIG } from '../config/index.js';
import { CredentialManager } from '../lib/credentialManager.js';
import { log } from '../utils/index.js';

/**
 * Service Worker Main Class
 * Handles extension lifecycle and core functionality
 */
class TabSenseServiceWorker {
  constructor() {
    this.initialized = false;
    this.messageHandlers = new Map();
    this.credentialManager = new CredentialManager();
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
      await configManager.load();
      log('info', 'Configuration loaded');
      
      // Credential manager is already initialized
      log('info', 'Credential manager initialized');
      
      // Set up Chrome extension listeners
      this.setupChromeListeners();
      
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
    return {
      pong: true,
      timestamp: Date.now(),
      sender: sender.tab?.url || 'unknown'
    };
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
   * Handle summarize text message (placeholder for Milestone 3)
   */
  async handleSummarizeText(payload, sender) {
    log('info', 'Summarize text requested (placeholder)');
    return {
      message: 'Summarization will be implemented in Milestone 3',
      placeholder: true,
      payload
    };
  }

  /**
   * Handle answer question message (placeholder for Milestone 3)
   */
  async handleAnswerQuestion(payload, sender) {
    log('info', 'Answer question requested (placeholder)');
    return {
      message: 'Q&A will be implemented in Milestone 3',
      placeholder: true,
      payload
    };
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
}

// ==================== SERVICE WORKER INITIALIZATION ====================

// Create service worker instance
const serviceWorker = new TabSenseServiceWorker();

// Initialize when service worker starts
serviceWorker.initialize().catch(error => {
  log('error', 'Failed to initialize service worker', error);
});

// Export for testing (if needed)
export default serviceWorker;
