/**
 * Chunker - Semantic text chunking
 * Splits long content into chunks while preserving semantic boundaries
 */

export class Chunker {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 1500; // ~1.5k tokens
    this.tokensPerChar = 0.25; // Approximate: 1 token ≈ 4 characters
    this.maxChars = Math.floor(this.maxTokens / this.tokensPerChar); // ~6000 chars
    
    console.log(`[Chunker] Initialized with maxTokens: ${this.maxTokens}, maxChars: ${this.maxChars}`);
  }

  /**
   * Split content into semantic chunks
   * @param {Object} content - Structured content from ContentExtractor
   * @param {Object} metadata - Page metadata
   * @returns {Array} Array of chunks with metadata
   */
  chunk(content, metadata) {
    console.log('[Chunker] Starting chunking process...');
    
    const chunks = [];
    let currentChunk = {
      text: '',
      sections: [],
      charCount: 0,
      tokenCount: 0
    };
    
    // Add metadata to first chunk
    const metadataText = this.formatMetadata(metadata);
    if (metadataText) {
      currentChunk.text = metadataText + '\n\n';
      currentChunk.charCount = metadataText.length;
      currentChunk.tokenCount = this.estimateTokens(metadataText);
      currentChunk.hasMetadata = true;
    }
    
    // Process each section
    content.sections.forEach((section, sectionIndex) => {
      const sectionText = this.formatSection(section);
      const sectionTokens = this.estimateTokens(sectionText);
      
      // Check if section fits in current chunk
      if (currentChunk.tokenCount + sectionTokens <= this.maxTokens) {
        // Add to current chunk
        currentChunk.text += sectionText + '\n\n';
        currentChunk.sections.push(section);
        currentChunk.charCount += sectionText.length;
        currentChunk.tokenCount += sectionTokens;
      } else {
        // Current chunk is full, start new chunk
        if (currentChunk.text.trim()) {
          chunks.push(this.finalizeChunk(currentChunk, chunks.length));
        }
        
        // Check if this section itself exceeds maxTokens
        if (sectionTokens > this.maxTokens) {
          console.log(`[Chunker] Section ${sectionIndex} is too big (${sectionTokens} tokens), splitting...`);
          
          // Split the oversized section into smaller chunks
          const subChunks = this.splitLargeSection(sectionText, this.maxTokens);
          subChunks.forEach((subChunk, subIndex) => {
            const chunk = {
              text: subChunk.text.trim() + '\n\n',
              sections: [{ ...section, level: 'subsection' }],
              charCount: subChunk.charCount,
              tokenCount: subChunk.tokenCount,
              hasMetadata: false
            };
            chunks.push(this.finalizeChunk(chunk, chunks.length));
          });
          
          // Reset current chunk (don't add this section to it)
          currentChunk = {
            text: '',
            sections: [],
            charCount: 0,
            tokenCount: 0,
            hasMetadata: false
          };
        } else {
          // Start new chunk with this section
          currentChunk = {
            text: sectionText + '\n\n',
            sections: [section],
            charCount: sectionText.length,
            tokenCount: sectionTokens,
            hasMetadata: false
          };
        }
      }
    });
    
    // Add final chunk if it has content
    if (currentChunk.text.trim()) {
      chunks.push(this.finalizeChunk(currentChunk, chunks.length));
    }
    
    console.log(`[Chunker] Created ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      console.log(`  Chunk ${i + 1}: ${chunk.tokenCount} tokens, ${chunk.charCount} chars`);
    });
    
    return chunks;
  }

  /**
   * Format metadata for inclusion in first chunk
   */
  formatMetadata(metadata) {
    const parts = [];
    
    if (metadata.title) {
      parts.push(`Title: ${metadata.title}`);
    }
    
    if (metadata.author) {
      parts.push(`Author: ${metadata.author}`);
    }
    
    if (metadata.date) {
      parts.push(`Date: ${metadata.date}`);
    }
    
    if (metadata.url) {
      parts.push(`URL: ${metadata.url}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Format section with heading and content
   */
  formatSection(section) {
    const parts = [];
    
    if (section.heading) {
      parts.push(section.heading);
      parts.push(''); // Empty line after heading
    }
    
    section.content.forEach(item => {
      parts.push(item.text);
    });
    
    return parts.join('\n');
  }

  /**
   * Finalize chunk with metadata
   */
  finalizeChunk(chunk, index) {
    return {
      index,
      text: chunk.text.trim(),
      charCount: chunk.charCount,
      tokenCount: chunk.tokenCount,
      sectionCount: chunk.sections.length,
      hasMetadata: chunk.hasMetadata || false
    };
  }

  /**
   * Estimate token count from text
   * Uses simple heuristic: 1 token ≈ 4 characters
   */
  estimateTokens(text) {
    return Math.ceil(text.length * this.tokensPerChar);
  }

  /**
   * Split large section into multiple smaller chunks
   */
  splitLargeSection(text, maxTokens) {
    const maxChars = Math.floor(maxTokens / this.tokensPerChar * 0.9); // Use 90% to be safe
    const chunks = [];
    let remainingText = text;
    
    while (remainingText.length > maxChars) {
      const { first, rest } = this.splitAtSentenceBoundary(remainingText, maxChars);
      chunks.push({
        text: first.trim(),
        charCount: first.length,
        tokenCount: this.estimateTokens(first),
        sections: [{ level: 'split-content' }],
        hasMetadata: false
      });
      
      if (rest.trim()) {
        remainingText = rest.trim();
      } else {
        break;
      }
    }
    
    // Add remaining text as final chunk
    if (remainingText.trim()) {
      chunks.push({
        text: remainingText.trim(),
        charCount: remainingText.length,
        tokenCount: this.estimateTokens(remainingText),
        sections: [{ level: 'split-content' }],
        hasMetadata: false
      });
    }
    
    console.log(`[Chunker] Split large section into ${chunks.length} sub-chunks`);
    return chunks;
  }

  /**
   * Split text at sentence boundaries (never mid-sentence)
   */
  splitAtSentenceBoundary(text, maxChars) {
    if (text.length <= maxChars) {
      return { first: text, rest: '' };
    }
    
    // Find last sentence boundary before maxChars
    const searchText = text.substring(0, maxChars);
    const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    
    let lastBoundary = -1;
    sentenceEndings.forEach(ending => {
      const index = searchText.lastIndexOf(ending);
      if (index > lastBoundary) {
        lastBoundary = index + ending.length;
      }
    });
    
    // If no sentence boundary found, split at last space
    if (lastBoundary === -1) {
      lastBoundary = searchText.lastIndexOf(' ');
      if (lastBoundary === -1) {
        lastBoundary = maxChars; // Hard split as last resort
      }
    }
    
    return {
      first: text.substring(0, lastBoundary).trim(),
      rest: text.substring(lastBoundary).trim()
    };
  }

  /**
   * Merge small chunks if possible
   * Useful for optimizing API calls
   */
  mergeSmallChunks(chunks, minTokens = 500) {
    if (chunks.length <= 1) return chunks;
    
    const merged = [];
    let i = 0;
    
    while (i < chunks.length) {
      const current = chunks[i];
      
      // Check if current chunk is small and can be merged with next
      if (i < chunks.length - 1 && current.tokenCount < minTokens) {
        const next = chunks[i + 1];
        
        if (current.tokenCount + next.tokenCount <= this.maxTokens) {
          // Merge with next
          merged.push({
            index: merged.length,
            text: current.text + '\n\n' + next.text,
            charCount: current.charCount + next.charCount,
            tokenCount: current.tokenCount + next.tokenCount,
            sectionCount: current.sectionCount + next.sectionCount,
            hasMetadata: current.hasMetadata || next.hasMetadata
          });
          i += 2; // Skip next chunk
          continue;
        }
      }
      
      merged.push({
        ...current,
        index: merged.length
      });
      i++;
    }
    
    console.log(`[Chunker] Merged ${chunks.length} chunks into ${merged.length} chunks`);
    
    // Final processing to ensure chunks fit within limits
    const finalChunks = [];
    merged.forEach((chunk, index) => {
      if (chunk.tokenCount > this.maxTokens) {
        console.log(`[Chunker] Processing oversized chunk ${index} (${chunk.tokenCount} tokens)...`);
        
        // Split the oversized chunk into smaller pieces
        const splitChunks = this.splitLargeSection(chunk.text, this.maxTokens);
        splitChunks.forEach((subChunk, subIndex) => {
          finalChunks.push({
            index: finalChunks.length,
            text: subChunk.text.trim(),
            charCount: subChunk.charCount,
            tokenCount: subChunk.tokenCount,
            sectionCount: 1,
            hasMetadata: index === 0 ? true : false // Keep metadata on first split
          });
        });
      } else {
        finalChunks.push({
          index: finalChunks.length,
          text: chunk.text.trim(),
          charCount: chunk.charCount,
          tokenCount: chunk.tokenCount,
          sectionCount: chunk.sectionCount,
          hasMetadata: chunk.hasMetadata || false
        });
      }
    });
    
    console.log(`[Chunker] Final processing resulted in ${finalChunks.length} chunks`);
    
    // Log chunk details
    finalChunks.forEach((chunk, index) => {
      console.log(`[Chunker] Final chunk ${index}: ${chunk.tokenCount} tokens, ${chunk.charCount} chars`);
    });
    
    return finalChunks;
  }
}

export default Chunker;

