/**
 * AdaptiveSummarizer - Uses PageClassifier to create type-specific summaries
 * Integrates with existing Summarizer for AI calls
 */

import { PageClassifier } from './pageClassifier.js';
import { CachingManager } from './cachingManager.js';
import { PerformanceMonitor } from './performanceMonitor.js';
import { Chunker } from './chunker.js';
import { ContextEnhancer } from './contextEnhancer.js';

export class AdaptiveSummarizer {
  constructor(apiKey, model = 'gemini-2.0-flash') {
    this.classifier = new PageClassifier();
    this.apiKey = apiKey;
    this.model = model;
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models';
    this.chunker = new Chunker({ maxTokens: 500, maxChars: 2000 });
    this.cachingManager = new CachingManager();
    this.performanceMonitor = new PerformanceMonitor();
    this.contextEnhancer = new ContextEnhancer();
    this.templates = this.initializeTemplates();
    
    // Performance optimization settings
    this.maxConcurrentRequests = 3; // Process 3 chunks simultaneously
    this.requestDelay = 100; // 100ms delay between batches
    this.maxRetries = 2; // Retry failed requests up to 2 times
    
    // Initialize chunker directly (no Summarizer dependency)
    this.chunker = new Chunker({
      maxTokens: 500,
      maxChars: 2000
    });
  }

