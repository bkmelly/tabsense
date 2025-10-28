/**
 * TabSense Offscreen Document
 * Handles heavy processing that would make service worker too large
 */

// Note: Some modules removed - they use chrome.storage.local which is not available in offscreen context
import { ContentScorer } from '../lib/contentScorer.js';
import { enhancedCategorizer } from '../lib/enhancedCategorizer.js';
import { AdaptiveSummarizer } from '../lib/adaptiveSummarizer.js';

console.log('[TabSense Offscreen] ═══ Offscreen document loaded ═══');
console.log('[TabSense Offscreen] Offscreen document URL:', window.location.href);
console.log('[TabSense Offscreen] Chrome version:', chrome.runtime.getManifest().version);

// Initialize heavy modules
let credentialManager = null;
let contentScorer = null;
let adaptiveSummarizer = null;
let contextEnhancer = null;

async function initializeHeavyModules() {
  console.log('[TabSense Offscreen] Initializing heavy modules...');
  
  // Note: CredentialManager uses chrome.storage.local which is not available in offscreen context
  // We skip it and request API keys from service worker instead when needed
  console.log('[TabSense Offscreen] Skipping CredentialManager (not available in offscreen context)');
  
  try {
    contentScorer = new ContentScorer();
    console.log('[TabSense Offscreen] ContentScorer initialized');
  } catch (error) {
    console.error('[TabSense Offscreen] Failed to initialize ContentScorer:', error);
  }
  
  // Note: AdaptiveSummarizer uses CachingManager and ContextEnhancer internally,
  // both of which use chrome.storage.local. We cannot initialize it here.
  // It will be created dynamically with API key when summarization is requested.
  console.log('[TabSense Offscreen] Skipping AdaptiveSummarizer (uses storage-dependent modules)');
  console.log('[TabSense Offscreen] It will be created on-demand with API key');
  
  // Note: ContextEnhancer might also use chrome.storage.local, skip it for now
  console.log('[TabSense Offscreen] Skipping ContextEnhancer (may use storage not available in offscreen)');
  
  console.log('[TabSense Offscreen] Heavy modules initialized');
}

console.log('[TabSense Offscreen] ✅ Setting up message listener...');

