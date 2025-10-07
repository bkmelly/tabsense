/**
 * SummaryMerger - Merge chunk summaries into coherent final summary
 * Handles semantic linking and repetition control
 */

export class SummaryMerger {
  constructor(options = {}) {
    this.minSimilarity = options.minSimilarity || 0.8; // For duplicate detection
    console.log('[SummaryMerger] Initialized');
  }

  /**
   * Merge multiple chunk summaries into one coherent summary
   * @param {Array} chunkSummaries - Array of summary strings
   * @param {String} length - 'short', 'medium', or 'long'
   * @returns {String} Merged and cleaned summary
   */
  merge(chunkSummaries, length = 'medium') {
    console.log(`[SummaryMerger] Merging ${chunkSummaries.length} summaries (${length})`);
    
    if (!chunkSummaries || chunkSummaries.length === 0) {
      return 'No summary available.';
    }
    
    // Single chunk - just clean and return
    if (chunkSummaries.length === 1) {
      return this.cleanSummary(chunkSummaries[0]);
    }
    
    // Multiple chunks - merge with semantic linking
    const sentences = this.extractSentences(chunkSummaries);
    console.log(`[SummaryMerger] Extracted ${sentences.length} sentences`);
    
    // Remove duplicates
    const uniqueSentences = this.deduplicateSentences(sentences);
    console.log(`[SummaryMerger] After deduplication: ${uniqueSentences.length} sentences`);
    
    // Apply length constraints
    const finalSentences = this.applyLengthConstraint(uniqueSentences, length);
    console.log(`[SummaryMerger] After length constraint: ${finalSentences.length} sentences`);
    
    // Join with semantic linking
    const merged = this.joinWithSemanticLinks(finalSentences);
    
    return this.cleanSummary(merged);
  }

  /**
   * Extract sentences from all chunk summaries
   */
  extractSentences(chunkSummaries) {
    const allSentences = [];
    
    chunkSummaries.forEach((summary, chunkIndex) => {
      if (!summary || typeof summary !== 'string') return;
      
      const sentences = this.splitIntoSentences(summary);
      sentences.forEach(sentence => {
        allSentences.push({
          text: sentence.trim(),
          chunkIndex,
          normalized: this.normalizeSentence(sentence)
        });
      });
    });
    
    return allSentences;
  }

  /**
   * Split text into sentences
   */
  splitIntoSentences(text) {
    // Split on sentence boundaries, but preserve the ending punctuation
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Normalize sentence for comparison
   */
  normalizeSentence(sentence) {
    return sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Remove duplicate sentences based on similarity
   */
  deduplicateSentences(sentences) {
    const unique = [];
    const seen = new Set();
    
    sentences.forEach(sentenceObj => {
      const normalized = sentenceObj.normalized;
      
      // Check for exact duplicates
      if (seen.has(normalized)) {
        console.log(`[SummaryMerger] Duplicate removed: "${sentenceObj.text.substring(0, 50)}..."`);
        return;
      }
      
      // Check for near-duplicates (high similarity)
      let isDuplicate = false;
      for (const existing of unique) {
        const similarity = this.calculateSimilarity(normalized, existing.normalized);
        if (similarity >= this.minSimilarity) {
          console.log(`[SummaryMerger] Similar sentence removed (${(similarity * 100).toFixed(0)}% match): "${sentenceObj.text.substring(0, 50)}..."`);
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(sentenceObj);
        seen.add(normalized);
      }
    });
    
    return unique;
  }

  /**
   * Calculate similarity between two normalized sentences
   * Uses Jaccard similarity (word overlap)
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Apply length constraints based on summary type
   */
  applyLengthConstraint(sentences, length) {
    let targetWords;
    
    switch (length) {
      case 'short':
        targetWords = 100;
        break;
      case 'long':
        targetWords = 500;
        break;
      case 'medium':
      default:
        targetWords = 300;
        break;
    }
    
    // Count words and trim if necessary
    let totalWords = 0;
    const result = [];
    
    for (const sentenceObj of sentences) {
      const words = sentenceObj.text.split(/\s+/).length;
      
      if (totalWords + words <= targetWords) {
        result.push(sentenceObj);
        totalWords += words;
      } else {
        // If we're significantly under target, add this sentence anyway
        if (totalWords < targetWords * 0.7) {
          result.push(sentenceObj);
          totalWords += words;
        }
        break;
      }
    }
    
    console.log(`[SummaryMerger] Target words: ${targetWords}, Actual words: ${totalWords}`);
    return result;
  }

  /**
   * Join sentences with semantic linking phrases
   */
  joinWithSemanticLinks(sentences) {
    if (sentences.length === 0) return '';
    if (sentences.length === 1) return sentences[0].text;
    
    const parts = [];
    let lastChunkIndex = sentences[0].chunkIndex;
    
    sentences.forEach((sentenceObj, index) => {
      // Add linking phrase when transitioning between chunks
      if (index > 0 && sentenceObj.chunkIndex !== lastChunkIndex) {
        // Use subtle transitions
        const transitions = ['Additionally, ', 'Furthermore, ', 'Moreover, ', ''];
        const transition = transitions[Math.min(index - 1, transitions.length - 1)];
        parts.push(transition + sentenceObj.text);
      } else {
        parts.push(sentenceObj.text);
      }
      
      lastChunkIndex = sentenceObj.chunkIndex;
    });
    
    // Join all parts
    let merged = parts.join(' ');
    
    // Add overall conclusion if we have multiple chunks
    if (sentences.length > 5 && sentences[sentences.length - 1].chunkIndex !== sentences[0].chunkIndex) {
      merged = 'Overall, this content covers: ' + merged;
    }
    
    return merged;
  }

  /**
   * Clean and normalize final summary
   */
  cleanSummary(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\s+([.,!?])/g, '$1') // Fix punctuation spacing
      .replace(/([.,!?])([A-Z])/g, '$1 $2') // Add space after punctuation
      .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
      .trim();
  }

  /**
   * Calculate summary statistics
   */
  getStats(summary) {
    const words = summary.split(/\s+/).filter(w => w.length > 0);
    const sentences = this.splitIntoSentences(summary);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      charCount: summary.length,
      avgWordsPerSentence: Math.round(words.length / sentences.length)
    };
  }
}

export default SummaryMerger;