  /**
   * Initialize prompt templates for each page type
   */
  initializeTemplates() {
    return {
      news: {
        short: `Create a concise news summary (80-120 words):

**Overview:** [1-2 sentences: What happened? Where? When?]

**Key Points:**
• [Most important fact]
• [Second most important fact]
• [Third most important fact]

**Context:** [1-2 sentences: Why significant?]

**External Context:** [Use external context if provided - recent developments, background, broader implications]

Focus on: Who, What, Where, When, Why. Keep factual and concise.`,

        medium: `Create a detailed news summary (300 words):

**Overview:** [2-3 sentences combining main points]

**Key Points:**
• **Topic 1:** [Most important fact]
• **Topic 2:** [Second most important fact]  
• **Topic 3:** [Third most important fact]

**Context:** [2-3 sentences providing background]

**External Context:** [Use external context if provided - recent developments, background, broader implications]

**Details:**
• [Important detail 1]
• [Important detail 2]
• [Important detail 3]
• [Important detail 4]

**Timeline/Events:** (Only if relevant)
| Period | Event |
|--------|-------|
| YYYY | Brief fact |

**Related Links:** [Include external links if provided]

Use consistent bullet points (•) and avoid redundant information.`
      },
      
      blog: {
        short: `Create a concise blog summary (80-120 words):

**Main Argument:** [1-2 sentences: Core thesis]

**Key Points:**
• [Supporting point 1]
• [Supporting point 2]
• [Supporting point 3]

**Author's Stance:** [Brief: Positive/Negative/Neutral with explanation]

Focus on the author's perspective and main argument.`,

        medium: `Create a detailed blog summary (300 words):

**Main Argument:** [2-3 sentences: Core thesis and context]

**Supporting Points:**
• **Point 1:** [Detailed explanation]
• **Point 2:** [Detailed explanation]
• **Point 3:** [Detailed explanation]

**Author's Stance:** [Detailed: Positive/Negative/Neutral with reasoning]

**Evidence/Examples:**
• [Key evidence 1]
• [Key evidence 2]

Focus on argument structure and author's perspective.`
      },
      
      forum: {
        prompt: `You are a forum discussion analyzer. Create a structured forum summary.

FORMAT:
**Original Post:** Brief summary of main post
**Main Themes in Comments:**
- Theme 1 (X% supportive)
- Theme 2 (Y% critical)
- Theme 3 (Z% questions/other)
**Overall Sentiment:** [Positive/Negative/Mixed] with reasoning

Focus on discussion patterns and community sentiment.`,
        
        sections: ['original_post', 'main_themes', 'sentiment']
      },
      
      ecommerce: {
        prompt: `You are a product information extractor. Create a structured product summary.

FORMAT:
**Product Name:** [Full product title]
**Category:** [Product type/category]
**Key Features:**
- Feature 1
- Feature 2
- Feature 3
**Price:** [Current price and any discounts]
**Call to Action:** [Main offers or CTAs]

Focus on purchase-relevant information.`,
        
        sections: ['product_name', 'category', 'features', 'price', 'cta']
      },
      
      reference: {
        prompt: `You are a reference content summarizer. Create a structured knowledge summary.

FORMAT:
**Overview:** 2-3 sentence introduction
**Key Points:**
• **Fact 1:** Brief explanation
• **Fact 2:** Brief explanation
• **Fact 3:** Brief explanation
**Context:** 2-3 sentences of background
**Details:**
• Detail 1
• Detail 2
• Detail 3
**Timeline/Events:** (Only include if there are actual historical events with dates)
| Period | Event |
|--------|-------|
| YYYY | Brief fact |

IMPORTANT RULES:
- Use • for ALL bullet points consistently
- Avoid redundant information across sections
- Only include Timeline if there are actual historical events with specific dates
- If no timeline, omit the Timeline section entirely
- Keep each section focused and non-repetitive

Focus on factual accuracy and comprehensive coverage.`,
        
        sections: ['overview', 'key_points', 'context', 'details', 'timeline']
      },
      
      academic: {
        prompt: `You are an academic paper summarizer. Create a structured research summary.

FORMAT:
**Research Question:** [Main question being investigated]
**Methodology:** [How the research was conducted]
**Key Findings:**
- Finding 1
- Finding 2
- Finding 3
**Implications:** [What this means for the field]

Focus on scientific accuracy and research methodology.`,
        
        sections: ['research_question', 'methodology', 'findings', 'implications']
      },
      
      youtube: {
        short: `**Title:**
[Create a compelling headline that captures the essence of the video and audience reaction]

**Overview:**
[1-2 sentences: What is this video about?]

**Key Details:**
• **Channel:** [Channel name]
• **Views:** [View count]
• **Topic:** [Core subject]

**Sentiment Overview:**
[What are people saying in general?]

**Sentiment Breakdown:**
• **Positive ([Percentage])** – [Brief description]
• **Negative ([Percentage])** – [Brief description]  
• **Neutral/Mixed ([Percentage])** – [Brief description]

**Main Themes:**
• **[Theme 1]:** [Brief description]
• **[Theme 2]:** [Brief description]

**Representative Comments:**
• **"[Quote 1]"** – @username ([likes] likes)
• **"[Quote 2]"** – @username ([likes] likes)

**External Context:**
[Use external context if provided - background information, recent developments]

**Insight:**
[AI synthesis: Connect what the video was about with how people reacted and what that says about the broader topic or sentiment online. This should be 2-3 sentences that provide meaningful analysis beyond just summarizing parts. THIS SECTION IS MANDATORY AND MUST BE COMPLETED.]

CRITICAL: Complete ALL sections including Insight. Do not cut off mid-sentence. The Insight section MUST be the final section and MUST be completed.`,

        medium: `**Title:**
[Create a compelling headline that captures the essence of the video and audience reaction]

**Overview:**
[2-3 sentences: What is this video about? Key points covered]

**Key Details:**
• **Channel:** [Channel name and credibility]
• **Views:** [View count and engagement level]
• **Topic:** [Core subject and context]

**Sentiment Overview:**
[What are people saying in general? 1-2 sentences summarizing overall comment sentiment]

**Sentiment Breakdown:**
• **Positive ([Percentage])** – [Brief description of positive themes]
• **Negative ([Percentage])** – [Brief description of negative themes]  
• **Neutral/Mixed ([Percentage])** – [Brief description of neutral themes]

**Argument Themes:**
• **[Theme Name]:** [Brief description of this argument cluster]
• **[Theme Name]:** [Brief description of this argument cluster]
• **[Theme Name]:** [Brief description of this argument cluster]

**Representative Comments:**
• **"[Quote from top comment]"** – @username ([likes] likes)
• **"[Quote from contrasting comment]"** – @username ([likes] likes)
• **"[Quote from third perspective]"** – @username ([likes] likes)

**External Context:**
[Use external context if provided - background information, recent developments]

**Insight:**
[AI synthesis: Connect what the video was about with how people reacted and what that says about the broader topic or sentiment online. This should be 2-3 sentences that provide meaningful analysis beyond just summarizing parts. THIS SECTION IS MANDATORY AND MUST BE COMPLETED.]

CRITICAL REQUIREMENTS - MUST COMPLETE ALL SECTIONS:
1. **Title** - REQUIRED: Compelling headline capturing video essence and audience reaction
2. **Overview** - REQUIRED: 2-3 sentences about video content
3. **Key Details** - REQUIRED: Channel, Views, Topic
4. **Sentiment Overview** - REQUIRED: Overall comment sentiment
5. **Sentiment Breakdown** - REQUIRED: Positive/Negative/Neutral percentages
6. **Argument Themes** - REQUIRED: At least 3 theme clusters
7. **Representative Comments** - REQUIRED: At least 3 actual comment quotes with usernames
8. **External Context** - REQUIRED: Use provided external context
9. **Insight** - REQUIRED: AI synthesis connecting video content with audience reaction - THIS IS THE FINAL SECTION AND MUST BE COMPLETED

MANDATORY RULES:
- COMPLETE ALL 9 SECTIONS - NO EXCEPTIONS
- If approaching token limit, COMPLETE current section before stopping
- NEVER cut off mid-section - finish the section you're working on
- Use • for ALL bullet points consistently
- Focus on VIDEO CONTENT first, then comment analysis
- Include actual comment quotes (not paraphrased)
- Show comment author names and like counts
- Analyze sentiment patterns, not individual opinions
- ALWAYS include External Context section if provided
- AVOID repetition - each section should add unique value
- NO generic fillers like "This video discusses..." or "The content covers..."
- START DIRECTLY WITH **Overview:** - NO introductory text or explanations
- DO NOT add phrases like "Here's a YouTube video summary" or "This video analysis includes"
- BEGIN IMMEDIATELY with the first section header
- NEVER cut off mid-sentence - always complete the current section
- If approaching token limit, prioritize completing current section over starting new ones
- ALWAYS end with a complete sentence in the Insight section
- INSIGHT SECTION IS MANDATORY - never skip or cut off this section
- The Insight section must provide meaningful analysis connecting video content with audience reaction
- ALWAYS end the summary with the Insight section - it is the final required section
- If you must choose between completing Insight or starting a new section, ALWAYS complete Insight
- Be specific and concrete in all descriptions
- Prioritize substance over word count

Focus on video content quality and audience engagement patterns.`,

        sections: ['title', 'overview', 'key_details', 'sentiment_overview', 'sentiment_breakdown', 'argument_themes', 'representative_comments', 'external_context', 'insight']
      },
      
      generic: {
        prompt: `You are a general content summarizer. Create a structured summary.

FORMAT:
**Overview:** 2-3 sentence introduction
**Key Points:**
• Point 1
• Point 2
• Point 3
**Details:**
• Detail 1
• Detail 2
• Detail 3
**External Context:** (REQUIRED if provided - include background information from external sources)

IMPORTANT RULES:
- Use • for ALL bullet points consistently
- Avoid redundant information across sections
- Keep each section focused and non-repetitive
- Use bold text for important names, dates, and key terms
- ALWAYS include the External Context section if external context is provided
- Integrate external context naturally into the External Context section

Focus on clarity and comprehensive coverage.`,
        
        sections: ['overview', 'key_points', 'details', 'external_context']
      }
    };
  }