// Listen for messages from service worker - initialized early to catch messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TabSense Offscreen] 📨 Message received! Target:', message.target, 'Action:', message.action, 'Full message:', message);
  
  // Only handle messages meant for offscreen
  if (message.target !== 'offscreen') {
    console.log('[TabSense Offscreen] ⚠️ Ignoring message - target is not "offscreen"');
    return false; // Don't keep channel open for messages not for us
  }
  
  console.log('[TabSense Offscreen] ✅ Processing message for offscreen:', message.action, 'Full message:', message);
  
  const { action, payload, text, url, title, metadata, options } = message;
  
  // Route to appropriate handler
  switch (action) {
    case 'PING_OFFSCREEN':
      console.log('[TabSense Offscreen] 📩 PING_OFFSCREEN received, responding...');
      sendResponse({ success: true, message: 'Offscreen document is alive and responding!' });
      return true;
      
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
      // Handle async properly
      handleAdaptiveSummarize(adaptivePayload, sendResponse).catch((error) => {
        console.error('[TabSense Offscreen] Error in handleAdaptiveSummarize:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep channel open for async response
      
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
      return false;
  }
});

// Handler implementations
async function handleGetCredentials(payload, sendResponse) {
  try {
    // CredentialManager not available in offscreen context
    // Return error to indicate this functionality is not supported
    console.warn('[TabSense Offscreen] CredentialManager not available in offscreen context');
    sendResponse({ error: 'Credential management not supported in offscreen context' });
  } catch (error) {
    console.error('[TabSense Offscreen] Error getting credentials:', error);
    sendResponse({ error: error.message });
  }
}

async function handleSaveCredential(payload, sendResponse) {
  try {
    // CredentialManager not available in offscreen context
    console.warn('[TabSense Offscreen] CredentialManager not available in offscreen context');
    sendResponse({ error: 'Credential management not supported in offscreen context' });
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
  console.log('[TabSense Offscreen] 🔄 handleAdaptiveSummarize called with payload:', payload);
  try {
    // Request API keys from service worker since offscreen can't access chrome.storage.local
    console.log('[TabSense Offscreen] 📤 Requesting API keys from service worker...');
    let apiKeys = null;
    try {
      apiKeys = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'GET_API_KEYS', type: 'ai' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('[TabSense Offscreen] Error getting API keys:', chrome.runtime.lastError);
              resolve(null);
            } else {
              resolve(response);
            }
          }
        );
      });
    } catch (error) {
      console.error('[TabSense Offscreen] Failed to get API keys:', error);
    }
    
    // Extract Gemini API key
    const geminiKey = apiKeys?.data?.ai_api_keys?.google || apiKeys?.data?.ai_api_keys?.gemini;
    console.log('[TabSense Offscreen] 🔑 Gemini API key available:', !!geminiKey);
    
    // Create AdaptiveSummarizer instance with the API key
    if (geminiKey && !adaptiveSummarizer) {
      console.log('[TabSense Offscreen] 🔄 Creating AdaptiveSummarizer with API key...');
      adaptiveSummarizer = new AdaptiveSummarizer(geminiKey, 'gemini-2.0-flash');
    }
    
    if (!adaptiveSummarizer) {
      console.log('[TabSense Offscreen] ⚠️ No API key, AdaptiveSummarizer not available');
      sendResponse({ success: false, error: 'No AI API key configured' });
      return;
    }
    
    const { text, options } = payload || {};
    
    if (!text) {
      console.log('[TabSense Offscreen] ❌ No text provided in payload');
      sendResponse({ success: false, error: 'Text is required' });
      return;
    }
    
    console.log('[TabSense Offscreen] 📝 Summarizing text with length:', text.length);
    
    // AdaptiveSummarizer.summarize expects {url, title, content, metadata}
    const pageData = {
      url: payload.url || '',
      title: payload.title || '',
      content: text,
      metadata: payload.metadata || {}
    };
    
    // Call summarizer
    console.log('[TabSense Offscreen] 📊 Calling adaptiveSummarizer.summarize()...');
    const result = await adaptiveSummarizer.summarize(pageData, options?.length || 'medium');
    
    console.log('[TabSense Offscreen] ✅ Summarization result:', result);
    
    if (result && result.success) {
      console.log('[TabSense Offscreen] ✅ Success! Sending response...');
      sendResponse({ success: true, data: result.data || result });
    } else {
      console.log('[TabSense Offscreen] ❌ Summarization failed, error:', result?.error);
      sendResponse({ success: false, error: result?.error || 'Summarization failed' });
    }
  } catch (error) {
    console.error('[TabSense Offscreen] ❌ Error in adaptive summarization:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEnhanceContext(payload, sendResponse) {
  try {
    // ContextEnhancer not available in offscreen context (uses storage)
    console.warn('[TabSense Offscreen] ContextEnhancer not available in offscreen context');
    sendResponse({ 
      success: false, 
      error: 'Context enhancement not supported in offscreen context' 
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
    
    // AdaptiveSummarizer not available in offscreen context (uses storage)
    // Provide fallback extractive summarization
    console.log('[TabSense Offscreen] Using extractive fallback summarization');
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    sendResponse({ success: true, data: { summary } });
  } catch (error) {
    console.error('[TabSense Offscreen] Error summarizing:', error);
    sendResponse({ success: false, error: error.message });
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
initializeHeavyModules().then(() => {
  console.log('[TabSense Offscreen] ✅✅✅ INITIALIZATION COMPLETE - READY TO RECEIVE MESSAGES');
}).catch((error) => {
  console.error('[TabSense Offscreen] ❌ Initialization failed:', error);
});

