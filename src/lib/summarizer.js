/**
 * Summarizer - Production-grade summarization engine
 * Handles chunking, prompt generation, API calls, and merging
 */

import { Chunker } from './chunker.js';
import { SummaryMerger } from './summaryMerger.js';

export class Summarizer {
  constructor(options = {}) {
    this.chunker = new Chunker({
      maxTokens: options.maxTokens || 800
    });
    this.merger = new SummaryMerger({
      minSimilarity: options.minSimilarity || 0.8
    });
    
    this.apiKey = options.apiKey || null;
    this.model = options.model || 'gemini-2.5-flash';
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models';
    
    // Rate limiting for parallel requests
    this.maxConcurrentRequests = options.maxConcurrentRequests || 3;
    this.requestDelay = options.requestDelay || 100; // ms between requests
    
    console.log('[Summarizer] Initialized with model:', this.model);
  }

  /**
   * Summarize content with specified length
   * @param {Object} content - Structured content from ContentExtractor
   * @param {Object} metadata - Page metadata
   * @param {String} length - 'short' (100w), 'medium' (300w), or 'long' (500w)
   * @returns {Object} Summary result with text, stats, and metadata
   */
  async summarize(content, metadata, length = 'medium') {
    console.log(`[Summarizer] Starting summarization (${length})...`);
    
    try {
      // Step 1: Chunk content
      const chunks = this.chunker.chunk(content, metadata);
      console.log(`[Summarizer] Created ${chunks.length} chunks`);
      
      // Step 2: Summarize each chunk
      const chunkSummaries = await this.summarizeChunks(chunks, length);
      console.log(`[Summarizer] Generated ${chunkSummaries.length} chunk summaries`);
      
      // Step 3: Merge summaries
      const finalSummary = this.merger.merge(chunkSummaries, length);
      console.log(`[Summarizer] Final summary: ${finalSummary.length} characters`);
      
      // Step 4: Return with stats
      const stats = this.merger.getStats(finalSummary);
      
      return {
        success: true,
        summary: finalSummary,
        stats,
        metadata: {
          length,
          chunkCount: chunks.length,
          model: this.model,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error('[Summarizer] Error:', error);
      return {
        success: false,
        error: error.message,
        summary: this.getFallbackSummary(content, metadata),
        stats: null
      };
    }
  }

  /**
   * Summarize content with custom template
   */
  async summarizeWithTemplate(content, metadata, length, template) {
    console.log(`[Summarizer] Starting template-based summarization (${length})...`);
    
    try {
      // Step 1: Chunk content
      const chunks = this.chunker.chunk(content, metadata);
      console.log(`[Summarizer] Created ${chunks.length} chunks`);
      
      // Step 2: Summarize each chunk with custom template
      const chunkSummaries = await this.summarizeChunksWithTemplate(chunks, length, template);
      console.log(`[Summarizer] Generated ${chunkSummaries.length} chunk summaries`);
      
      // Step 3: Merge summaries
      const finalSummary = this.merger.merge(chunkSummaries, length);
      console.log(`[Summarizer] Final summary: ${finalSummary.length} characters`);
      
      // Step 4: Return with stats
      const stats = this.merger.getStats(finalSummary);
      
      return {
        success: true,
        summary: finalSummary,
        stats,
        metadata: {
          length,
          chunkCount: chunks.length,
          model: this.model,
          timestamp: Date.now(),
          templateUsed: true
        }
      };
      
    } catch (error) {
      console.error('[Summarizer] Template summarization failed:', error);
      return {
        success: false,
        error: error.message,
        summary: 'Summary generation failed',
        stats: null
      };
    }
  }

  /**
   * Summarize chunks with custom template
   */
  async summarizeChunksWithTemplate(chunks, length, template) {
    if (!this.apiKey) {
      console.warn('[Summarizer] No API key, using fallback summarization');
      return chunks.map(chunk => this.extractiveSummary(chunk.text, length));
    }
    
    console.log(`[Summarizer] Starting template-based parallel processing of ${chunks.length} chunks...`);
    const startTime = Date.now();
    
    // Create parallel processing promises with custom template
    const promises = chunks.map(async (chunk, index) => {
      try {
        console.log(`[Summarizer] Starting template chunk ${index} (${chunk.text.length} chars)...`);
        const summary = await this.summarizeChunkWithTemplate(chunk, length, template);
        console.log(`[Summarizer] Template chunk ${index} completed (${summary.length} chars)`);
        return { index, summary, success: true };
      } catch (error) {
        console.error(`[Summarizer] Template chunk ${index} failed:`, error.message);
        const fallbackSummary = this.getFallbackSummary(chunk);
        return { index, summary: fallbackSummary, success: false, error: error.message };
      }
    });
    
    // Process chunks in batches to respect rate limits
    const results = await this.processBatches(promises);
    
    // Sort results by original index to maintain order
    const summaries = results
      .sort((a, b) => a.index - b.index)
      .map(result => result.summary);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;
    
    console.log(`[Summarizer] Template parallel processing complete: ${successCount} success, ${failureCount} failed in ${totalTime}ms`);
    
    return summaries.filter(s => s && s.length > 0);
  }

  /**
   * Summarize a single chunk with custom template
   */
  async summarizeChunkWithTemplate(chunk, length, template) {
    const prompt = this.buildTemplatePrompt(chunk.text, length, template);
    
    try {
      const response = await fetch(`${this.apiEndpoint}/${this.model}:generateContent?key=${this.apiKey}`, {
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
          generationConfig: this.getGenerationConfig(length)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Summarizer] Gemini API error:', response.status, errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        console.error('[Summarizer] Unexpected response structure:', data);
        throw new Error('Invalid response structure from Gemini');
      }

      const candidate = data.candidates[0];
      let summaryText = '';
      
      // Try multiple possible text locations
      if (candidate.content?.parts?.[0]?.text) {
        summaryText = candidate.content.parts[0].text;
      } else if (candidate.text) {
        summaryText = candidate.text;
      } else if (candidate.content?.text) {
        summaryText = candidate.content.text;
      } else {
        console.error('[Summarizer] No text found in candidate:', candidate);
        throw new Error('No text content in Gemini response');
      }

      return summaryText.trim();
      
    } catch (error) {
      console.error('[Summarizer] Template chunk summarization failed:', error);
      throw error;
    }
  }

  /**
   * Build prompt with custom template
   */
  buildTemplatePrompt(text, length, template) {
    const wordTargets = {
      short: '80-120',
      medium: '250-350',
      long: '450-550'
    };
    
    const targetWords = wordTargets[length] || wordTargets.medium;
    
    return `${template.prompt}

CONTENT TO SUMMARIZE:
${text}

Focus on factual accuracy and comprehensive coverage.`;
  }

  /**
   * Summarize all chunks in parallel with enhanced error handling
   */
  async summarizeChunks(chunks, length) {
    if (!this.apiKey) {
      console.warn('[Summarizer] No API key, using fallback summarization');
      return chunks.map(chunk => this.extractiveSummary(chunk.text, length));
    }
    
    console.log(`[Summarizer] Starting parallel processing of ${chunks.length} chunks...`);
    const startTime = Date.now();
    
    // Create parallel processing promises with error handling
    const promises = chunks.map(async (chunk, index) => {
      try {
        console.log(`[Summarizer] Starting chunk ${index} (${chunk.text.length} chars)...`);
        const summary = await this.summarizeChunk(chunk, length);
        console.log(`[Summarizer] Chunk ${index} completed (${summary.length} chars)`);
        return { index, summary, success: true };
      } catch (error) {
        console.error(`[Summarizer] Chunk ${index} failed:`, error.message);
        const fallbackSummary = this.getFallbackSummary(chunk);
        return { index, summary: fallbackSummary, success: false, error: error.message };
      }
    });
    
    // Process chunks in batches to respect rate limits
    const results = await this.processBatches(promises);
    
    // Sort results by original index to maintain order
    const summaries = results
      .sort((a, b) => a.index - b.index)
      .map(result => result.summary);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;
    
    console.log(`[Summarizer] Parallel processing complete: ${successCount} success, ${failureCount} failed in ${totalTime}ms`);
    
    return summaries.filter(s => s && s.length > 0);
  }

  /**
   * Process promises in batches to respect rate limits
   * @param {Array} promises - Array of promises to process
   * @returns {Promise<Array>} Results from all batches
   */
  async processBatches(promises) {
    const results = [];
    
    // Process in batches of maxConcurrentRequests
    for (let i = 0; i < promises.length; i += this.maxConcurrentRequests) {
      const batch = promises.slice(i, i + this.maxConcurrentRequests);
      console.log(`[Summarizer] Processing batch ${Math.floor(i / this.maxConcurrentRequests) + 1}/${Math.ceil(promises.length / this.maxConcurrentRequests)}`);
      
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + this.maxConcurrentRequests < promises.length) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      }
    }
    
    return results;
  }