  /**
   * Create adaptive summary based on page type with caching
   * @param {Object} pageData - {url, title, content, metadata}
   * @param {string} length - 'short', 'medium', 'long'
   * @returns {Promise<Object>} Summary result
   */
  async summarize(pageData, length = 'short') {
    const startTime = Date.now();
    
    try {
      console.log('[AdaptiveSummarizer] Starting adaptive summarization...');
      
      // Step 1: Classify page type first (needed for consistent cache keys)
      const classification = this.classifier.classify(pageData);
      console.log('[AdaptiveSummarizer] Page classified as:', classification.type);
      
      // Step 2: Check cache FIRST (without external context to avoid regeneration)
      const basicCacheKey = await this.cachingManager.generateContentHash(
        pageData.content,
        {
          title: pageData.title,
          url: pageData.url,
          pageType: classification.type,
          summaryLength: length
        }
      );
      const cachedResult = await this.cachingManager.getCachedSummary(basicCacheKey);
      
      if (cachedResult) {
        console.log('[AdaptiveSummarizer] Found cached summary, returning without regeneration');
        return {
          success: true,
          data: {
            summary: cachedResult.summary,
            metadata: cachedResult.metadata,
            cached: true
          }
        };
      }
      
      // Step 3: Only get external context if no cache found
      console.log('[AdaptiveSummarizer] No cache found, getting external context...');
      const externalContext = await this.contextEnhancer.getExternalContext({
        title: pageData.title,
        url: pageData.url,
        content: pageData.content,
        pageType: classification.type
      }, this.apiKey);
      console.log('[AdaptiveSummarizer] External context received:', externalContext);
      
      // Step 4: Get template for this page type
      const template = this.templates[classification.type] || this.templates.generic;
      const config = this.classifier.getTemplateConfig(classification.type) || this.classifier.getTemplateConfig('generic');
      
      console.log(`[AdaptiveSummarizer] Using template: ${classification.type || 'generic'}`);
      
      // Step 5: Build adaptive prompt
      const adaptivePrompt = this.buildAdaptivePrompt(
        pageData.content,
        template,
        config,
        length
      );
      
      // Step 6: Generate summary using existing summarizer
      // Use original content directly (not template prompt)
      const structuredContent = {
        title: pageData.title || '',
        sections: [{
          heading: '',
          level: 'root',
          content: [{
            type: 'p',
            text: pageData.content
          }]
        }]
      };
      
      const metadata = {
        title: pageData.title || '',
        author: pageData.metadata?.author || '',
        date: pageData.metadata?.date || '',
        url: pageData.url || '',
        description: pageData.metadata?.description || ''
      };
      
      // Always use quota-aware processing for large content
      // The summarizer will handle the chunking and quota management
      let result;
      
      // Check content size to determine processing strategy
      const contentLength = pageData.content.length;
      if (contentLength > 20000) { // Large content threshold
        console.log(`[AdaptiveSummarizer] Large content detected (${contentLength} chars), using quota-aware processing`);
        result = await this.quotaAwareSummarization(structuredContent, metadata, length, template);
      } else {
        // Use adaptive template for regular processing
        const fullText = pageData.content || '';
        const summary = await this.processWithAI(fullText, template, length, externalContext);
        result = {
          summary: summary,
          wordCount: summary.split(' ').length,
          sentenceCount: summary.split(/[.!?]+/).length - 1,
          charCount: summary.length
        };
      }
      
      // Step 7: Add classification metadata
      const finalResult = {
        ...result,
        classification: {
          type: classification.type,
          confidence: classification.confidence,
          reasoning: classification.reasoning
        },
        template: {
          structure: config.structure,
          sections: config.sections
        },
        cached: false
      };
      
      // Step 8: Store in cache for future use (use same key as retrieval)
      await this.cachingManager.storeCachedSummary(
        basicCacheKey,
        result.summary,
        {
          ...metadata,
          pageType: classification.type,
          summaryLength: length,
          classification: classification,
          template: config
        }
      );
      
      // Step 9: Record performance metrics
      const totalLatency = Date.now() - startTime;
      this.performanceMonitor.recordCacheMiss(totalLatency);
      this.performanceMonitor.recordEndToEnd('summarization', totalLatency);
      
      return finalResult;
      
    } catch (error) {
      console.error('[AdaptiveSummarizer] Error:', error);
      this.performanceMonitor.recordError(error);
      
      // Fallback to direct AI processing
      const fullText = pageData.content;
      const summary = await this.processWithAI(fullText, this.templates.generic, length);
      return {
        summary: summary,
        wordCount: summary.split(' ').length,
        sentenceCount: summary.split(/[.!?]+/).length - 1,
        charCount: summary.length
      };
    }
  }

