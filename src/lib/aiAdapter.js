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
      log('warn', 'Chrome built-in AI APIs not available, using external AI providers');
      this.fallbackMode = true;
    }
    
    // Initialize external AI providers
    await this.initializeExternalProviders();
  }

  /**
   * Initialize external AI providers
   */
  async initializeExternalProviders() {
    try {
      // Check for OpenAI API key
      const openaiKey = await this.getStoredAPIKey('openai');
      if (openaiKey) {
        this.openaiAvailable = true;
        log('info', 'OpenAI API key found');
      } else {
        log('info', 'No OpenAI API key found');
      }
      
      // Check for Anthropic API key (Claude Haiku - CHEAPEST)
      const anthropicKey = await this.getStoredAPIKey('anthropic');
      if (anthropicKey) {
        this.anthropicAvailable = true;
        log('info', 'Anthropic API key found (Claude Haiku - cheapest option)');
      } else {
        log('info', 'No Anthropic API key found');
      }
      
      // Check for Google AI API key (Gemini Pro - VERY CHEAP)
      const googleKey = await this.getStoredAPIKey('google');
      if (googleKey) {
        this.googleAvailable = true;
        log('info', 'Google AI API key found (Gemini Pro - very cheap)');
      } else {
        log('info', 'No Google AI API key found');
      }
      
      // Check for xAI API key (Grok)
      const xaiKey = await this.getStoredAPIKey('xai');
      if (xaiKey) {
        this.xaiAvailable = true;
        log('info', 'xAI API key found (Grok)');
      } else {
        log('info', 'No xAI API key found');
      }
      
    } catch (error) {
      log('error', 'Failed to initialize external providers', error);
    }
  }

  /**
   * Get stored API key from Chrome storage
   */
  async getStoredAPIKey(provider) {
    try {
      const result = await chrome.storage.local.get([`${provider}_api_key`]);
      return result[`${provider}_api_key`];
    } catch (error) {
      log('warn', `Failed to get ${provider} API key`, error);
      return null;
    }
  }

  /**
   * Check if Chrome built-in AI APIs are available
   * @returns {Promise<boolean>} - True if Chrome AI is available
   */
  async checkChromeAI() {
    try {
      // Check for Chrome built-in AI APIs (Chrome 140+)
      let hasAnyAI = false;
      
      // Check Summarizer
      if (typeof Summarizer !== 'undefined') {
        try {
          const availability = await Summarizer.availability();
          log('info', `Chrome Summarizer availability: ${availability}`);
          if (availability === 'available') {
            hasAnyAI = true;
          }
        } catch (error) {
          log('warn', 'Summarizer check failed', error);
        }
      }
      
      // Check Prompt
      if (typeof Prompt !== 'undefined') {
        try {
          const availability = await Prompt.availability();
          log('info', `Chrome Prompt availability: ${availability}`);
          if (availability === 'available') {
            hasAnyAI = true;
          }
        } catch (error) {
          log('warn', 'Prompt check failed', error);
        }
      }
      
      // Check Translator (available on your system)
      if (typeof Translator !== 'undefined') {
        try {
          const availability = await Translator.availability();
          log('info', `Chrome Translator availability: ${availability}`);
          if (availability === 'available') {
            hasAnyAI = true;
          }
        } catch (error) {
          log('warn', 'Translator check failed', error);
        }
      }
      
      if (hasAnyAI) {
        log('info', 'At least one Chrome AI API is available');
        return true;
      }
      
      log('warn', 'No Chrome AI APIs are available');
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
      
      // Try Anthropic Claude Haiku first (CHEAPEST - $0.0015/1K tokens)
      if (this.anthropicAvailable) {
        return await this.summarizeWithAnthropic(text, options);
      }
      
      // Try Google Gemini Pro (VERY CHEAP - $0.002/1K tokens)
      if (this.googleAvailable) {
        return await this.summarizeWithGoogle(text, options);
      }
      
      // Try OpenAI GPT-3.5 (MODERATE - $0.0035/1K tokens)
      if (this.openaiAvailable) {
        return await this.summarizeWithOpenAI(text, options);
      }
      
      // Try xAI Grok (MODERATE - $0.0027/1K tokens)
      if (this.xaiAvailable) {
        return await this.summarizeWithGrok(text, options);
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
      
      // Try Summarizer first
      if (typeof Summarizer !== 'undefined') {
        const availability = await Summarizer.availability();
        log('info', `Chrome Summarizer availability: ${availability}`);
        
        if (availability === 'available') {
          const summarizer = await Summarizer.create();
          const summarizationOptions = {
            maxOutputTokens: options.maxLength === 'short' ? 100 : 
                            options.maxLength === 'long' ? 500 : 250
          };
          
          const result = await summarizer.summarize(text, summarizationOptions);
          log('info', 'Chrome Summarizer completed', {
            originalLength: text.length,
            summaryLength: result.length
          });
          return result;
        }
      }
      
      // Fallback: Use Translator API for basic summarization
      if (typeof Translator !== 'undefined') {
        const availability = await Translator.availability();
        log('info', `Chrome Translator availability: ${availability}`);
        
        if (availability === 'available') {
          log('info', 'Using Translator API as fallback for summarization');
          
          // Create a summarization prompt using translation
          const summarizationPrompt = `Summarize this text in fewer words: ${text}`;
          
          const translator = await Translator.create();
          const result = await translator.translate(summarizationPrompt, 'en');
          
          log('info', 'Chrome Translator summarization completed', {
            originalLength: text.length,
            summaryLength: result.length
          });
          return result;
        }
      }
      
      throw new Error('No Chrome AI APIs available for summarization');
      
    } catch (error) {
      log('warn', 'Chrome AI summarization failed, falling back', error);
      throw error;
    }
  }

  /**
   * Summarize using OpenAI API
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithOpenAI(text, options) {
    try {
      log('info', 'Using OpenAI API for summarization');
      
      const apiKey = await this.getStoredAPIKey('openai');
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }
      
      const maxTokens = options.maxLength === 'short' ? 100 : 
                       options.maxLength === 'long' ? 500 : 250;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Summarize the following text concisely:\n\n${text}`
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const summary = data.choices[0].message.content.trim();
      
      log('info', 'OpenAI summarization completed', {
        originalLength: text.length,
        summaryLength: summary.length
      });
      
      return summary;
      
    } catch (error) {
      log('error', 'OpenAI summarization failed', error);
      throw error;
    }
  }

  /**
   * Summarize using Anthropic API
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithAnthropic(text, options) {
    try {
      log('info', 'Using Anthropic API for summarization');
      
      const apiKey = await this.getStoredAPIKey('anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not found');
      }
      
      const maxTokens = options.maxLength === 'short' ? 100 : 
                       options.maxLength === 'long' ? 500 : 250;
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          messages: [
            {
              role: 'user',
              content: `Summarize the following text concisely:\n\n${text}`
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const data = await response.json();
      const summary = data.content[0].text.trim();
      
      log('info', 'Anthropic summarization completed', {
        originalLength: text.length,
        summaryLength: summary.length
      });
      
      return summary;
      
    } catch (error) {
      log('error', 'Anthropic summarization failed', error);
      throw error;
    }
  }

  /**
   * Summarize using Google Gemini Pro API (VERY CHEAP)
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithGoogle(text, options) {
    try {
      log('info', 'Using Google Gemini Pro API for summarization');
      
      const apiKey = await this.getStoredAPIKey('google');
      if (!apiKey) {
        throw new Error('Google AI API key not found');
      }
      
      const maxTokens = options.maxLength === 'short' ? 100 : 
                       options.maxLength === 'long' ? 500 : 250;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Summarize the following text concisely:\n\n${text}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.3
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const summary = data.candidates[0].content.parts[0].text.trim();
      
      log('info', 'Google Gemini Pro summarization completed', {
        originalLength: text.length,
        summaryLength: summary.length
      });
      
      return summary;
      
    } catch (error) {
      log('error', 'Google Gemini Pro summarization failed', error);
      throw error;
    }
  }

  /**
   * Summarize using xAI Grok API
   * @param {string} text - Text to summarize
   * @param {Object} options - Options
   * @returns {Promise<string>} - Summary
   */
  async summarizeWithGrok(text, options) {
    try {
      log('info', 'Using xAI Grok API for summarization');
      
      const apiKey = await this.getStoredAPIKey('xai');
      if (!apiKey) {
        throw new Error('xAI API key not found');
      }
      
      const maxTokens = options.maxLength === 'short' ? 100 : 
                       options.maxLength === 'long' ? 500 : 250;
      
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'user',
              content: `Summarize the following text concisely:\n\n${text}`
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`xAI Grok API error: ${response.status}`);
      }
      
      const data = await response.json();
      const summary = data.choices[0].message.content.trim();
      
      log('info', 'xAI Grok summarization completed', {
        originalLength: text.length,
        summaryLength: summary.length
      });
      
      return summary;
      
    } catch (error) {
      log('error', 'xAI Grok summarization failed', error);
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
    log('info', 'Using enhanced fallback summarization');
    
    const { maxLength = 'medium' } = options;
    
    // Determine summary length
    const maxSentences = maxLength === 'short' ? 2 : maxLength === 'long' ? 5 : 3;
    
    // Enhanced sentence extraction with better regex and filtering
    let sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Filter out headline-style content more aggressively
    sentences = sentences.filter(sentence => {
      const trimmed = sentence.trim();
      
      // Skip very short sentences (likely headlines)
      if (trimmed.length < 20) return false;
      
      // Skip sentences with timestamp patterns
      if (trimmed.match(/\d+\s+(hours?|minutes?|days?)\s+ago/i)) return false;
      
      // Skip sentences that are mostly proper nouns
      const words = trimmed.split(/\s+/);
      const properNouns = (trimmed.match(/\b[A-Z][a-z]+\b/g) || []).length;
      if (properNouns > words.length * 0.5 && words.length < 15) return false;
      
      // Skip sentences ending with "BBC", "CNN", etc.
      if (trimmed.match(/\b(BBC|CNN|Reuters|AP|AFP)\s*$/i)) return false;
      
      // Skip sentences that look like navigation
      if (trimmed.match(/^(Live|Videos|Breaking|Update)/i)) return false;
      
      return true;
    });
    
    if (sentences.length <= maxSentences) {
      return text.trim();
    }
    
    // Enhanced extractive summarization with keyword scoring
    const selectedSentences = [];
    
    // Score sentences based on keyword frequency and position
    const wordFreq = this.calculateWordFrequency(text);
    const scoredSentences = sentences.map((sentence, index) => ({
      text: sentence.trim(),
      index,
      score: this.scoreSentence(sentence, wordFreq, index, sentences.length)
    }));
    
    // Sort by score (highest first)
    scoredSentences.sort((a, b) => b.score - a.score);
    
    // Select top sentences, ensuring we have a good mix
    const selected = [];
    
    // Always include the highest scoring sentence
    if (scoredSentences[0]) {
      selected.push(scoredSentences[0]);
    }
    
    // Add sentences with good distribution across the text
    const step = Math.max(1, Math.floor(sentences.length / maxSentences));
    for (let i = 0; i < maxSentences - 1 && i < scoredSentences.length; i++) {
      const candidate = scoredSentences[i];
      if (!selected.some(s => s.index === candidate.index)) {
        selected.push(candidate);
      }
    }
    
    // Sort selected sentences by original position
    selected.sort((a, b) => a.index - b.index);
    
    // Extract text and clean up
    const summary = selected.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim();
    
    log('info', `Enhanced fallback summary generated (${summary.length} chars)`);
    return summary;
  }

  /**
   * Calculate word frequency in text
   */
  calculateWordFrequency(text) {
    // Clean text first - remove navigation, metadata, and boilerplate
    const cleanedText = this.cleanTextForAnalysis(text);
    
    const words = cleanedText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3) // Only meaningful words
      .filter(word => !this.isStopWord(word)); // Remove common stop words
    
    const freq = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });
    
    return freq;
  }

  /**
   * Clean text by removing navigation, metadata, and boilerplate
   */
  cleanTextForAnalysis(text) {
    // Remove common navigation patterns
    const patterns = [
      /Categories:.*?(?=\n\n|\n===|$)/gs, // Wikipedia categories
      /Hidden categories:.*?(?=\n\n|\n===|$)/gs, // Wikipedia hidden categories
      /Skip to content.*?(?=\n\n|\n===|$)/gs, // Skip to content links
      /For Customers.*?(?=\n\n|\n===|$)/gs, // Customer links
      /Support.*?(?=\n\n|\n===|$)/gs, // Support sections
      /Follow.*?(?=\n\n|\n===|$)/gs, // Social media links
      /Products.*?(?=\n\n|\n===|$)/gs, // Product listings
      /Company.*?(?=\n\n|\n===|$)/gs, // Company info
      /Media.*?(?=\n\n|\n===|$)/gs, // Media sections
      /^\s*===.*?===\s*$/gm, // Section headers
      /^\s*\d+\s*$/gm, // Standalone numbers
      /^\s*[A-Z\s]+\s*$/gm, // All caps lines
      /^\s*[a-z\s]+\s*$/gm, // All lowercase lines (likely navigation)
    ];
    
    let cleaned = text;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned;
  }

  /**
   * Check if word is a common stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been',
      'good', 'much', 'some', 'time', 'very', 'when', 'here', 'just', 'like', 'long',
      'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what',
      'your', 'said', 'each', 'which', 'their', 'said', 'would', 'there', 'could',
      'other', 'after', 'first', 'well', 'also', 'new', 'way', 'may', 'say', 'use',
      'man', 'day', 'get', 'come', 'made', 'part', 'over', 'new', 'sound', 'take',
      'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back', 'give',
      'most', 'very', 'good', 'through', 'much', 'before', 'line', 'right', 'too',
      'means', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came', 'want', 'show',
      'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end', 'why', 'let',
      'help', 'make', 'going', 'great', 'must', 'seem', 'call', 'feel', 'leave', 'put'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Score a sentence based on various factors
   */
  scoreSentence(sentence, wordFreq, index, totalSentences) {
    let score = 0;
    
    // Penalize navigation/metadata sentences
    if (this.isNavigationSentence(sentence)) {
      return -10; // Heavy penalty for navigation
    }
    
    // Position score (beginning and end are important)
    const position = index / totalSentences;
    if (position < 0.1 || position > 0.9) {
      score += 2; // Beginning or end
    } else if (position < 0.3 || position > 0.7) {
      score += 1; // Early or late
    }
    
    // Keyword frequency score
    const words = sentence.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    words.forEach(word => {
      if (wordFreq[word]) {
        score += Math.log(wordFreq[word] + 1); // Log to prevent over-weighting
      }
    });
    
    // Length score (prefer longer, more informative sentences)
    const wordCount = words.length;
    if (wordCount >= 15 && wordCount <= 35) {
      score += 2; // Strong preference for substantial sentences
    } else if (wordCount >= 8 && wordCount <= 50) {
      score += 1; // Good sentences
    } else if (wordCount < 5) {
      score -= 2; // Heavy penalty for very short sentences (likely headlines)
    } else if (wordCount > 60) {
      score -= 1; // Slight penalty for very long sentences
    }
    
    // Content quality indicators
    if (sentence.includes('said') || sentence.includes('according')) {
      score += 0.5; // Quotes and citations are valuable
    }
    
    if (sentence.match(/\d{4}/)) {
      score += 0.5; // Years indicate factual content
    }
    
    if (sentence.match(/\$[\d,]+/)) {
      score += 0.5; // Money amounts indicate financial content
    }
    
    // Penalize repetitive patterns
    if (sentence.match(/^(Categories|Hidden|Skip|For|Support|Follow|Products|Company|Media)/i)) {
      score -= 5; // Heavy penalty for navigation headers
    }
    
    // Penalize headline-style sentences (very short with time indicators)
    if (sentence.match(/\d+\s+(hours?|minutes?|days?)\s+ago/i) && wordCount < 10) {
      score -= 3; // Penalty for short headlines with timestamps
    }
    
    // Penalize sentences that are mostly proper nouns (likely headlines)
    const properNounCount = (sentence.match(/\b[A-Z][a-z]+\b/g) || []).length;
    if (properNounCount > wordCount * 0.6 && wordCount < 15) {
      score -= 2; // Penalty for headline-style sentences
    }
    
    return score;
  }

  /**
   * Check if sentence is navigation/metadata
   */
  isNavigationSentence(sentence) {
    const navPatterns = [
      /^Categories:/i,
      /^Hidden categories:/i,
      /^Skip to content/i,
      /^For Customers/i,
      /^Support/i,
      /^Follow/i,
      /^Products/i,
      /^Company/i,
      /^Media/i,
      /^===.*?===$/,
      /^\s*\d+\s*$/,
      /^[A-Z\s]+$/,
      /Bloomberg Terminal/i,
      /Bloomberg Law/i,
      /Bloomberg Tax/i,
      /Bloomberg Government/i,
      /BloombergNEF/i,
      /Bloomberg Markets/i,
      /Bloomberg Technology/i,
      /Bloomberg Pursuits/i,
      /Bloomberg Politics/i,
      /Bloomberg Opinion/i,
      /Bloomberg Businessweek/i,
      /Bloomberg Live/i,
      /Bloomberg Radio/i,
      /Bloomberg Television/i,
      /News Bureaus/i,
      /Media Services/i,
      /Bloomberg Media Distribution/i,
      /Advertising/i,
      /Americas\+1/i,
      /EMEA\+44/i,
      /Asia Pacific\+65/i,
      /Facebook/i,
      /Instagram/i,
      /LinkedIn/i,
      /YouTube/i
    ];
    
    return navPatterns.some(pattern => pattern.test(sentence));
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
      
      // Try Anthropic Claude Haiku first (CHEAPEST)
      if (this.anthropicAvailable) {
        return await this.answerWithAnthropic(question, summaries);
      }
      
      // Try Google Gemini Pro (VERY CHEAP)
      if (this.googleAvailable) {
        return await this.answerWithGoogle(question, summaries);
      }
      
      // Try OpenAI GPT-3.5 (MODERATE)
      if (this.openaiAvailable) {
        return await this.answerWithOpenAI(question, summaries);
      }
      
      // Try xAI Grok (MODERATE)
      if (this.xaiAvailable) {
        return await this.answerWithGrok(question, summaries);
      }
      
      // Fallback to local keyword matching
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
      
      // Check availability first
      if (typeof Prompt === 'undefined') {
        throw new Error('Chrome Prompt API not available');
      }
      
      const availability = await Prompt.availability();
      log('info', `Chrome Prompt API availability: ${availability}`);
      
      if (availability === 'unavailable') {
        throw new Error('Chrome Prompt API not available on this device');
      }
      
      if (availability === 'downloadable') {
        log('info', 'Chrome AI model needs to be downloaded');
        throw new Error('Chrome AI model needs to be downloaded. User interaction required.');
      }
      
      if (availability === 'downloading') {
        throw new Error('Chrome AI model is currently downloading');
      }
      
      if (availability === 'available') {
        const context = summaries.map((s, i) => 
          `[${i + 1}] ${s.title}: ${s.summary}`
        ).join('\n\n');
        
        const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
        
        // Create prompt session
        const promptSession = await Prompt.create();
        
        // Configure prompt options
        const promptOptions = {
          maxOutputTokens: 500
        };
        
        // Perform Q&A
        const result = await promptSession.prompt(prompt, promptOptions);
        
        log('info', 'Chrome AI Q&A completed', {
          promptLength: prompt.length,
          answerLength: result.length
        });
        
        return result;
      }
      
      throw new Error(`Unexpected Chrome Prompt API availability: ${availability}`);
      
    } catch (error) {
      log('warn', 'Chrome AI Q&A failed, falling back', error);
      throw error;
    }
  }

  /**
   * Answer using Anthropic Claude Haiku (CHEAPEST)
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithAnthropic(question, summaries) {
    try {
      log('info', 'Using Anthropic Claude Haiku for Q&A');
      
      const apiKey = await this.getStoredAPIKey('anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not found');
      }
      
      const context = summaries.map((s, i) => 
        `[${i + 1}] ${s.title}: ${s.summary}`
      ).join('\n\n');
      
      const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.content[0].text.trim();
      
      log('info', 'Anthropic Q&A completed', {
        questionLength: question.length,
        answerLength: answer.length
      });
      
      return answer;
      
    } catch (error) {
      log('error', 'Anthropic Q&A failed', error);
      throw error;
    }
  }

  /**
   * Answer using Google Gemini Pro (VERY CHEAP)
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithGoogle(question, summaries) {
    try {
      log('info', 'Using Google Gemini Pro for Q&A');
      
      const apiKey = await this.getStoredAPIKey('google');
      if (!apiKey) {
        throw new Error('Google AI API key not found');
      }
      
      const context = summaries.map((s, i) => 
        `[${i + 1}] ${s.title}: ${s.summary}`
      ).join('\n\n');
      
      const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.3
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.candidates[0].content.parts[0].text.trim();
      
      log('info', 'Google Gemini Pro Q&A completed', {
        questionLength: question.length,
        answerLength: answer.length
      });
      
      return answer;
      
    } catch (error) {
      log('error', 'Google Gemini Pro Q&A failed', error);
      throw error;
    }
  }

  /**
   * Answer using OpenAI GPT-3.5
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithOpenAI(question, summaries) {
    try {
      log('info', 'Using OpenAI GPT-3.5 for Q&A');
      
      const apiKey = await this.getStoredAPIKey('openai');
      if (!apiKey) {
        throw new Error('OpenAI API key not found');
      }
      
      const context = summaries.map((s, i) => 
        `[${i + 1}] ${s.title}: ${s.summary}`
      ).join('\n\n');
      
      const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.choices[0].message.content.trim();
      
      log('info', 'OpenAI Q&A completed', {
        questionLength: question.length,
        answerLength: answer.length
      });
      
      return answer;
      
    } catch (error) {
      log('error', 'OpenAI Q&A failed', error);
      throw error;
    }
  }

  /**
   * Answer using xAI Grok
   * @param {string} question - Question
   * @param {Array} summaries - Summaries
   * @returns {Promise<string>} - Answer
   */
  async answerWithGrok(question, summaries) {
    try {
      log('info', 'Using xAI Grok for Q&A');
      
      const apiKey = await this.getStoredAPIKey('xai');
      if (!apiKey) {
        throw new Error('xAI API key not found');
      }
      
      const context = summaries.map((s, i) => 
        `[${i + 1}] ${s.title}: ${s.summary}`
      ).join('\n\n');
      
      const prompt = `Based on these tab summaries:\n\n${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer and cite which tab numbers you used.`;
      
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`xAI Grok API error: ${response.status}`);
      }
      
      const data = await response.json();
      const answer = data.choices[0].message.content.trim();
      
      log('info', 'xAI Grok Q&A completed', {
        questionLength: question.length,
        answerLength: answer.length
      });
      
      return answer;
      
    } catch (error) {
      log('error', 'xAI Grok Q&A failed', error);
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
