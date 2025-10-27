/**
 * TabSense Offscreen Document
 * Handles heavy processing that would make service worker too large
 */

import { CredentialManager } from '../lib/credentialManager.js';
import { ContentScorer } from '../lib/contentScorer.js';
import { enhancedCategorizer } from '../lib/enhancedCategorizer.js';
import { AdaptiveSummarizer } from '../lib/adaptiveSummarizer.js';
import { ContextEnhancer } from '../lib/contextEnhancer.js';

console.log('[TabSense Offscreen] Offscreen document loaded');

// Initialize heavy modules
let credentialManager = null;
let contentScorer = null;
let adaptiveSummarizer = null;
let contextEnhancer = null;

async function initializeHeavyModules() {
  console.log('[TabSense Offscreen] Initializing heavy modules...');
  
  try {
    credentialManager = new CredentialManager();
    console.log('[TabSense Offscreen] CredentialManager initialized');
  } catch (error) {
    console.error('[TabSense Offscreen] Failed to initialize CredentialManager:', error);
  }
  
  try {
    contentScorer = new ContentScorer();
    console.log('[TabSense Offscreen] ContentScorer initialized');
  } catch (error) {
    console.error('[TabSense Offscreen] Failed to initialize ContentScorer:', error);
  }
  
  try {
    adaptiveSummarizer = new AdaptiveSummarizer();
    console.log('[TabSense Offscreen] AdaptiveSummarizer initialized');
  } catch (error) {
    console.error('[TabSense Offscreen] Failed to initialize AdaptiveSummarizer:', error);
  }
  
  try {
    contextEnhancer = new ContextEnhancer();
    console.log('[TabSense Offscreen] ContextEnhancer initialized');
  } catch (error) {
    console.error('[TabSense Offscreen] Failed to initialize ContextEnhancer:', error);
  }
  
  console.log('[TabSense Offscreen] All heavy modules initialized');
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TabSense Offscreen] Received message:', message.action);
  
  const { action, payload } = message;
  
  // Route to appropriate handler
  switch (action) {
    case 'GET_CREDENTIALS':
      handleGetCredentials(payload, sendResponse);
      return true; // Keep channel open
      
    case 'SAVE_CREDENTIAL':
      handleSaveCredential(payload, sendResponse);
      return true;
      
    case 'SCORE_CONTENT':
      handleScoreContent(payload, sendResponse);
      return true;
      
    case 'CATEGORIZE_CONTENT':
      handleCategorizeContent(payload, sendResponse);
      return true;
      
    case 'ADAPTIVE_SUMMARIZE':
      handleAdaptiveSummarize(payload, sendResponse);
      return true;
      
    case 'ENHANCE_CONTEXT':
      handleEnhanceContext(payload, sendResponse);
      return true;
      
    case 'ANSWER_QUESTION':
      handleAnswerQuestion(payload, sendResponse);
      return true;
      
    case 'SUMMARIZE_TEXT':
      handleSummarizeText(payload, sendResponse);
      return true;
      
    default:
      console.warn('[TabSense Offscreen] Unknown action:', action);
      sendResponse({ error: 'Unknown action' });
  }
});

// Handler implementations
async function handleGetCredentials(payload, sendResponse) {
  try {
    if (!credentialManager) {
      await initializeHeavyModules();
    }
    const credentials = await credentialManager.getAll();
    sendResponse({ credentials });
  } catch (error) {
    console.error('[TabSense Offscreen] Error getting credentials:', error);
    sendResponse({ error: error.message });
  }
}

async function handleSaveCredential(payload, sendResponse) {
  try {
    if (!credentialManager) {
      await initializeHeavyModules();
    }
    await credentialManager.save(payload.provider, payload.key);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[TabSense Offscreen] Error saving credential:', error);
    sendResponse({ error: error.message });
  }
}

async function handleScoreContent(payload, sendResponse) {
  try {
    if (!contentScorer) {
      await initializeHeavyModules();
    }
    const score = await contentScorer.score(payload.content);
    sendResponse({ score });
  } catch (error) {
    console.error('[TabSense Offscreen] Error scoring content:', error);
    sendResponse({ error: error.message });
  }
}

async function handleCategorizeContent(payload, sendResponse) {
  try {
    const category = await enhancedCategorizer.categorize(payload.url, payload.content);
    sendResponse({ category });
  } catch (error) {
    console.error('[TabSense Offscreen] Error categorizing content:', error);
    sendResponse({ error: error.message });
  }
}

async function handleAdaptiveSummarize(payload, sendResponse) {
  try {
    if (!adaptiveSummarizer) {
      await initializeHeavyModules();
    }
    const summary = await adaptiveSummarizer.summarize(payload.content, payload.options);
    sendResponse({ summary });
  } catch (error) {
    console.error('[TabSense Offscreen] Error summarizing:', error);
    sendResponse({ error: error.message });
  }
}

async function handleEnhanceContext(payload, sendResponse) {
  try {
    if (!contextEnhancer) {
      await initializeHeavyModules();
    }
    const enhancedContext = await contextEnhancer.enhance(payload.context, payload.options);
    sendResponse({ success: true, data: { enhancedContext } });
  } catch (error) {
    console.error('[TabSense Offscreen] Error enhancing context:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleAnswerQuestion(payload, sendResponse) {
  console.log('[TabSense Offscreen] ANSWER_QUESTION received');
  try {
    // For now, return placeholder - AI integration will be added later
    sendResponse({ 
      success: true, 
      data: { 
        answer: 'AI response from offscreen (placeholder)',
        sources: [],
        confidence: 0.6
      } 
    });
  } catch (error) {
    console.error('[TabSense Offscreen] Error answering question:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSummarizeText(payload, sendResponse) {
  console.log('[TabSense Offscreen] SUMMARIZE_TEXT received');
  try {
    const { text } = payload || {};
    
    if (!adaptiveSummarizer) {
      await initializeHeavyModules();
    }
    
    // Try to use adaptiveSummarizer if available
    if (adaptiveSummarizer && text) {
      const summary = await adaptiveSummarizer.summarize(text, { length: 'medium' });
      sendResponse({ success: true, data: { summary } });
    } else {
      // Fallback: simple extractive
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';
      sendResponse({ success: true, data: { summary } });
    }
  } catch (error) {
    console.error('[TabSense Offscreen] Error summarizing:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Initialize on load
initializeHeavyModules();