  /**
   * Build template-based prompt for AI processing
   */
  buildTemplatePrompt(text, template, length = 'short', externalContext = null) {
    // Get the appropriate prompt based on length
    const prompt = template[length] || template.short || template.prompt;
    
    // Add external context if available
    let contextSection = '';
    if (externalContext && !externalContext.fallback) {
      contextSection = this.contextEnhancer.formatContextForTemplate(externalContext);
    }
    
    return `${prompt}

${contextSection ? `EXTERNAL CONTEXT TO INCLUDE IN YOUR SUMMARY:
${contextSection}

CRITICAL: You MUST include the external context information above in a dedicated "External Context" section. This is REQUIRED, not optional.` : ''}CONTENT TO SUMMARIZE:
${text}`;
  }

  /**
   * Direct AI processing without Summarizer dependency
   */
  async processWithAI(text, template, length = 'short', externalContext = null) {
    const prompt = this.buildTemplatePrompt(text, template, length, externalContext);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: length === 'short' ? 1000 : length === 'medium' ? 2500 : 4000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response structure from Gemini');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('[AdaptiveSummarizer] AI processing failed:', error);
      throw error;
    }
  }

  /**
   * Smart quota-aware summarization that prioritizes important content
   */
  async quotaAwareSummarization(content, metadata, length, template) {
    console.log('[AdaptiveSummarizer] Starting quota-aware summarization...');
    
    // Use direct chunker
    const chunks = this.chunker.chunk(content, metadata);
    const prioritized = this.prioritizeChunks(chunks);
    
    console.log(`[AdaptiveSummarizer] Prioritized chunks: ${prioritized.highPriority.length} high priority, ${prioritized.lowPriority.length} low priority`);
    
    // Process high-priority chunks with AI
    const aiSummaries = [];
    if (prioritized.metadata) {
      const metadataText = prioritized.metadata.text || '';
      const metadataResult = await this.processWithAI(metadataText, template, length);
      aiSummaries.push(metadataResult);
    }
    
    let processedChunks = 0;
    const maxQuotaChunks = 15;
    
    // Process chunks in parallel batches for better performance
    const batchSize = 3; // Process 3 chunks at a time to respect API limits
    const batches = [];
    
    for (let i = 0; i < prioritized.highPriority.slice(0, 14).length; i += batchSize) {
      batches.push(prioritized.highPriority.slice(0, 14).slice(i, i + batchSize));
    }
    
    console.log(`[AdaptiveSummarizer] Processing ${batches.length} batches of ${batchSize} chunks each`);
    
    const batchStartTime = Date.now();
    let totalSuccessfulChunks = 0;
    let totalFailedChunks = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`[AdaptiveSummarizer] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)...`);
      
      // Process batch in parallel with retry logic
      const batchPromises = batch.map(async (chunk, chunkIndex) => {
        const globalChunkIndex = batchIndex * batchSize + chunkIndex + 1;
        console.log(`[AdaptiveSummarizer] Processing priority chunk ${globalChunkIndex}/${maxQuotaChunks}...`);
        
        // Retry logic for failed requests
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            const chunkText = chunk.text || '';
            const summary = await this.processWithAI(chunkText, template, length);
            return { success: true, summary, chunkIndex: globalChunkIndex, attempts: attempt };
          } catch (error) {
            console.warn(`[AdaptiveSummarizer] Chunk ${globalChunkIndex} attempt ${attempt}/${this.maxRetries} failed:`, error.message);
            
            // If quota exceeded, don't retry
            if (error.message.includes('429') || error.message.includes('quota')) {
              return { success: false, error: error.message, chunkIndex: globalChunkIndex, attempts: attempt };
            }
            
            // If last attempt, return failure
            if (attempt === this.maxRetries) {
              return { success: false, error: error.message, chunkIndex: globalChunkIndex, attempts: attempt };
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
          }
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful summaries and track performance
      batchResults.forEach(result => {
        if (result.success) {
          aiSummaries.push(result.summary);
          processedChunks++;
          totalSuccessfulChunks++;
        } else {
          totalFailedChunks++;
          // Stop processing if we hit quota limits
          if (result.error.includes('429') || result.error.includes('quota')) {
            console.log(`[AdaptiveSummarizer] ✅ Reached quota limit (${processedChunks} chunks). Stopping for quality consistency.`);
            return;
          }
        }
      });
      
      // Stop when we've reached quota limit
      if (processedChunks >= maxQuotaChunks - (prioritized.metadata ? 1 : 0)) {
        console.log(`[AdaptiveSummarizer] ✅ Reached quota limit (${processedChunks} chunks). Stopping for quality consistency.`);
        break;
      }
      
      // Add delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        console.log(`[AdaptiveSummarizer] Waiting ${this.requestDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      }
    }
    
    // Log batch processing performance
    const totalBatchTime = Date.now() - batchStartTime;
    console.log(`[AdaptiveSummarizer] 🚀 Batch processing complete: ${totalSuccessfulChunks} success, ${totalFailedChunks} failed in ${totalBatchTime}ms`);
    console.log(`[AdaptiveSummarizer] 📊 Performance: ${(totalSuccessfulChunks / (totalBatchTime / 1000)).toFixed(2)} chunks/second`);
    
    // Only use AI summaries (no fallback mixing)
    console.log(`[AdaptiveSummarizer] Using ${aiSummaries.length} pure AI summaries (no extractive fallback)`);
    
    // Use AI to intelligently merge all chunk summaries
    const finalSummary = await this.mergeSummariesWithAI(aiSummaries, template, length);
    
    // Add note about truncated content if we stopped early
    const truncatedChunks = prioritized.highPriority.length + prioritized.lowPriority.length - aiSummaries.length;
    const summaryNote = truncatedChunks > 0 ? 
      `\n\n**Note:** Summary covers the ${aiSummaries.length} most important sections. ${truncatedChunks} additional sections were truncated due to API quotas for consistent quality.` : '';
    
    return {
      summary: finalSummary + summaryNote,
      wordCount: finalSummary.split(' ').length,
      sentenceCount: finalSummary.split(/[.!?]+/).length - 1,
      charCount: finalSummary.length,
      processing: {
        chunksProcessed: aiSummaries.length,
        model: this.model,
        quotaAware: true
      }
    };
  }

  /**
   * Use AI to intelligently merge multiple chunk summaries into one coherent summary
   */
  async mergeSummariesWithAI(summaries, template, length = 'short') {
    if (summaries.length === 0) return '';
    if (summaries.length === 1) return summaries[0];
    
    // Combine all summaries for AI processing
    const combinedSummaries = summaries.join('\n\n---\n\n');
    
    const mergePrompt = `You are an expert content editor. Your task is to merge multiple related summaries into ONE highly readable, well-structured summary.

INSTRUCTIONS:
1. Read all the summaries below
2. Identify the main themes and topics
3. Create ONE unified summary following this exact format:

**Overview:** 
[2-3 SHORT sentences. Break into separate lines for readability. Focus on: What is this about? Where? When? Why important?]

**Key Points:**
• [One-line fact 1]
• [One-line fact 2]  
• [One-line fact 3]
• [One-line fact 4]

**Context:** 
[2-3 SHORT sentences. Break into separate lines. Focus on: Historical background, significance, current status]

**Details:**
**Geography & Demographics:**
• [Geographic fact]
• [Population/demographic fact]

**Economy & Development:**
• [Economic fact]
• [Development fact]

**Politics & Governance:**
• [Political fact]
• [Governance fact]

**Timeline/Events:** (Only include if there are actual historical events with dates)
| Year | Event |
|------|-------|
| YYYY | Brief, clear event description |

RULES FOR READABILITY:
- Use SHORT sentences (max 15-20 words each)
- Break long paragraphs into multiple lines
- Keep bullet points to ONE line each
- Group related details under subheadings
- Use **bold** for subheadings within Details
- Remove ALL duplicate information
- Keep only the most important and unique facts
- Maintain factual accuracy
- If no timeline events, omit the Timeline section entirely

SUMMARIES TO MERGE:
${combinedSummaries}

Create ONE highly readable, well-structured summary now:`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: mergePrompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: length === 'short' ? 1000 : length === 'medium' ? 2500 : 4000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response structure from Gemini');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('[AdaptiveSummarizer] AI merging failed:', error);
      // Fallback to simple concatenation if AI merging fails
      return summaries.join('\n\n');
    }
  }

  /**
   * Intelligently merge multiple chunk summaries into one coherent summary
   */
  mergeChunkSummaries(summaries) {
    if (summaries.length === 0) return '';
    if (summaries.length === 1) return summaries[0];
    
    // Extract sections from each summary
    const allSections = {
      overview: [],
      keyPoints: [],
      context: [],
      details: [],
      timeline: []
    };
    
    summaries.forEach(summary => {
      // Split by sections
      const sections = summary.split(/\*\*([^*]+):\*\*/g);
      
      for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i].toLowerCase().trim();
        const sectionContent = sections[i + 1]?.trim() || '';
        
        if (sectionName.includes('overview')) {
          allSections.overview.push(sectionContent);
        } else if (sectionName.includes('key point')) {
          allSections.keyPoints.push(sectionContent);
        } else if (sectionName.includes('context')) {
          allSections.context.push(sectionContent);
        } else if (sectionName.includes('detail')) {
          allSections.details.push(sectionContent);
        } else if (sectionName.includes('timeline')) {
          allSections.timeline.push(sectionContent);
        }
      }
    });
    
    // Build merged summary
    let mergedSummary = '';
    
    // Overview: Combine all overviews into one
    if (allSections.overview.length > 0) {
      const combinedOverview = allSections.overview.join(' ').trim();
      mergedSummary += `**Overview:** ${combinedOverview}\n\n`;
    }
    
    // Key Points: Combine and deduplicate
    if (allSections.keyPoints.length > 0) {
      mergedSummary += `**Key Points:**\n`;
      const allKeyPoints = allSections.keyPoints.join('\n');
      const uniquePoints = this.deduplicateBulletPoints(allKeyPoints);
      mergedSummary += uniquePoints + '\n\n';
    }
    
    // Context: Combine contexts
    if (allSections.context.length > 0) {
      const combinedContext = allSections.context.join(' ').trim();
      mergedSummary += `**Context:** ${combinedContext}\n\n`;
    }
    
    // Details: Combine and deduplicate
    if (allSections.details.length > 0) {
      mergedSummary += `**Details:**\n`;
      const allDetails = allSections.details.join('\n');
      const uniqueDetails = this.deduplicateBulletPoints(allDetails);
      mergedSummary += uniqueDetails + '\n\n';
    }
    
    // Timeline: Combine timelines
    if (allSections.timeline.length > 0) {
      mergedSummary += `**Timeline/Events:**\n`;
      const allTimelines = allSections.timeline.join('\n');
      mergedSummary += allTimelines + '\n\n';
    }
    
    return mergedSummary.trim();
  }
  
  /**
   * Deduplicate bullet points by removing similar content
   */
  deduplicateBulletPoints(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const uniqueLines = [];
    
    lines.forEach(line => {
      const isDuplicate = uniqueLines.some(existingLine => {
        const similarity = this.calculateSimilarity(line, existingLine);
        return similarity > 0.7; // 70% similarity threshold
      });
      
      if (!isDuplicate) {
        uniqueLines.push(line);
      }
    });
    
    return uniqueLines.join('\n');
  }
  
  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Prioritize chunks for AI processing based on content importance
   */
  prioritizeChunks(chunks) {
    const metadataChunk = chunks.find(chunk => chunk.hasMetadata);
    const contentChunks = chunks.filter(chunk => !chunk.hasMetadata);
    
    // Score chunks by importance
    const scoredChunks = contentChunks.map(chunk => {
      const score = this.scoreChunkImportance(chunk);
      return { ...chunk, importanceScore: score };
    });
    
    // Sort by importance (highest first)
    scoredChunks.sort((a, b) => b.importanceScore - a.importanceScore);
    
    console.log(`[AdaptiveSummarizer] Top 5 prioritized chunks:`, scoredChunks.slice(0, 5).map(c => ({ 
      score: c.importanceScore, 
      tokens: c.tokenCount, 
      preview: c.text.substring(0, 100) 
    })));
    
    return {
      metadata: metadataChunk,
      highPriority: scoredChunks.slice(0, 12), // Top 12 for AI processing (leaving room for merge call)
      lowPriority: scoredChunks.slice(12)      // Remaining content (not used in pure AI mode)
    };
  }

  /**
   * Score chunk importance based on content characteristics
   */
  scoreChunkImportance(chunk) {
    let score = 0;
    const text = chunk.text.toLowerCase();
    
    // Higher score for substantive content
    score += chunk.tokenCount; // More tokens = more content
    
    // Boost for structured content
    if (text.includes('**')) score += 20;           // Markdown formatting
    if (text.includes(',') || text.includes('-')) score += 15; // Lists
    if (text.includes('|')) score += 10;            // Tables
    
    // Boost for factual content indicators
    if (/\d{4}/.test(text)) score += 10;           // Years
    if (/\d+%/.test(text)) score += 8;             // Percentages
    if (text.includes('district') || text.includes('representative')) score += 15;
    if (text.includes('election') || text.includes('vote')) score += 15;
    
    // Reduce score for navigation/metadata
    if (text.includes('jump to') || text.includes('navigation')) score -= 50;
    if (text.includes('references') || text.includes('external links')) score -= 30;
    if (text.includes('see also') || text.includes('category')) score -= 25;
    
    return score;
  }

  /**
   * Build adaptive prompt based on page type and template
   */
  buildAdaptivePrompt(content, template, config, length) {
    const wordTargets = {
      short: '120-180',
      medium: '500-700',
      long: '750-950'
    };
    
    const targetWords = wordTargets[length] || wordTargets.medium;
    
    // Get the appropriate prompt based on length (handle both prompt and short/medium structure)
    const prompt = template[length] || template.short || template.prompt;
    
    return `${prompt}

CONTENT REQUIREMENTS:
- Length: ${targetWords} words
- Preserve all factual details (numbers, dates, names)
- No new information not in original text
- Use proper formatting (bold, bullets, tables)

CONTENT TO SUMMARIZE:
${content}

STRUCTURED SUMMARY (${targetWords} words):`;
  }

  /**
   * Get summary statistics for different page types
   */
  getSummaryStats() {
    return {
      supportedTypes: Object.keys(this.templates),
      totalTemplates: Object.keys(this.templates).length,
      classificationRules: Object.keys(this.classifier.classificationRules).length
    };
  }
}

export default AdaptiveSummarizer;
