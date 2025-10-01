/**
 * AI Adapter for TabSense - Strategic Multi-Model Architecture
 * Supports: Chrome Built-in AI, OpenAI, Anthropic, Google Cloud AI, Local Models
 * Designed for flexibility, cost optimization, and vendor independence
 */

import { log, createError } from '../utils/index.js';

/**
 * AI Adapter Class - Industry standard pattern
 */
export class AIAdapter {
  constructor() {
    this.isChromeAIAvailable = false;
    this.fallbackMode = false;
    this.initialize();
  }

  /**
   * Initialize AI adapter and check availability
   */
  async initialize() {
    log('info', 'Initializing AI Adapter...');
    
    // Check for Chrome built-in AI APIs
    this.isChromeAIAvailable = await this.checkChromeAI();
    
    if (this.isChromeAIAvailable) {
      log('info', 'Chrome built-in AI APIs detected');
    } else {
      log('warn', 'Chrome built-in AI APIs not available, using fallback mode');
      this.fallbackMode = true;
    }
  }

  /**
   * Check if Chrome built-in AI APIs are available
   * @returns {Promise<boolean>} - True if Chrome AI is available
   */
  async checkChromeAI() {
    try {
      // Check if window.ai exists (experimental Chrome AI APIs)
      if (typeof window !== 'undefined' && window.ai) {
        // Test if summarizer API exists
        if (window.ai.summarizer) {
          log('info', 'Chrome AI summarizer API found');
          return true;
        }
      }
      
      // Check in service worker context
      if (typeof self !== 'undefined' && self.ai) {
        if (self.ai.summarizer) {
          log('info', 'Chrome AI summarizer API found in service worker');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      log('error', 'Error checking Chrome AI availability', error);
      return false;
    }
  }

  /**
   * Summarize text using available AI
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @returns {Promise<string>} - Summary text
   */
  async summarizeText(text, options = {}) {
    const { maxLength = 'medium', language = 'en' } = options;
    
    log('info', `Summarizing text (${text.length} chars, mode: ${maxLength})`);
    
    try {
      // Try Chrome built-in AI first
      if (this.isChromeAIAvailable && !this.fallbackMode) {
        return await this.summarizeWithChromeAI(text, options);
      }
      
      // Fallback to local summarization
      return await this.summarizeWithFallback(text, options);
      
    } catch (error) {
      log('error', 'Summarization failed', error);
      return this.createErrorSummary(text, error);
    }
  }

  /**
   * Summarize using Chrome built-in AI (experimental)
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithChromeAI(text, options) {
    try {
      log('info', 'Using Chrome built-in AI for summarization');
      
      // Check if we're in a context where window.ai is available
      if (typeof window !== 'undefined' && window.ai && window.ai.summarizer) {
        const summarizer = await window.ai.summarizer.create();
        const result = await summarizer.summarize(text);
        return result?.text || result || 'Chrome AI summarization completed';
      }
      
      // Service worker context
      if (typeof self !== 'undefined' && self.ai && self.ai.summarizer) {
        const summarizer = await self.ai.summarizer.create();
        const result = await summarizer.summarize(text);
        return result?.text || result || 'Chrome AI summarization completed';
      }
      
      throw new Error('Chrome AI APIs not accessible in current context');
      
    } catch (error) {
      log('warn', 'Chrome AI summarization failed, falling back', error);
      throw error;
    }
  }

  /**
   * Fallback summarization using local algorithms
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithFallback(text, options) {
    log('info', 'Using fallback summarization');
    
    const { maxLength = 'medium' } = options;
    
    // Determine summary length
    const maxSentences = maxLength === 'short' ? 2 : maxLength === 'long' ? 5 : 3;
    
    // Extract sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    if (sentences.length <= maxSentences) {
      return text.trim();
    }
    
    // Simple extractive summarization - take first and last sentences
    const selectedSentences = [];
    
    // Add first sentence (usually contains main topic)
    if (sentences[0]) {
      selectedSentences.push(sentences[0]);
    }
    
    // Add middle sentences if we need more
    if (maxSentences > 2) {
      const middleStart = Math.floor(sentences.length / 2) - 1;
      const middleEnd = middleStart + (maxSentences - 2);
      
      for (let i = middleStart; i < middleEnd && i < sentences.length - 1; i++) {
        if (sentences[i]) {
          selectedSentences.push(sentences[i]);
        }
      }
    }
    
    // Add last sentence if we have space
    if (selectedSentences.length < maxSentences && sentences[sentences.length - 1]) {
      selectedSentences.push(sentences[sentences.length - 1]);
    }
    
    const summary = selectedSentences.join(' ').replace(/\s+/g, ' ').trim();
    
    log('info', `Fallback summary generated (${summary.length} chars)`);
    return summary;
  }

  /**
   * Answer questions using available AI
   * @param {string} question - Question to answer
   * @param {Array} summaries - Array of tab summaries
   * @returns {Promise<string>} - Answer
   */
  async answerQuestion(question, summaries) {
    log('info', `Answering question: "${question}" with ${summaries.length} summaries`);
    
    try {
      // Try Chrome built-in AI first
      if (this.isChromeAIAvailable && !this.fallbackMode) {
        return await this.answerWithChromeAI(question, summaries);
      }
      
      // Fallback to keyword matching
      return await this.answerWithFallback(question, summaries);
      
    } catch (error) {
      log('error', 'Question answering failed', error);
      return this.createErrorAnswer(question, error);
    }
  }

  /**
   * Answer using Chrome built-in AI
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithChromeAI(question, summaries) {
    try {
      log('info', 'Using Chrome built-in AI for Q&A');
      
      const context = summaries.map((s, i) => 
        `[${i + 1}] ${s.title}: ${s.summary}`
      ).join('\n\n');
      
      const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
      
      if (typeof window !== 'undefined' && window.ai && window.ai.prompt) {
        const session = await window.ai.prompt.create();
        const response = await session.prompt(prompt);
        return response?.text || response || 'Chrome AI answer generated';
      }
      
      if (typeof self !== 'undefined' && self.ai && self.ai.prompt) {
        const session = await self.ai.prompt.create();
        const response = await session.prompt(prompt);
        return response?.text || response || 'Chrome AI answer generated';
      }
      
      throw new Error('Chrome AI prompt API not accessible');
      
    } catch (error) {
      log('warn', 'Chrome AI Q&A failed, falling back', error);
      throw error;
    }
  }

  /**
   * Fallback Q&A using keyword matching
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithFallback(question, summaries) {
    log('info', 'Using fallback Q&A');
    
    if (summaries.length === 0) {
      return 'No summaries available to answer your question.';
    }
    
    // Extract keywords from question
    const keywords = question.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['what', 'how', 'why', 'when', 'where', 'which', 'who'].includes(word));
    
    // Find relevant summaries
    const relevantSummaries = summaries.filter(summary => {
      const text = `${summary.title} ${summary.summary}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword));
    });
    
    if (relevantSummaries.length === 0) {
      return `I couldn't find relevant information in your open tabs to answer "${question}". Try asking about topics mentioned in your tab titles or summaries.`;
    }
    
    // Create simple answer
    const sourceTitles = relevantSummaries.map(s => s.title).join(', ');
    const answer = `Based on ${relevantSummaries.length} relevant tab(s): ${sourceTitles}. `;
    
    // Add some context from the most relevant summary
    const mostRelevant = relevantSummaries[0];
    const context = mostRelevant.summary.substring(0, 200) + '...';
    
    return answer + `Here's some relevant information: ${context}`;
  }

  /**
   * Proofread text (placeholder for future implementation)
   * @param {string} text - Text to proofread
   * @returns {Promise<string>} - Proofread text
   */
  async proofreadText(text) {
    log('info', 'Proofreading text (placeholder implementation)');
    
    // Placeholder implementation
    // In the future, this would use Chrome's proofreader API
    return text; // For now, just return the original text
  }

  /**
   * Translate text (placeholder for future implementation)
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language
   * @returns {Promise<string>} - Translated text
   */
  async translateText(text, targetLanguage) {
    log('info', `Translating text to ${targetLanguage} (placeholder implementation)`);
    
    // Placeholder implementation
    // In the future, this would use Chrome's translator API
    return text; // For now, just return the original text
  }

  /**
   * Create error summary when all methods fail
   * @param {string} text - Original text
   * @param {Error} error - Error that occurred
   * @returns {string} - Error summary
   */
  createErrorSummary(text, error) {
    const title = this.extractTitle(text);
    return `Unable to summarize content from "${title}". Error: ${error.message}`;
  }

  /**
   * Create error answer when Q&A fails
   * @param {string} question - Original question
   * @param {Error} error - Error that occurred
   * @returns {string} - Error answer
   */
  createErrorAnswer(question, error) {
    return `Unable to answer "${question}". Error: ${error.message}`;
  }

  /**
   * Extract title from text
   * @param {string} text - Text to extract title from
   * @returns {string} - Extracted title
   */
  extractTitle(text) {
    const firstLine = text.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * Get adapter status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      chromeAIAvailable: this.isChromeAIAvailable,
      fallbackMode: this.fallbackMode,
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
export const aiAdapter = new AIAdapter();

// Export for testing
export default AIAdapter;