  /**
   * Summarize a single chunk using Gemini API
   */
  async summarizeChunk(chunk, length) {
    const prompt = this.buildPrompt(chunk.text, length);
    
    try {
      const response = await fetch(`${this.apiEndpoint}/${this.model}:generateContent?key=${this.apiKey}`, {
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
          generationConfig: this.getGenerationConfig(length)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Summarizer] Gemini API error (${response.status}):`, errorData);
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Parse response - check multiple possible structures
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        // Try different response formats
        if (candidate.content?.parts?.[0]?.text) {
          return candidate.content.parts[0].text.trim();
        } else if (candidate.text) {
          return candidate.text.trim();
        } else if (candidate.content?.text) {
          return candidate.content.text.trim();
        } else {
          console.error(`[Summarizer] Candidate structure:`, candidate);
          throw new Error('No text found in candidate response');
        }
      }
      
      // Log what we got instead
      console.error(`[Summarizer] No candidates found in response:`, data);
      throw new Error('Invalid response structure from Gemini');
      
    } catch (error) {
      console.error(`[Summarizer] Chunk ${chunk.index} failed:`, error.message);
      // Fallback to extractive summary
      return this.extractiveSummary(chunk.text, length);
    }
  }

  /**
   * Build production-grade prompt for summarization
   */
  buildPrompt(text, length) {
    const wordTargets = {
      short: '80-120',
      medium: '250-350',
      long: '450-550'
    };
    
    const targetWords = wordTargets[length] || wordTargets.medium;
    
    return `You are a professional content summarizer specializing in structured, user-friendly summaries.

TASK: Create a well-formatted summary of the following text.

FORMATTING REQUIREMENTS:
1. **Structure with Headers**: Use clear section headers like "Overview:", "Key Points:", "Context:", "Details:"
2. **Bullet Points**: Use • or - for lists and key information
3. **Tables**: For fact-heavy data (dates, names, events, statistics)
4. **Bold Text**: Use **bold** for important names, dates, and key terms
5. **Line Breaks**: Use proper spacing between sections
6. **Hierarchy**: Organize information from most to least important

CONTENT REQUIREMENTS:
1. **Preserve Facts**: Keep all numbers, dates, names EXACTLY as stated
2. **No New Information**: Don't add facts not in the original text
3. **Length**: ${targetWords} words
4. **Focus**: Ignore navigation, ads, social buttons, comments

FORMATTING EXAMPLES:
• **Key Point**: Brief explanation
• **Important Date**: What happened
• **Main Character**: Their role

**Overview:**
Brief introduction here.

**Key Details:**
- Specific fact 1
- Specific fact 2

TEXT TO SUMMARIZE:
${text}

STRUCTURED SUMMARY (${targetWords} words):`;
  }

  /**
   * Get generation config based on summary length
   */
  getGenerationConfig(length) {
    const maxTokens = {
      short: 200,    // ~100 words
      medium: 600,   // ~300 words
      long: 1024     // ~500 words
    };
    
    return {
      temperature: 0.3,  // Lower for factual accuracy
      maxOutputTokens: maxTokens[length] || maxTokens.medium,
      topP: 0.95,
      topK: 40
      // Note: responseModalities is not a valid field in Gemini API
    };
  }

  /**
   * Fallback extractive summarization (no API)
   */
  extractiveSummary(text, length) {
    console.log('[Summarizer] Using extractive fallback');
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const scored = sentences.map(s => ({
      text: s.trim(),
      score: this.scoreSentence(s)
    }));
    
    // Sort by score and take top sentences
    scored.sort((a, b) => b.score - a.score);
    
    const targetSentences = {
      short: 2,
      medium: 4,
      long: 7
    };
    
    const topSentences = scored
      .slice(0, targetSentences[length] || targetSentences.medium)
      .map(s => s.text)
      .join(' ');
    
    return topSentences || text.substring(0, 500);
  }

  /**
   * Score sentence importance (for extractive summary)
   */
  scoreSentence(sentence) {
    let score = 0;
    
    // Position bonus (first sentences often important)
    if (sentence.length > 20) score += 1;
    
    // Named entity indicators
    if (/[A-Z][a-z]+\s[A-Z][a-z]+/.test(sentence)) score += 2; // Names
    if (/\b\d{4}\b/.test(sentence)) score += 1; // Years
    if (/\$\d+|\d+%|\d+\s(?:million|billion|thousand)/.test(sentence)) score += 2; // Numbers
    
    // Keyword indicators
    const keywords = ['announced', 'said', 'reported', 'according', 'study', 'research', 'found'];
    keywords.forEach(kw => {
      if (sentence.toLowerCase().includes(kw)) score += 1;
    });
    
    // Length penalty for very long sentences
    if (sentence.length > 200) score -= 1;
    
    return score;
  }

  /**
   * Get fallback summary when everything fails
   */
  getFallbackSummary(content, metadata) {
    const firstSection = content.sections[0];
    if (!firstSection) {
      return metadata.description || 'Content could not be summarized.';
    }
    
    const firstParagraphs = firstSection.content
      .slice(0, 3)
      .map(item => item.text)
      .join(' ');
    
    return firstParagraphs.substring(0, 500) + (firstParagraphs.length > 500 ? '...' : '');
  }

  /**
   * Set API key dynamically
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    console.log('[Summarizer] API key updated');
  }

  /**
   * Set model dynamically
   */
  setModel(model) {
    this.model = model;
    console.log('[Summarizer] Model updated to:', model);
  }
}

export default Summarizer;

