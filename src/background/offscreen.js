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
    // Get API key from storage
    const result = await chrome.storage.local.get(['ai_api_keys']);
    const aiApiKeys = result.ai_api_keys || {};
    const geminiApiKey = aiApiKeys.google || aiApiKeys.gemini;
    
    if (geminiApiKey) {
      adaptiveSummarizer = new AdaptiveSummarizer(geminiApiKey, 'gemini-2.0-flash');
      console.log('[TabSense Offscreen] AdaptiveSummarizer initialized with Gemini API key');
    } else {
      console.log('[TabSense Offscreen] No Gemini API key found, AdaptiveSummarizer will use fallback');
      adaptiveSummarizer = new AdaptiveSummarizer();
    }
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
  // Only handle messages meant for offscreen
  if (message.target !== 'offscreen') {
    return; // Ignore messages not for us
  }
  
  console.log('[TabSense Offscreen] Received message:', message.action, 'Full message:', message);
  
  const { action, payload, text, url, title, metadata, options } = message;
  
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
      // For flat structure, extract the payload from the message itself
      const adaptivePayload = payload || { text, url, title, metadata, options };
      handleAdaptiveSummarize(adaptivePayload, sendResponse);
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
    
    case 'EXTRACT_DATA_FROM_URL':
      handleExtractDataFromUrl(payload, sendResponse);
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
    const { text, options } = payload || {};
    
    if (!text) {
      sendResponse({ success: false, error: 'Text is required' });
      return;
    }
    
    // AdaptiveSummarizer.summarize expects {url, title, content, metadata}
    const pageData = {
      url: payload.url || '',
      title: payload.title || '',
      content: text,
      metadata: payload.metadata || {}
    };
    
    const result = await adaptiveSummarizer.summarize(pageData, options?.length || 'medium');
    
    if (result && result.success) {
      sendResponse({ success: true, data: result.data || result });
    } else {
      sendResponse({ success: false, error: result?.error || 'Summarization failed' });
    }
  } catch (error) {
    console.error('[TabSense Offscreen] Error in adaptive summarization:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEnhanceContext(payload, sendResponse) {
  try {
    if (!contextEnhancer) {
      await initializeHeavyModules();
    }
    
    const { pageData, contextType } = payload || {};
    
    if (!pageData || !pageData.title) {
      sendResponse({ success: false, error: 'Page data with title is required' });
      return;
    }
    
    // ContextEnhancer expects {title, url, content, pageType}
    const context = await contextEnhancer.getExternalContext({
      title: pageData.title,
      url: pageData.url || '',
      content: pageData.content || '',
      pageType: pageData.pageType || 'generic'
    }, payload.apiKey);
    
    sendResponse({ 
      success: true, 
      data: { 
        title: pageData.title,
        summary: context.summary || pageData.summary || 'No summary available',
        context: context.context || []
      } 
    });
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
    
    if (!text) {
      sendResponse({ success: false, error: 'Text is required' });
      return;
    }
    
    if (!adaptiveSummarizer) {
      await initializeHeavyModules();
    }
    
    // Try to use adaptiveSummarizer if available
    if (adaptiveSummarizer) {
      const pageData = {
        url: payload.url || '',
        title: payload.title || '',
        content: text,
        metadata: {}
      };
      
      const result = await adaptiveSummarizer.summarize(pageData, 'medium');
      
      if (result && result.success) {
        sendResponse({ 
          success: true, 
          data: { 
            summary: result.data?.summary || result.summary,
            metadata: result.data?.metadata || result.metadata,
            cached: result.data?.cached || result.cached
          } 
        });
      } else {
        // Fallback if summarizer fails
        throw new Error(result?.error || 'Summarization failed');
      }
    } else {
      // Fallback: simple extractive
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';
      sendResponse({ success: true, data: { summary } });
    }
  } catch (error) {
    console.error('[TabSense Offscreen] Error summarizing:', error);
    
    // Still provide fallback on error
    try {
      const { text } = payload || {};
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';
      sendResponse({ success: true, data: { summary } });
    } catch (fallbackError) {
      sendResponse({ success: false, error: error.message });
    }
  }
}

async function handleExtractDataFromUrl(payload, sendResponse) {
  console.log('[TabSense Offscreen] EXTRACT_DATA_FROM_URL received');
  try {
    const { url } = payload || {};
    
    if (!url) {
      sendResponse({ success: false, error: 'URL is required' });
      return;
    }
    
    // Check if URL is from a supported external API
    if (url.includes('youtube.com')) {
      // YouTube API integration would go here
      sendResponse({ 
        success: true, 
        data: { 
          url, 
          type: 'youtube',
          extracted: false,
          message: 'YouTube API integration requires API key configuration'
        } 
      });
    } else if (url.includes('newsapi.org') || url.match(/\/news/)) {
      // News API integration would go here
      sendResponse({ 
        success: true, 
        data: { 
          url, 
          type: 'news',
          extracted: false,
          message: 'News API integration requires API key configuration'
        } 
      });
    } else {
      // Generic extraction
      sendResponse({ 
        success: true, 
        data: { 
          url, 
          type: 'generic',
          extracted: false,
          message: 'Generic URL extraction not yet implemented'
        } 
      });
    }
  } catch (error) {
    console.error('[TabSense Offscreen] Error extracting data from URL:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Initialize on load
initializeHeavyModules();

