/**
 * TabSense Service Worker - ABSOLUTELY MINIMAL VERSION
 * No imports, no external dependencies
 */

console.log('[TabSense] Minimal service worker loaded');

class TabSenseServiceWorker {
  constructor() {
    console.log('[TabSense] Service worker constructor called');
    this.initialized = false;
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    console.log('[TabSense] Setting up message handlers...');
    
    // Only essential handlers
    this.messageHandlers.set('PING', this.handlePing.bind(this));
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    
    console.log('[TabSense] Message handlers set up:', this.messageHandlers.size);
  }

  async initialize() {
    console.log('[TabSense] Starting initialization...');
    
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
      pong: true, 
      timestamp: Date.now(),
      initialized: this.initialized 
    };
  }

  async handleGetStatus(payload, sender) {
    console.log('[TabSense] GET_STATUS received');
    return {
      status: 'ready',
      initialized: this.initialized,
      handlers: Array.from(this.messageHandlers.keys())
    };
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

