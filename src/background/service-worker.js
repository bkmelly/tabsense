/**
 * TabSense Service Worker
 * Uses dynamic import for AdaptiveSummarizer to avoid ES6 module issues
 */

console.log('[TabSense] Service worker loaded');

// Web Search Service - Plain JavaScript, no imports
class WebSearchService {
  constructor() {
    this.sources = {
      wikipedia: 'https://en.wikipedia.org/api/rest_v1/page/summary/',
      serper: 'https://google.serper.dev/search'
    };
  }

  async hasAPIKey(service) {
    try {
      const result = await chrome.storage.local.get(['other_api_keys', 'other_api_enabled']);
      const keys = result.other_api_keys || {};
      const enabled = result.other_api_enabled || {};
      return !!(enabled[service] && keys[service]);
    } catch (error) {
      return false;
    }
  }

  async getAPIKey(service) {
    try {
      const result = await chrome.storage.local.get(['other_api_keys']);
      const keys = result.other_api_keys || {};
      return keys[service] || '';
    } catch (error) {
      return '';
    }
  }

  async search(query, options = {}) {
    const results = {
      wikipedia: [],
      news: [],
      web: [],
      sources: [],
      totalResults: 0
    };

    console.log('[WebSearch] Starting search for:', query);

    // 1. Wikipedia (always available, free)
    try {
      const wikiResults = await this.searchWikipedia(query);
      if (wikiResults) {
        results.wikipedia.push(wikiResults);
        if (wikiResults.sources && wikiResults.sources.length > 0) {
          results.sources.push(...wikiResults.sources);
        }
      }
      console.log('[WebSearch] Wikipedia results:', results.wikipedia.length);
    } catch (error) {
      console.warn('[WebSearch] Wikipedia search failed:', error);
    }

    // 2. NewsAPI (if key available - check both 'news' and 'newsapi' for compatibility)
    const hasNewsAPI = await this.hasAPIKey('newsapi') || await this.hasAPIKey('news');
    if (hasNewsAPI) {
      try {
        const newsApiKey = await this.getAPIKey('newsapi') || await this.getAPIKey('news');
        const newsResults = await this.searchNewsAPI(query, options.newsLimit || 5, newsApiKey);
        results.news = newsResults;
        if (newsResults.length > 0) {
          results.sources.push(...newsResults.map(article => ({
            title: article.title,
            url: article.url,
            description: article.description || ''
          })));
        }
        console.log('[WebSearch] NewsAPI results:', results.news.length);
      } catch (error) {
        console.warn('[WebSearch] NewsAPI search failed:', error);
      }
    }

    // 3. Serper.dev (if key available)
    if (await this.hasAPIKey('serper')) {
      try {
        const serperResults = await this.searchSerper(query, options.serperLimit || 5);
        results.web = serperResults;
        if (serperResults.length > 0) {
          results.sources.push(...serperResults.map(result => ({
            title: result.title,
            url: result.link,
            description: result.snippet || ''
          })));
        }
        console.log('[WebSearch] Serper.dev results:', results.web.length);
      } catch (error) {
        console.warn('[WebSearch] Serper.dev search failed:', error);
      }
    }

    results.totalResults = results.wikipedia.length + results.news.length + results.web.length;
    console.log('[WebSearch] Total results:', results.totalResults);
    console.log('[WebSearch] Results breakdown:', {
      wikipedia: results.wikipedia.length,
      news: results.news.length,
      web: results.web.length,
      totalSources: results.sources.length
    });

    return results;
  }

  async searchWikipedia(query) {
    try {
      const searchQueries = this.generateWikipediaQueries(query);
      
      for (const searchQuery of searchQueries) {
        const directUrl = `${this.sources.wikipedia}${encodeURIComponent(searchQuery)}`;
        
        try {
          const response = await fetch(directUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.extract && data.extract.length > 50) {
              return {
                type: 'wikipedia',
                title: data.title,
                abstract: data.extract,
                url: data.content_urls?.desktop?.page || '',
                sources: [{
                  title: data.title,
                  url: data.content_urls?.desktop?.page || '',
                  description: data.extract.substring(0, 150) + '...'
                }]
              };
            }
          }
        } catch (error) {
          // Continue to next query
        }

        // Try Wikipedia search API
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=1&origin=*`;
        try {
          const searchResponse = await fetch(searchUrl);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
              const pageTitle = searchData.query.search[0].title;
              
              const pageUrl = `${this.sources.wikipedia}${encodeURIComponent(pageTitle)}`;
              const pageResponse = await fetch(pageUrl);
              
              if (pageResponse.ok) {
                const pageData = await pageResponse.json();
                if (pageData.extract && pageData.extract.length > 50) {
                  return {
                    type: 'wikipedia',
                    title: pageData.title,
                    abstract: pageData.extract,
                    url: pageData.content_urls?.desktop?.page || '',
                    sources: [{
                      title: pageData.title,
                      url: pageData.content_urls?.desktop?.page || '',
                      description: pageData.extract.substring(0, 150) + '...'
                    }]
                  };
                }
              }
            }
          }
    } catch (error) {
          // Continue to next query
        }
      }
      
      return null;
    } catch (error) {
      console.error('[WebSearch] Wikipedia search error:', error);
      return null;
    }
  }

  generateWikipediaQueries(query) {
    const queries = [];
    queries.push(query);
    
    const cleanQuery = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    queries.push(cleanQuery);
    
    const words = cleanQuery.split(' ').filter(word => word.length > 2);
    if (words.length > 1) {
      queries.push(words.slice(0, 2).join(' '));
      if (words.length > 2) {
        queries.push(words.slice(0, 3).join(' '));
      }
    }
    
    return [...new Set(queries)].slice(0, 3);
  }

  async searchNewsAPI(query, limit = 5, apiKeyOverride = null) {
    try {
      const apiKey = apiKeyOverride || await this.getAPIKey('newsapi') || await this.getAPIKey('news');
      if (!apiKey) {
        return [];
      }

      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=${limit}&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('NewsAPI key invalid');
        }
        if (response.status === 429) {
          throw new Error('NewsAPI quota exceeded');
        }
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.message}`);
      }

      return (data.articles || []).map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('[WebSearch] NewsAPI search error:', error);
      return [];
    }
  }

  async searchSerper(query, limit = 5) {
    try {
      const apiKey = await this.getAPIKey('serper');
      if (!apiKey) {
        return [];
      }

      const url = this.sources.serper;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: limit
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Serper.dev API key invalid');
        }
        if (response.status === 429) {
          throw new Error('Serper.dev quota exceeded');
        }
        throw new Error(`Serper.dev error: ${response.status}`);
      }

      const data = await response.json();
      
      const organicResults = (data.organic || []).slice(0, limit).map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: result.position
      }));

      // Also extract answer box if available
      const answerBox = data.answerBox;
      if (answerBox && answerBox.answer) {
        organicResults.unshift({
          title: answerBox.title || 'Direct Answer',
          link: answerBox.link || '',
          snippet: answerBox.answer,
          position: 0,
          isAnswerBox: true
        });
      }

      return organicResults;
    } catch (error) {
      console.error('[WebSearch] Serper.dev search error:', error);
      return [];
    }
  }

  formatResultsForPrompt(searchResults) {
    let formatted = '';
    
    if (searchResults.wikipedia.length > 0) {
      formatted += '**Wikipedia Background:**\n';
      searchResults.wikipedia.forEach(result => {
        formatted += `- ${result.title}: ${result.abstract.substring(0, 500)}${result.abstract.length > 500 ? '...' : ''}\n`;
        if (result.url) {
          formatted += `  Source: ${result.url}\n`;
        }
      });
      formatted += '\n';
    }
    
    if (searchResults.news.length > 0) {
      formatted += '**Recent News Articles:**\n';
      searchResults.news.slice(0, 3).forEach(article => {
        formatted += `- ${article.title}\n`;
        if (article.description) {
          formatted += `  ${article.description.substring(0, 200)}${article.description.length > 200 ? '...' : ''}\n`;
        }
        formatted += `  Source: ${article.source} | Published: ${article.publishedAt || 'Unknown'}\n`;
        formatted += `  URL: ${article.url}\n`;
      });
      formatted += '\n';
    }
    
    if (searchResults.web.length > 0) {
      formatted += '**Web Search Results:**\n';
      searchResults.web.slice(0, 3).forEach(result => {
        formatted += `- ${result.title}\n`;
        if (result.snippet) {
          formatted += `  ${result.snippet}\n`;
        }
        formatted += `  URL: ${result.link}\n`;
      });
      formatted += '\n';
    }
    
    return formatted.trim();
  }
}

// AI Provider Manager - Plain JavaScript, no imports
class AIProviderManager {
  constructor() {
    // Gemini models in order of preference
    this.geminiModels = [
      'gemini-2.0-flash-exp',  // Latest experimental
      'gemini-2.0-flash',      // Stable 2.0
      'gemini-1.5-pro-latest', // Latest 1.5 Pro
      'gemini-1.5-pro',        // Stable 1.5 Pro
      'gemini-1.5-flash-latest', // Latest 1.5 Flash
      'gemini-1.5-flash'       // Stable 1.5 Flash
    ];
    
    this.providers = {
      gemini: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        models: this.geminiModels
      },
      openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4'
      },
      anthropic: {
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022'
      }
    };
    
    // Page type templates
    this.templates = this.initializeTemplates();
  }
  
  initializeTemplates() {
    return {
      news: {
        medium: `Create a detailed news summary (300 words) with engaging visual formatting. 

IMPORTANT: Start directly with the first section. DO NOT add any introductory text like "Here's a news summary" or "This article discusses". Begin immediately with the formatted sections below.

📰 **Overview:** [2-3 sentences combining main points]

🎯 **Key Points:**
• [Most important fact]
• [Second most important fact]  
• [Third most important fact]

📖 **Context:** [2-3 sentences providing background]

💡 **Important Details:**
• [Important detail 1]
• [Important detail 2]

Use emojis and clear formatting for reader appeal. Start immediately with "📰 **Overview:**" without any preamble.`
      },
      blog: {
        medium: `Create a detailed blog summary (300 words) with engaging visual formatting.

IMPORTANT: Start directly with the first section. DO NOT add any introductory text like "Here's a blog summary" or "This post discusses". Begin immediately with the formatted sections below.

💭 **Main Argument:** [2-3 sentences: Core thesis and context]

🔑 **Supporting Points:**
• [Detailed explanation point 1]
• [Detailed explanation point 2]
• [Detailed explanation point 3]

👤 **Author's Stance:** [Positive/Negative/Neutral with reasoning]

Focus on argument structure and author's perspective. Start immediately with "💭 **Main Argument:**" without any preamble.`
      },
      youtube: {
        medium: `Create a detailed YouTube video summary (300 words) with engaging visual formatting.

IMPORTANT: Start directly with the first section. DO NOT add any introductory text like "Here's a video summary" or "This video discusses". Begin immediately with the formatted sections below.

🎥 **Video Title:** [The video title]

🎯 **Main Topic:** [What is the video about?]

✨ **Key Takeaways:**
• [Key point explained 1]
• [Key point explained 2]
• [Key point explained 3]

💬 **Host's Viewpoint:** [What position/opinion does the host take?]

Focus on actionable insights and main arguments. Start immediately with "🎥 **Video Title:**" without any preamble.`
      },
      generic: {
        medium: `Create a concise, visually appealing summary (300 words).

IMPORTANT: Start directly with the first section. DO NOT add any introductory text like "Here's a summary" or "This content discusses". Begin immediately with the formatted sections below.

📌 **Main Topic:** [What is this about?]

🔑 **Key Points:**
• [Main point 1]
• [Main point 2]
• [Main point 3]

📝 **Summary:** [Brief overview - 2-3 sentences]

Focus on the most important information with clear formatting. Start immediately with "📌 **Main Topic:**" without any preamble.`
      }
    };
  }
  
  classifyPageType(url, content) {
    // This is for summarization templates only - quick URL-based detection
    const urlLower = url.toLowerCase();
    
    // YouTube detection
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    }
    
    // News detection (for templates)
    if (urlLower.includes('/news/') || urlLower.includes('bbc.com') || 
        urlLower.includes('cnn.com') || urlLower.includes('reuters.com')) {
      return 'news';
    }
    
    // Blog detection (common blog paths)
    if (urlLower.includes('/blog/') || urlLower.includes('/article/') ||
        urlLower.includes('.medium.com') || urlLower.includes('.wordpress.com')) {
      return 'blog';
    }
    
    // Default
    return 'generic';
  }

  /**
   * AI-based content categorization - analyzes actual content, not just URL
   * Categories: news, blog, reference (wikipedia/docs), youtube (already detected), generic
   */
  async classifyPageCategory(url, content, summary, title) {
    const urlLower = url.toLowerCase();
    
    // YouTube is always YouTube based on URL
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return { category: 'youtube', confidence: 1.0, method: 'url' };
    }
    
    // Wikipedia and documentation sites - check URL first
    if (urlLower.includes('wikipedia.org') || urlLower.includes('wiki')) {
      return { category: 'reference', confidence: 0.95, method: 'url' };
    }
    
    // If we have summary and content, use AI to analyze the actual content
    const contentToAnalyze = summary || content?.substring(0, 1500) || title;
    if (!contentToAnalyze || contentToAnalyze.length < 50) {
      // Not enough content - use URL-based fallback
      return this.getUrlBasedCategory(url);
    }
    
    try {
      const prompt = `Analyze this web page content and categorize it into ONE of these categories based on the ACTUAL CONTENT (not the website domain):

URL: ${url}
Title: ${title || 'N/A'}
Content preview: ${contentToAnalyze}

Categories:
- **news**: Current events, breaking news, reports, journalism, factual reporting about recent events
- **blog**: Personal opinion, editorial, how-to guide, tutorial, personal thoughts, commentary
- **reference**: Encyclopedia article, documentation, technical reference, educational content, factual information
- **generic**: Everything else (social media, forums, e-commerce, etc.)

Important rules:
1. If it's on a news site (like bbc.com) but the content is a recipe, cooking blog, lifestyle article, or entertainment piece - categorize as "blog", NOT "news"
2. News must be about current events, factual reporting, journalism - not opinion pieces
3. Reference includes Wikipedia articles, technical docs, educational content
4. Blog includes opinion pieces, tutorials, personal experiences, guides

Respond with ONLY the category name: news, blog, reference, or generic

Category:`;
      
      const result = await this.answerQuestionWithFallback(prompt);
      if (result.success && result.answer) {
        const category = result.answer.trim().toLowerCase();
        // Validate category
        const validCategories = ['news', 'blog', 'reference', 'youtube', 'generic'];
        const matchedCategory = validCategories.find(cat => category.includes(cat) || cat.includes(category));
        
        if (matchedCategory && matchedCategory !== 'youtube') { // YouTube already handled by URL
          console.log(`[AIProviderManager] ✅ AI categorized as: ${matchedCategory} (from: ${category})`);
      return {
            category: matchedCategory, 
            confidence: 0.85, 
            method: 'ai',
            reasoning: `Content analysis determined this is ${matchedCategory} content`
          };
        }
      }
    } catch (error) {
      console.log('[AIProviderManager] AI categorization failed:', error.message);
    }
    
    // Fallback to URL-based
    return this.getUrlBasedCategory(url);
  }

  getUrlBasedCategory(url) {
    const urlLower = url.toLowerCase();
    
    // More specific URL patterns
    if (urlLower.includes('wikipedia.org') || urlLower.includes('/wiki/')) {
      return { category: 'reference', confidence: 0.9, method: 'url' };
    }
    
    if (urlLower.includes('/blog/') || urlLower.includes('/article/') || 
        urlLower.includes('.medium.com') || urlLower.includes('.wordpress.com') ||
        urlLower.includes('substack.com') || urlLower.includes('ghost.org')) {
      return { category: 'blog', confidence: 0.7, method: 'url' };
    }
    
    // News sites - but confidence is lower since content might not be news
    if (urlLower.includes('bbc.com') || urlLower.includes('cnn.com') || 
        urlLower.includes('reuters.com') || urlLower.includes('theguardian.com') ||
        urlLower.includes('nytimes.com') || urlLower.includes('/news/')) {
      return { category: 'news', confidence: 0.6, method: 'url', note: 'Content-based categorization recommended' };
    }
    
    return { category: 'generic', confidence: 0.5, method: 'url' };
  }

  async summarize(providerName, content, apiKey, url) {
    const provider = this.providers[providerName];
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);
    
    console.log(`[AIProviderManager] Summarizing with ${provider.name}`);
    
    // Classify page type and get template
    const pageType = this.classifyPageType(url, content);
    const template = this.templates[pageType]?.medium || this.templates.generic.medium;
    
    console.log(`[AIProviderManager] Page type: ${pageType}`);
    
    let requestBody;
    let requestUrl;
    
    // Use template-based prompt
    const prompt = `${template}\n\nArticle content:\n${content.substring(0, 20000)}`;
    
    if (providerName === 'gemini') {
      // Try each Gemini model in order
      for (const model of provider.models) {
        try {
          requestUrl = `${provider.endpoint}/${model}:generateContent?key=${apiKey}`;
          requestBody = {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          };
          
          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[AIProviderManager] ✅ Success with Gemini model: ${model}`);
            let summary = data.candidates[0].content.parts[0].text;
            // Clean up unwanted prefixes
            summary = this.cleanSummaryPrefix(summary);
            return summary;
          }
          
          console.log(`[AIProviderManager] ❌ Model ${model} failed: ${response.status}`);
    } catch (error) {
          console.log(`[AIProviderManager] ❌ Model ${model} error: ${error.message}`);
          continue;
        }
      }
      
      // All Gemini models failed
      throw new Error('All Gemini models failed');
    } else if (providerName === 'openai') {
      requestUrl = provider.endpoint;
      requestBody = {
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 1000
      };
    } else if (providerName === 'anthropic') {
      requestUrl = provider.endpoint;
      requestBody = {
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };
    }
    
    const headers = { 'Content-Type': 'application/json' };
    if (providerName === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (providerName === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      // Get error details if available
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || errorData.message || '';
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorDetails ? ' - ' + errorDetails : ''}`);
    }
    
    const data = await response.json();
    
    // Parse response based on provider
    let summary;
    if (providerName === 'gemini') {
      summary = data.candidates[0].content.parts[0].text;
    } else if (providerName === 'openai') {
      summary = data.choices[0].message.content;
    } else if (providerName === 'anthropic') {
      summary = data.content[0].text;
    } else {
      throw new Error('Unknown provider for response parsing');
    }
    
    // Clean up unwanted prefixes from all providers
    summary = this.cleanSummaryPrefix(summary);
    return summary;
  }
  
  cleanSummaryPrefix(summary) {
    if (!summary) return summary;
    
    // Remove common AI introductory phrases
    const prefixes = [
      /^Here's\s+(a|an)\s+[^:]+summary[^:]*:\s*/i,
      /^Here's\s+(a|an)\s+[^:]+based\s+on[^:]*:\s*/i,
      /^This\s+is\s+(a|an)\s+[^:]+summary[^:]*:\s*/i,
      /^Based\s+on\s+the\s+provided\s+[^:]+[:\s]*/i,
      /^Here's\s+(a|an)\s+[^:]+formatted\s+for[^:]*:\s*/i,
      /^Here's\s+(a|an)\s+[^:]+news\s+summary[^:]*:\s*/i,
      /^Here's\s+(a|an)\s+[^:]+article\s+summary[^:]*:\s*/i,
      /^Here's\s+(a|an)\s+[^:]+video\s+summary[^:]*:\s*/i,
      /^Here's\s+(a|an)\s+[^:]+blog\s+summary[^:]*:\s*/i,
      /^[^📰📌💭🎥🎯]*?(?=[📰📌💭🎥🎯\*])/, // Remove everything before first emoji or section marker
    ];
    
    let cleaned = summary;
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }
    
    // If the summary doesn't start with emoji or markdown header, find the first section
    if (!/^[📰📌💭🎥🎯\*\n]/.test(cleaned.trim())) {
      // Try to find the first actual section
      const firstSectionMatch = cleaned.match(/[📰📌💭🎥🎯]\s*\*\*[^*]+\*\*|\*\*[^*]+\*\*/);
      if (firstSectionMatch) {
        const firstSectionIndex = cleaned.indexOf(firstSectionMatch[0]);
        cleaned = cleaned.substring(firstSectionIndex);
      }
    }
    
    return cleaned.trim();
  }
  
  async summarizeWithFallback(content, url) {
    // Get enabled providers from storage
    const result = await chrome.storage.local.get(['ai_api_keys', 'ai_api_enabled']);
    const apiKeys = result.ai_api_keys || {};
    const enabled = result.ai_api_enabled || {};
    
    const providers = [
      { name: 'gemini', key: apiKeys.google || apiKeys.gemini, enabled: enabled.google || enabled.gemini },
      { name: 'openai', key: apiKeys.openai, enabled: enabled.openai },
      { name: 'anthropic', key: apiKeys.anthropic, enabled: enabled.anthropic }
    ].filter(p => p.enabled && p.key);
    
    console.log(`[AIProviderManager] Found ${providers.length} enabled providers`);
    
    // Try each provider in order
    for (const provider of providers) {
      try {
        console.log(`[AIProviderManager] Trying ${provider.name}...`);
        const summary = await this.summarize(provider.name, content, provider.key, url);
        console.log(`[AIProviderManager] ✅ Success with ${provider.name}`);
        return { success: true, summary, provider: provider.name };
      } catch (error) {
        console.log(`[AIProviderManager] ❌ ${provider.name} failed: ${error.message}`);
        // For 503 errors (Service Unavailable), log additional context
        if (error.message.includes('503')) {
          console.log(`[AIProviderManager] ⚠️ ${provider.name} is temporarily unavailable. This might be due to: rate limiting, temporary service outage, or API quota exceeded.`);
        }
        continue;
      }
    }
    
    // All providers failed, use extractive fallback
    console.log('[AIProviderManager] All providers failed, using extractive summarization');
    return { success: false, summary: this.extractiveSummary(content), provider: 'extractive' };
  }
  
  extractiveSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).join('. ') + '.';
  }
  
  async answerQuestion(providerName, prompt, apiKey) {
    const provider = this.providers[providerName];
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);
    
    console.log(`[AIProviderManager] Answering question with ${provider.name}`);
    
    let requestBody;
    let requestUrl;
    
    if (providerName === 'gemini') {
      // Try each Gemini model in order
      for (const model of provider.models) {
        try {
          requestUrl = `${provider.endpoint}/${model}:generateContent?key=${apiKey}`;
          requestBody = {
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          };
          
          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[AIProviderManager] ✅ Gemini model ${model} answered question`);
            let answer = data.candidates[0].content.parts[0].text;
            // Clean up answer
            answer = this.cleanQAAnswer(answer);
            return answer;
          }
          
          console.log(`[AIProviderManager] ❌ Model ${model} failed: ${response.status}`);
    } catch (error) {
          console.log(`[AIProviderManager] ❌ Model ${model} error: ${error.message}`);
          continue;
        }
      }
      
      // All Gemini models failed
      throw new Error('All Gemini models failed');
    } else if (providerName === 'openai') {
      requestUrl = provider.endpoint;
      requestBody = {
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 1000
      };
    } else if (providerName === 'anthropic') {
      requestUrl = provider.endpoint;
      requestBody = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };
    }
    
    const headers = { 'Content-Type': 'application/json' };
    if (providerName === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (providerName === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || errorData.message || '';
      } catch (e) {
        // Ignore JSON parse errors
      }
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}${errorDetails ? ' - ' + errorDetails : ''}`);
    }
    
    const data = await response.json();
    
    // Parse response based on provider
    let answer;
    if (providerName === 'gemini') {
      answer = data.candidates[0].content.parts[0].text;
    } else if (providerName === 'openai') {
      answer = data.choices[0].message.content;
    } else if (providerName === 'anthropic') {
      answer = data.content[0].text;
    } else {
      throw new Error('Unknown provider for response parsing');
    }
    
    // Clean up answer
    answer = this.cleanQAAnswer(answer);
    return answer;
  }
  
  async answerQuestionWithFallback(prompt) {
    // Get enabled providers from storage - same logic as summarizeWithFallback
    const result = await chrome.storage.local.get(['ai_api_keys', 'ai_api_enabled']);
    const apiKeys = result.ai_api_keys || {};
    const enabled = result.ai_api_enabled || {};
    
    const providers = [
      { name: 'gemini', key: apiKeys.google || apiKeys.gemini, enabled: enabled.google || enabled.gemini },
      { name: 'openai', key: apiKeys.openai, enabled: enabled.openai },
      { name: 'anthropic', key: apiKeys.anthropic, enabled: enabled.anthropic }
    ].filter(p => p.enabled && p.key);
    
    console.log(`[AIProviderManager] Found ${providers.length} enabled providers for Q&A`);
    
    // Try each provider in order
    for (const provider of providers) {
      try {
        console.log(`[AIProviderManager] Trying ${provider.name} for Q&A...`);
        const answer = await this.answerQuestion(provider.name, prompt, provider.key);
        console.log(`[AIProviderManager] ✅ Success with ${provider.name} for Q&A`);
        return { success: true, answer, provider: provider.name };
      } catch (error) {
        console.log(`[AIProviderManager] ❌ ${provider.name} Q&A failed: ${error.message}`);
        // For 503 errors (Service Unavailable), log additional context
        if (error.message.includes('503')) {
          console.log(`[AIProviderManager] ⚠️ ${provider.name} is temporarily unavailable for Q&A.`);
        }
        continue;
      }
    }
    
    // All providers failed
    console.log('[AIProviderManager] All providers failed for Q&A');
    return { success: false, answer: null, provider: 'none' };
  }
  
  cleanQAAnswer(answer) {
    if (!answer) return answer;
    
    let cleaned = answer;
    
    // Remove markdown bold/italic
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
    
    // Remove bullet points at start
    cleaned = cleaned.replace(/^[•\-\*]\s*/gm, '');
    
    // Remove template-style headers
    cleaned = cleaned.replace(/^[📰📌💭🎥🎯✨💡🔑👤💬📖]\s*/gm, '');
    cleaned = cleaned.replace(/^[\s\n]*(Main Topic|Key Points|Summary|Overview|Details|Context|Important Details|Key Facts|Key Takeaways|Output):[\s\n]*/gim, '');
    
    // Remove common AI prefixes
    cleaned = cleaned.replace(/^(Here's|Based on|In summary|To answer|The answer is|According to)[:\s]+/i, '');
    
    // Remove extra whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }
}

// Function to extract page content (injected into tabs)
function extractPageContent() {
  try {
    // Simple content extraction
    const title = document.title;
    const textContent = document.body.innerText || document.body.textContent || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    
    // Extract main content
    const article = document.querySelector('article') || 
                    document.querySelector('main') || 
                    document.querySelector('[role="main"]');
    
    const mainContent = article ? article.innerText : textContent;
    
    // Get images
    const images = Array.from(document.querySelectorAll('img'))
      .slice(0, 5)
      .map(img => img.src)
      .filter(src => src && !src.startsWith('data:'));
        
        return {
      title: title,
      content: mainContent.substring(0, 5000), // Limit content size
      summary: metaDescription || mainContent.substring(0, 200),
      images: images,
      category: 'generic',
      wordCount: mainContent.split(/\s+/).length
    };
    } catch (error) {
    console.error('Error extracting content:', error);
      return {
      title: document.title,
      content: '',
      summary: 'Failed to extract content',
      category: 'generic'
    };
  }
}

class TabSenseServiceWorker {
  constructor() {
    console.log('[TabSense] Service worker constructor called');
    this.aiProviderManager = new AIProviderManager();
    this.webSearchService = new WebSearchService();
    this.initialized = false;
    this.messageHandlers = new Map();
    this.processingTabs = new Set(); // Prevent duplicate concurrent processing per tabId
    this.youtubeProcessTimers = new Map(); // Debounce timers per tabId for YouTube navigations
    this.lastYouTubeProcessed = new Map(); // tabId -> { videoId, ts }
    this.qaSearchCache = new Map(); // QA external search cache
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    console.log('[TabSense] Setting up message handlers...');
    
    // Essential handlers
    this.messageHandlers.set('PING', this.handlePing.bind(this));
    this.messageHandlers.set('GET_STATUS', this.handleGetStatus.bind(this));
    
    // Archive handlers
    this.messageHandlers.set('GET_ARCHIVE_CONVERSATIONS', this.handleGetArchiveConversations.bind(this));
    this.messageHandlers.set('SAVE_CONVERSATION_TO_ARCHIVE', this.handleSaveConversationToArchive.bind(this));
    this.messageHandlers.set('UPDATE_CONVERSATION_MESSAGES', this.handleUpdateConversationMessages.bind(this));
    this.messageHandlers.set('DELETE_ARCHIVE_CONVERSATION', this.handleDeleteArchiveConversation.bind(this));
    
    // Tab handlers
    this.messageHandlers.set('GET_MULTI_TAB_COLLECTION', this.handleGetMultiTabCollection.bind(this));
    this.messageHandlers.set('CLEAR_MULTI_TAB_COLLECTION', this.handleClearMultiTabCollection.bind(this));
    this.messageHandlers.set('GET_ALL_TABS_DATA', this.handleGetAllTabsData.bind(this));
    
    // Data management
    this.messageHandlers.set('DATA_DELETE_SUMMARIES', this.handleDataDeleteSummaries.bind(this));
    this.messageHandlers.set('DATA_DELETE_CONVERSATIONS', this.handleDataDeleteConversations.bind(this));
    this.messageHandlers.set('DATA_CLEAR_ALL', this.handleDataClearAll.bind(this));
    this.messageHandlers.set('DATA_GET_STATS', this.handleDataGetStats.bind(this));
    
    // Cache management
    this.messageHandlers.set('CLEAR_CACHE', this.handleClearCache.bind(this));
    
    // AI handlers (placeholder implementations)
    this.messageHandlers.set('ANSWER_QUESTION', this.handleAnswerQuestion.bind(this));
    this.messageHandlers.set('SUMMARIZE_TEXT', this.handleSummarizeText.bind(this));
    this.messageHandlers.set('GENERATE_CONVERSATION_TITLE', this.handleGenerateConversationTitle.bind(this));
    this.messageHandlers.set('GENERATE_SUGGESTED_QUESTIONS', this.handleGenerateSuggestedQuestions.bind(this));
    
    // Processing handlers
    this.messageHandlers.set('PROCESS_ALL_TABS', this.handleProcessAllTabs.bind(this));
    
    // API management handlers
    this.messageHandlers.set('GET_API_STATUS', this.handleGetAPIStatus.bind(this));
    this.messageHandlers.set('INITIALIZE_APIS', this.handleInitializeAPIs.bind(this));
    this.messageHandlers.set('GET_API_KEYS', this.handleGetAPIKeys.bind(this));
    this.messageHandlers.set('SAVE_API_KEY', this.handleSaveAPIKey.bind(this));
    this.messageHandlers.set('DELETE_API_KEY', this.handleDeleteAPIKey.bind(this));
    this.messageHandlers.set('TOGGLE_API_ENABLED', this.handleToggleAPIEnabled.bind(this));
    this.messageHandlers.set('GET_API_ENABLED_STATES', this.handleGetAPIEnabledStates.bind(this));
    
    // Additional handlers
    this.messageHandlers.set('TAB_PROCESSED', this.handleTabProcessed.bind(this));
    this.messageHandlers.set('PAGE_DATA_EXTRACTED', this.handlePageDataExtracted.bind(this));
    this.messageHandlers.set('GET_CATEGORY_STATS', this.handleGetCategoryStats.bind(this));
    this.messageHandlers.set('ADAPTIVE_SUMMARIZE', this.handleAdaptiveSummarize.bind(this));
    this.messageHandlers.set('ENHANCE_CONTEXT', this.handleEnhanceContext.bind(this));
    
    // Data management additional handlers
    this.messageHandlers.set('DATA_RESET_SETTINGS', this.handleDataResetSettings.bind(this));
    this.messageHandlers.set('DATA_EXPORT_DATA', this.handleDataExportData.bind(this));
    this.messageHandlers.set('CHECK_CACHED_SUMMARIES', this.handleCheckCachedSummaries.bind(this));
    this.messageHandlers.set('GET_CACHED_SUMMARY_BY_URL', this.handleGetCachedSummaryByUrl.bind(this));
    
    // Tab operations
    this.messageHandlers.set('GET_TABS', this.handleGetTabs.bind(this));
    this.messageHandlers.set('PROCESS_TAB', this.handleProcessTab.bind(this));
    
    // Config handlers
    this.messageHandlers.set('GET_CONFIG', this.handleGetConfig.bind(this));
    this.messageHandlers.set('UPDATE_CONFIG', this.handleUpdateConfig.bind(this));
    
    // Advanced AI handlers
    this.messageHandlers.set('SUMMARIZE_MULTI_TAB', this.handleSummarizeMultiTab.bind(this));
    this.messageHandlers.set('ANSWER_MULTI_TAB_QUESTION', this.handleAnswerMultiTabQuestion.bind(this));
    this.messageHandlers.set('GET_EXTERNAL_CONTEXT', this.handleGetExternalContext.bind(this));
    this.messageHandlers.set('EXTRACT_DATA_FROM_URL', this.handleExtractDataFromUrl.bind(this));
    
    console.log('[TabSense] Message handlers set up:', this.messageHandlers.size);
  }

  async initialize() {
    console.log('[TabSense] Starting initialization...');
    
    // Create offscreen document for heavy processing
    await this.createOffscreenDocument();
    
    // Clear any stale tab data on startup
    try {
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      if (result.multi_tab_collection && result.multi_tab_collection.length > 0) {
        console.log('[TabSense] Found', result.multi_tab_collection.length, 'old tabs, keeping them');
      }
    } catch (error) {
      console.log('[TabSense] Error checking old tabs:', error.message);
    }
    
    // Setup Chrome listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const action = message.action || 'UNKNOWN';
      console.log('[TabSense] Received message:', action, 'Payload:', message);
      
      // Extract payload - support both payload object and flat message structure
      let payload = message.payload || {};
      if (Object.keys(payload).length === 0 && Object.keys(message).length > 1) {
        // Message is flat structure, remove action to get payload
        const { action: _, ...rest } = message;
        payload = rest;
      }
      
      const handler = this.messageHandlers.get(action);
      if (handler) {
        const result = handler(payload, sender);
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

    // Listen for tab updates to auto-process tabs, with YouTube-specific debounce
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const url = tab?.url || '';
      if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        return;
      }
      const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
      if (isYouTube) {
        // Debounce rapid updates in the same YouTube tab when navigating between videos
        const existingTimer = this.youtubeProcessTimers.get(tabId);
        if (existingTimer) clearTimeout(existingTimer);
        const timeout = setTimeout(() => {
          this.youtubeProcessTimers.delete(tabId);
          console.log('[TabSense] YouTube debounced process for tab:', tabId, url);
          this.autoProcessTab(tab);
        }, 1200);
        this.youtubeProcessTimers.set(tabId, timeout);
        return; // Avoid also triggering the generic path
      }

      if (changeInfo.status === 'complete') {
        console.log('[TabSense] Tab loaded, checking if should auto-process:', url);
        setTimeout(() => this.autoProcessTab(tab), 1000);
      }
    });

    this.initialized = true;
    console.log('[TabSense] Service worker initialized');
  }

  async createOffscreenDocument() {
    // Offscreen document not needed - summarization happens in service worker
    console.log('[TabSense] Skipping offscreen document - using service worker for summarization');
    return;
  }

  async autoProcessTab(tab) {
    try {
      console.log('[TabSense] Auto-processing tab:', tab.url);
      if (this.processingTabs.has(tab.id)) {
        console.log('[TabSense] Skipping - tab already processing:', tab.id);
        return;
      }
      this.processingTabs.add(tab.id);
      
      // Filter out unwanted pages
      const url = tab.url || '';
      
      // Don't process search engines, directory pages, authentication pages, or empty URLs
      if (url.includes('google.com/search') ||
          url.includes('bing.com/search') ||
          url.includes('duckduckgo.com/?q=') ||
          url.includes('yahoo.com/search') ||
          url.includes('accounts.google.com') ||
          url.includes('accounts.google.com/v3/signin') ||
          url.includes('accounts.google.com/signin') ||
          url.match(/\/category\/|\/archive\/|\/tag\/|\/tags\//) ||
          url.match(/bbc\.com\/(news|sport|culture)(?!\/[^\/]+\/)/)) {
        console.log('[TabSense] Skipping filtered URL:', url);
        return;
      }
      
      // YouTube: handle via API first (with caching), fallback to basic
      const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
      if (isYouTube) {
        console.log('[TabSense] YouTube detected. Routing to YouTube processor:', url);
        try {
          const ytResult = await this.processYouTubeTab(tab);
          if (ytResult) {
            // Broadcast to UI that a tab was processed
            this.broadcastMessage({ action: 'TAB_AUTO_PROCESSED', data: ytResult });
            return;
          }
        } catch (ytErr) {
          console.warn('[TabSense] YouTube processing failed, falling back to generic:', ytErr?.message);
        }
      }

      // Inject content script and get page data (non-YouTube or fallback)
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageContent
        });
        
        const extractedData = results[0]?.result || {};
        console.log('[TabSense] Extracted data:', { 
          hasContent: !!extractedData.content, 
          contentLength: extractedData.content?.length || 0,
          title: extractedData.title
        });
        
        // Generate adaptive summary using service worker AdaptiveSummarizer
        let summary = extractedData.summary || 'Content extracted';
        
        // Only try adaptive summarization if we have actual content
        if (extractedData.content && extractedData.content.length > 100) {
          try {
            console.log('[TabSense] Calling adaptive summarizer with content length:', extractedData.content.length);
            
            // Try AI summarization with fallback
            console.log('[TabSense] Attempting AI summarization...');
            const aiResult = await this.aiProviderManager.summarizeWithFallback(
              extractedData.content.substring(0, 10000),
              tab.url
            );
            
            if (aiResult.success) {
              summary = aiResult.summary;
              console.log(`[TabSense] ✅ AI summary from ${aiResult.provider}`);
            } else {
              summary = aiResult.summary;
              console.log('[TabSense] ⚠️ Using extractive fallback');
            }
          } catch (summaryError) {
            console.error('[TabSense] Adaptive summary failed:', summaryError);
            // Fallback to basic summarization
            const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
            summary = sentences.slice(0, 3).join('. ') + '.';
          }
        } else {
          console.log('[TabSense] Skipping adaptive summary - insufficient content');
        }
        
        // AI-based content categorization after summary is generated
        let finalCategory = 'generic';
        let categoryConfidence = 0.5;
        try {
          console.log('[TabSense] Analyzing content for smart categorization...');
          const categoryResult = await this.aiProviderManager.classifyPageCategory(
            tab.url,
            extractedData.content,
            summary,
            extractedData.title || tab.title
          );
          finalCategory = categoryResult.category || 'generic';
          categoryConfidence = categoryResult.confidence || 0.5;
          console.log(`[TabSense] ✅ Content categorized as: ${finalCategory} (confidence: ${categoryConfidence}, method: ${categoryResult.method})`);
        } catch (categoryError) {
          console.log('[TabSense] Category analysis failed, using fallback:', categoryError.message);
          // Use URL-based fallback
          const urlBased = this.aiProviderManager.getUrlBasedCategory(tab.url);
          finalCategory = urlBased.category;
          categoryConfidence = urlBased.confidence;
        }
        
        // Store tab data - use URL as id for uniqueness
        const tabData = {
          id: `${tab.url}-${Date.now()}`,
          tabId: tab.id, // Store original Chrome tab ID
          title: extractedData.title || tab.title || 'Untitled',
          url: tab.url,
          content: extractedData.content || `Content from ${tab.title || tab.url}`,
          summary: summary,
          category: finalCategory,
          categoryConfidence: categoryConfidence,
          processed: true,
          timestamp: Date.now()
        };
        
        // Get existing tabs and add this one
        const result = await chrome.storage.local.get(['multi_tab_collection']);
        const existingTabs = result.multi_tab_collection || [];
        
        // Improved duplicate check: Check URL + title, and only skip if processed recently (within 5 minutes)
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Find existing tab with same URL
        const existingIndex = existingTabs.findIndex(t => t.url === tab.url);
      
      if (existingIndex >= 0) {
          const existingTab = existingTabs[existingIndex];
          const isSameTitle = existingTab.title === tabData.title;
          const wasProcessedRecently = existingTab.timestamp && existingTab.timestamp > fiveMinutesAgo;
          
          // Only skip if it's the same title AND was processed recently
          if (isSameTitle && wasProcessedRecently) {
            console.log('[TabSense] Skipping duplicate tab (same URL + title processed recently):', tab.url);
            return;
          }
          
          // Update existing tab if different title or stale
          console.log('[TabSense] Updating existing tab (different title or stale):', tab.url);
          existingTabs[existingIndex] = tabData;
      } else {
          // Add new tab
          console.log('[TabSense] Adding new tab:', tab.url);
          existingTabs.push(tabData);
        }
        
        await chrome.storage.local.set({ multi_tab_collection: existingTabs });
        console.log('[TabSense] Tab auto-processed and stored:', tab.url);
        
        // Broadcast to UI that a tab was processed
        this.broadcastMessage({
          action: 'TAB_AUTO_PROCESSED',
          data: tabData
        });
    } catch (error) {
        console.error('[TabSense] Error extracting content from tab:', error);
      }
    } catch (error) {
      console.error('[TabSense] Error auto-processing tab:', error);
    }
  }

  broadcastMessage(message) {
    console.log('[TabSense] Broadcasting message:', message.action);
    try {
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors if no listeners
      });
    } catch (error) {
      console.log('[TabSense] No listeners for broadcast message:', error.message);
    }
  }

  // ==================== YouTube Helpers ====================
  normalizeYouTubeUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      // Force standard watch URL with only the v param
      // Handle youtu.be short links
      if (u.hostname === 'youtu.be') {
        const vid = u.pathname.replace(/^\//, '');
        if (vid) {
          return `https://www.youtube.com/watch?v=${vid}`;
        }
      }
      // For youtube.com/*, keep only v
      if (u.hostname.includes('youtube.com')) {
        // If it's an embed URL, convert to watch
        if (u.pathname.startsWith('/embed/')) {
          const vid = u.pathname.split('/embed/')[1]?.split('/')[0];
          if (vid) return `https://www.youtube.com/watch?v=${vid}`;
        }
        const v = u.searchParams.get('v');
        if (v) {
          return `https://www.youtube.com/watch?v=${v}`;
        }
      }
      // Fallback to raw URL without hash/query noise
      u.hash = '';
      return u.toString();
    } catch {
      return rawUrl;
    }
  }
  async getYouTubeAPIKey() {
    try {
      const result = await chrome.storage.local.get(['tabsense_api_keys', 'other_api_keys', 'ai_api_keys', 'youtube_api_key']);
      const fromTabsense = result.tabsense_api_keys?.youtube || '';
      const fromOther = result.other_api_keys?.youtube || '';
      const fromAi = result.ai_api_keys?.youtube || '';
      const fromLegacy = result.youtube_api_key || '';
      const key = fromTabsense || fromOther || fromAi || fromLegacy || '';
      const source = fromTabsense ? 'tabsense_api_keys.youtube' : fromOther ? 'other_api_keys.youtube' : fromAi ? 'ai_api_keys.youtube' : fromLegacy ? 'youtube_api_key' : 'none';
      console.log('[YouTube] API key present:', Boolean(key), 'source:', source);
      return key;
    } catch (e) {
      return '';
    }
  }

  extractYouTubeVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const m = url.match(pattern);
      if (m) return m[1];
    }
    return null;
  }

  async getYouTubeCache(videoId) {
    const key = `tabSense_cache_youtube_${videoId}`;
    const res = await chrome.storage.local.get([key]);
    return res[key] || null;
  }

  async setYouTubeCache(videoId, data) {
    const key = `tabSense_cache_youtube_${videoId}`;
    const value = { data, timestamp: Date.now() };
    await chrome.storage.local.set({ [key]: value });
  }

  async fetchYouTubeAPI(videoId, apiKey, { commentsLimit = 150 } = {}) {
    const base = 'https://www.googleapis.com/youtube/v3';
    console.log('[YouTube] Starting API fetch for video:', videoId, 'commentsLimit:', commentsLimit);
    // Video details
    const videoUrl = `${base}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error(`YouTube videos API error: ${videoResp.status}`);
    const videoJson = await videoResp.json();
    const video = videoJson.items?.[0];
    if (!video) throw new Error('YouTube video not found');
    console.log('[YouTube] Video details fetched:', {
      title: video?.snippet?.title,
      channelId: video?.snippet?.channelId,
      views: video?.statistics?.viewCount,
      comments: video?.statistics?.commentCount
    });

    // Channel info
    const channelId = video.snippet.channelId;
    let channel = null;
    try {
      const chUrl = `${base}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
      const chResp = await fetch(chUrl);
      if (chResp.ok) {
        const chJson = await chResp.json();
        channel = chJson.items?.[0] || null;
      }
    } catch {}
    if (channel) {
      console.log('[YouTube] Channel info fetched:', {
        title: channel?.snippet?.title,
        subscribers: channel?.statistics?.subscriberCount
      });
    }

    // Comments (paginate until limit or no nextPage)
    const comments = [];
    let pageToken = '';
    while (comments.length < commentsLimit) {
      const remain = commentsLimit - comments.length;
      const maxResults = Math.min(100, remain);
      const cmUrl = `${base}/commentThreads?part=snippet,replies&videoId=${videoId}&order=relevance&maxResults=${maxResults}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const cmResp = await fetch(cmUrl);
      if (!cmResp.ok) break;
      const cmJson = await cmResp.json();
      (cmJson.items || []).forEach(item => {
        const s = item.snippet?.topLevelComment?.snippet;
        if (!s) return;
        comments.push({
          id: item.id,
          text: s.textDisplay || s.textOriginal || '',
          author: s.authorDisplayName,
          authorChannelId: s.authorChannelId?.value,
          likeCount: s.likeCount || 0,
          publishedAt: s.publishedAt,
          replyCount: item.snippet?.totalReplyCount || 0
        });
      });
      pageToken = cmJson.nextPageToken || '';
      console.log('[YouTube] Comments page fetched:', {
        fetched: cmJson.items?.length || 0,
        totalAccumulated: comments.length,
        hasNext: Boolean(pageToken)
      });
      if (!pageToken) break;
    }
    console.log('[YouTube] Finished fetching comments. Total:', comments.length);

    return {
      video: {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description || '',
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || '0', 10),
        likeCount: parseInt(video.statistics.likeCount || '0', 10),
        commentCount: parseInt(video.statistics.commentCount || '0', 10),
        tags: video.snippet.tags || [],
        thumbnails: video.snippet.thumbnails
      },
      channel: channel ? {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description || '',
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
        videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
        viewCount: parseInt(channel.statistics?.viewCount || '0', 10)
      } : null,
      comments
    };
  }

  // Simple sentiment analysis for comment text using keyword heuristics
  analyzeYouTubeComments(comments) {
    if (!Array.isArray(comments) || comments.length === 0) {
      return {
        total: 0,
        counts: { positive: 0, negative: 0, neutral: 0 },
        percentages: { positive: 0, negative: 0, neutral: 0 },
        representatives: { positive: [], negative: [], neutral: [] }
      };
    }
    const positiveWords = new Set([
      'great','good','amazing','excellent','love','loved','like','liked','awesome','fantastic','brilliant','hilarious','funny','well done','nice','smart','clever','insightful','agree','agreeing','accurate','right','true','genius','support','win','best','lol','lmao'
    ]);
    const negativeWords = new Set([
      'bad','terrible','awful','hate','hated','dislike','disliked','stupid','idiot','dumb','worst','nonsense','false','wrong','lie','lying','trash','cringe','cringy','angry','disgusting','corrupt','shame','pathetic'
    ]);
    const classify = (text) => {
      const t = (text || '').toLowerCase();
      let pos = 0, neg = 0;
      for (const w of positiveWords) { if (t.includes(w)) pos++; }
      for (const w of negativeWords) { if (t.includes(w)) neg++; }
      const score = pos - neg;
      if (score > 1) return { label: 'positive', score };
      if (score < -1) return { label: 'negative', score };
      return { label: 'neutral', score };
    };
    const buckets = { positive: [], negative: [], neutral: [] };
    comments.forEach(c => {
      const { label, score } = classify(c.text || '');
      buckets[label].push({ ...c, _score: score });
    });
    const total = comments.length;
    const counts = {
      positive: buckets.positive.length,
      negative: buckets.negative.length,
      neutral: buckets.neutral.length
    };
    const toPct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    const percentages = {
      positive: toPct(counts.positive),
      negative: toPct(counts.negative),
      neutral: toPct(counts.neutral)
    };
    // Representatives: pick top liked per bucket
    const byLikes = arr => arr.sort((a,b) => (b.likeCount||0) - (a.likeCount||0));
    const representatives = {
      positive: byLikes(buckets.positive).slice(0, 3).map(c => ({ author: c.author, text: c.text, likeCount: c.likeCount })),
      negative: byLikes(buckets.negative).slice(0, 3).map(c => ({ author: c.author, text: c.text, likeCount: c.likeCount })),
      neutral: byLikes(buckets.neutral).slice(0, 3).map(c => ({ author: c.author, text: c.text, likeCount: c.likeCount }))
    };
    return { total, counts, percentages, representatives };
  }

  extractYouTubeCommentThemes(comments) {
    if (!Array.isArray(comments) || comments.length === 0) return [];
    const stop = new Set([
      'the','a','an','and','or','but','so','of','to','in','on','for','with','this','that','is','are','was','were','it','as','at','be','by','from','about','we','you','they','i','me','my','our','your','their','he','she','his','her','them','us','not','have','has','had','do','did','does','been','will','would','can','could','should','if','then','than','there','here','just','also','more','most','some','any','very','into','over','under','out','up','down','what','which','who','when','where','why','how','because','however','while','like','get','got','makes','make','made','new','one','two','video','youtube','vox','bbc','daily','show','trump','xi','china','chinese','people'
    ]);
    const freq = new Map();
    const add = (w) => {
      if (!w || w.length < 3) return;
      if (stop.has(w)) return;
      const v = freq.get(w) || 0;
      freq.set(w, v + 1);
    };
    comments.forEach(c => {
      const text = (c.text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      text.split(/\s+/).forEach(add);
    });
    const top = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([w]) => w);
    return top;
  }

  buildYouTubeContent(youtubeData, url) {
    const { video, channel, comments } = youtubeData;
    const lines = [];
    // Adapted template (with emojis) aligned to our identity
    lines.push(`🎥 **Video Title:** ${video.title}`);
    lines.push('');
    lines.push('🎯 **Overview:**');
    lines.push('[Write 2-3 concise, conversational sentences. No filler. Focus on what the video covers and why it matters.]');
    lines.push('');
    lines.push('✨ **Key Takeaways:**');
    lines.push('[Provide 4-6 specific, non-redundant bullets. Each 1-2 sentences. Focus on concrete insights, not generic statements.]');
    lines.push('• ');
    lines.push('• ');
    lines.push('• ');
    lines.push('• ');
    lines.push('• ');
    lines.push('• ');
    lines.push('');
    lines.push('💬 **Host\'s Viewpoint:**');
    lines.push('[Capture the host\'s stance/tone in 1-2 sentences (e.g., neutral, critical, supportive) and how it frames the topic.]');
    lines.push('');
    lines.push('📊 **Sentiment Breakdown:**');
    lines.push('');
    if (comments && comments.length > 0) {
      // Sentiment overview block
      try {
        const insights = this.analyzeYouTubeComments(comments);
        // Percentages under Sentiment Breakdown
        lines.push(`• **Positive (${insights.percentages.positive}%)** – [Brief description of positive themes]`);
        lines.push(`• **Negative (${insights.percentages.negative}%)** – [Brief description of negative themes]`);
        lines.push(`• **Neutral/Mixed (${insights.percentages.neutral}%)** – [Brief description of neutral themes]`);
        lines.push('');
        lines.push('🧩 **Argument Themes:**');
        lines.push('[List 3-6 cohesive themes from the comments. For each, write a short explanation and, where helpful, reference a representative idea or quote.]');
        const themeHints = this.extractYouTubeCommentThemes(comments);
        if (themeHints.length > 0) {
          themeHints.slice(0, 6).forEach(h => {
            const label = h.charAt(0).toUpperCase() + h.slice(1);
            lines.push(`• **${label}:** [Brief description]`);
          });
        }
        lines.push('');
        lines.push('🗣️ **Representative Comments:**');
        lines.push('[Show a few high-signal quotes that illustrate the themes, including usernames and like counts.]');
        const rep = insights.representatives;
        const pick = (arr) => arr.slice(0, 2).map(c => {
          const likeStr = c.likeCount ? ` (${c.likeCount} likes)` : '';
          const user = c.author || 'user';
          const text = (c.text || '').replace(/\n+/g, ' ').substring(0, 240);
          return `• \"${text}\" – @${user}${likeStr}`;
        });
        pick(rep.positive).forEach(line => lines.push(line));
        pick(rep.negative).forEach(line => lines.push(line));
        if (rep.neutral.length > 0 && (rep.positive.length + rep.negative.length) < 3) {
          lines.push(pick(rep.neutral)[0]);
        }
        lines.push('');
      } catch {}
      // Keep a truncated list to ground QA, but shorter to avoid truncation
      lines.push('TOP COMMENTS (truncated):');
      comments.slice(0, 40).forEach((c, idx) => {
        const likeStr = c.likeCount ? ` (${c.likeCount} likes)` : '';
        lines.push(`${idx + 1}. [${c.author}] ${c.text.replace(/\n+/g, ' ').substring(0, 400)}${likeStr}`);
      });
      lines.push('');
    }
    // External Context and Insight sections
    lines.push('🌐 **External Context:**');
    lines.push('[If external context is available, add 1-2 sentences that clarify background or recent developments relevant to the video.]');
    lines.push('');
    lines.push('🧠 **Insight:**');
    lines.push('[In 2-3 sentences, synthesize what the video says + how the audience reacted. Provide a concrete takeaway or implication. This is the final section.]');
    lines.push('');
    return lines.join('\n');
  }

  async processYouTubeTab(tab) {
    const originalUrl = tab.url;
    const canonicalUrl = this.normalizeYouTubeUrl(originalUrl);
    const videoId = this.extractYouTubeVideoId(canonicalUrl);
    console.log('[YouTube] processYouTubeTab()', { originalUrl, canonicalUrl, videoId });
    if (!videoId) return null;

    // Skip if the same video was processed on this tab very recently
    const recent = this.lastYouTubeProcessed.get(tab.id);
    if (recent && recent.videoId === videoId && (Date.now() - recent.ts) < 10000) {
      console.log('[YouTube] Skipping duplicate processing (recent) for tab:', tab.id, 'video:', videoId);
      return null;
    }

    const apiKey = await this.getYouTubeAPIKey();
    let youtubeData = null;

    // Cache: 6 hours TTL
    const ttlMs = 6 * 60 * 60 * 1000;
    if (apiKey) {
      const cached = await this.getYouTubeCache(videoId);
      if (cached && (Date.now() - cached.timestamp) < ttlMs) {
        youtubeData = cached.data;
        console.log('[YouTube] Using cached data for', videoId, 'comments:', youtubeData?.comments?.length || 0);
      } else {
        try {
          console.log('[YouTube] Cache miss or expired. Fetching fresh data for', videoId);
          youtubeData = await this.fetchYouTubeAPI(videoId, apiKey, { commentsLimit: 150 });
          await this.setYouTubeCache(videoId, youtubeData);
          console.log('[YouTube] API data fetched and cached:', {
            title: youtubeData?.video?.title,
            comments: youtubeData?.comments?.length || 0
          });
        } catch (e) {
          console.warn('[YouTube] API fetch failed:', e?.message);
        }
      }
    }

    let content = '';
    let summary = '';
    let title = tab.title || 'YouTube Video';

    if (youtubeData) {
      content = this.buildYouTubeContent(youtubeData, canonicalUrl);
      console.log('[YouTube] Built structured content. Comments included:', youtubeData?.comments?.length || 0);
      try {
        const previewLines = content.split('\n').slice(0, 6);
        console.log('[YouTube] Structured content preview:', previewLines);
      } catch {}
      try {
        const aiResult = await this.aiProviderManager.summarizeWithFallback(
          content,
          canonicalUrl
        );
        summary = aiResult.summary;
        console.log('[YouTube] Summary generated. length:', summary?.length || 0);
      } catch (e) {
        console.warn('[YouTube] Summarization failed, using description fallback');
        summary = youtubeData.video?.description?.substring(0, 300) || 'YouTube video';
      }
      title = youtubeData.video?.title || title;
    } else {
      // Fallback when no API key: basic extraction for title
      console.warn('[YouTube] No API key or API failed. Using basic extraction for title only.');
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.title
        });
        title = results?.[0]?.result || title;
      } catch {}
      content = `VIDEO TITLE: ${title}\nURL: ${canonicalUrl}`;
      try {
        const aiResult = await this.aiProviderManager.summarizeWithFallback(
          content,
          canonicalUrl
        );
        summary = aiResult.summary;
        console.log('[YouTube] Summary generated (basic). length:', summary?.length || 0);
      } catch {
        summary = title;
      }
    }

    // Prepare persisted object, but reuse existing ID if we already stored this video before
    const result = await chrome.storage.local.get(['multi_tab_collection']);
    const existingTabs = result.multi_tab_collection || [];
    const existingIndex = existingTabs.findIndex(t => {
      // Match by canonical URL equality or by videoId extracted from existing record
      const existingVid = this.extractYouTubeVideoId(t.url || '');
      return (t.url === canonicalUrl) || (existingVid && existingVid === videoId);
    });

    const now = Date.now();
    const stableId = `yt-${videoId}`;
    const existingId = existingIndex !== -1 ? existingTabs[existingIndex].id : stableId;
    const tabData = {
      id: existingId,
      tabId: tab.id,
      title,
      url: canonicalUrl,
      content,
      summary,
      category: 'youtube',
      categoryConfidence: 1.0,
      youtubeData: youtubeData || null,
      processed: true,
      timestamp: now
    };

    // Persist into collection with de-duplication for same video
    if (existingIndex !== -1) {
      existingTabs[existingIndex] = tabData;
      console.log('[YouTube] Updated existing entry for video:', videoId);
    } else {
      existingTabs.push(tabData);
      console.log('[YouTube] Added new entry for video:', videoId);
    }
    await chrome.storage.local.set({ multi_tab_collection: existingTabs });
    this.lastYouTubeProcessed.set(tab.id, { videoId, ts: Date.now() });
    console.log('[TabSense] YouTube tab processed and stored:', canonicalUrl);
    return tabData;
  }

  async handlePing(payload, sender) {
    console.log('[TabSense] PING received');
          return {
            success: true,
            data: {
        pong: true, 
      timestamp: Date.now(),
        initialized: this.initialized 
      }
    };
  }

  async handleGetStatus(payload, sender) {
    console.log('[TabSense] GET_STATUS received');
        return {
          success: true,
            data: {
        status: 'ready',
      initialized: this.initialized,
        handlers: Array.from(this.messageHandlers.keys())
      }
    };
  }

  async handleGetArchiveConversations(payload, sender) {
    console.log('[TabSense] GET_ARCHIVE_CONVERSATIONS received');
    try {
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      console.log('[TabSense] Found conversations:', conversations.length);
      return { success: true, data: { conversations } };
    } catch (error) {
      console.error('[TabSense] Error getting conversations:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSaveConversationToArchive(payload, sender) {
    console.log('[TabSense] SAVE_CONVERSATION_TO_ARCHIVE received');
    try {
      const { title, messages } = payload || {};
      
      if (!title || !messages) {
        return { success: false, error: 'Title and messages are required' };
      }
      
      const conversationId = `conv-${Date.now()}`;
      
      // Extract tab metadata from first message if it exists
      const firstMessage = messages[0];
      const tabId = firstMessage?.tabId;
      const tabUrl = firstMessage?.tabUrl;
      const tabTitle = firstMessage?.tabTitle;
      const tabSummary = firstMessage?.tabSummary || firstMessage?.content; // Store summary for context
      const tabCategory = firstMessage?.tabCategory || 'generic';
      
      // Clean the first message to remove metadata fields (they're not part of the actual message structure)
      const cleanedMessages = messages.map(msg => {
        const { tabId, tabUrl, tabTitle, tabSummary, tabCategory, ...cleanMsg } = msg;
        return cleanMsg;
      });
      
      const conversation = {
        id: conversationId,
        title,
        messages: cleanedMessages,
        // Store full context for Q&A to work independently
        tabId, // Store tab ID for future lookups
        tabUrl,
        tabTitle,
        tabSummary, // Store summary so Q&A works without original tab
        tabCategory, // Store category for suggested questions
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      conversations.unshift(conversation);
      await chrome.storage.local.set({ archive_conversations: conversations });
      
      console.log('[TabSense] Saved conversation to archive:', title, tabId ? `(tabId: ${tabId})` : '');
      return { success: true, data: { conversationId } };
    } catch (error) {
      console.error('[TabSense] Error saving conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async handleUpdateConversationMessages(payload, sender) {
    console.log('[TabSense] UPDATE_CONVERSATION_MESSAGES received');
    try {
      const { title, messages, conversationId, suggestedQuestions } = payload || {};
      
      if (!messages) {
        return { success: false, error: 'Messages are required' };
      }
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      
      // Find conversation by ID (preferred) or by title (fallback for backwards compatibility)
      let conversationIndex = -1;
      if (conversationId) {
        conversationIndex = conversations.findIndex(c => c.id === conversationId);
        console.log('[TabSense] Looking for conversation by ID:', conversationId, 'found:', conversationIndex !== -1);
      }
      
      // Fallback to title-based lookup if ID not provided or not found
      if (conversationIndex === -1 && title) {
        conversationIndex = conversations.findIndex(c => c.title === title);
        console.log('[TabSense] Looking for conversation by title:', title, 'found:', conversationIndex !== -1);
      }
      
      if (conversationIndex !== -1) {
        // Update existing conversation with new messages and title (if provided)
        // Preserve existing metadata (tabId, tabUrl, tabTitle, tabSummary, tabCategory)
        conversations[conversationIndex].messages = messages;
        
        // Only update title if:
        // 1. A title is provided
        // 2. It's different from the existing one
        // 3. It's NOT a fallback/placeholder title (to prevent overwriting good titles with bad ones)
        const isFallbackTitle = title && (
          title.trim() === 'Conversation' ||
          title.trim().startsWith(' Key Points:') ||
          title.trim().startsWith('Key Points:') ||
          title.trim().length < 5 ||
          /^[📰📌💭🎥🎯]\s*$/.test(title.trim()) // Just an emoji
        );
        
        if (title && title !== conversations[conversationIndex].title && !isFallbackTitle) {
          console.log('[TabSense] Updating conversation title from:', conversations[conversationIndex].title, 'to:', title);
          conversations[conversationIndex].title = title;
        } else if (isFallbackTitle) {
          console.log('[TabSense] Skipping title update - provided title is a fallback/placeholder:', title);
        }
        if (suggestedQuestions && Array.isArray(suggestedQuestions) && suggestedQuestions.length > 0) {
          conversations[conversationIndex].suggestedQuestions = suggestedQuestions;
          console.log('[TabSense] Updated suggested questions for conversation');
        }
        conversations[conversationIndex].updatedAt = new Date().toISOString();
        
        // Extract and preserve tab context from messages if provided (for backward compatibility)
        const firstMessage = messages[0];
        if (firstMessage?.tabSummary && !conversations[conversationIndex].tabSummary) {
          conversations[conversationIndex].tabSummary = firstMessage.tabSummary;
        }
        if (firstMessage?.tabCategory && !conversations[conversationIndex].tabCategory) {
          conversations[conversationIndex].tabCategory = firstMessage.tabCategory;
        }
        
        await chrome.storage.local.set({ archive_conversations: conversations });
        console.log('[TabSense] ✅ Updated conversation:', title || conversations[conversationIndex].title);
        return { success: true };
      } else {
        console.log('[TabSense] Conversation not found, creating new one');
        // Create new conversation if not found
        const newConversationId = conversationId || `conv-${Date.now()}`;
        const conversation = {
          id: newConversationId,
          title: title || 'Conversation',
          messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (suggestedQuestions && Array.isArray(suggestedQuestions) && suggestedQuestions.length > 0) {
          conversation.suggestedQuestions = suggestedQuestions;
        }
        conversations.unshift(conversation);
        await chrome.storage.local.set({ archive_conversations: conversations });
        console.log('[TabSense] ✅ Created new conversation:', conversation.title);
        return { success: true, data: { conversationId: newConversationId } };
      }
    } catch (error) {
      console.error('[TabSense] Error updating conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDeleteArchiveConversation(payload, sender) {
    console.log('[TabSense] DELETE_ARCHIVE_CONVERSATION received');
    try {
      const { id, conversationId } = payload || {};
      const targetId = conversationId || id;
      console.log('[TabSense] Deleting conversation with id:', targetId);
      
      const result = await chrome.storage.local.get(['archive_conversations']);
      const conversations = result.archive_conversations || [];
      const beforeCount = conversations.length;
      
      const filtered = conversations.filter(c => c.id !== targetId);
      const afterCount = filtered.length;
      
      console.log('[TabSense] Conversations before:', beforeCount, 'after:', afterCount);
      
      await chrome.storage.local.set({ archive_conversations: filtered });
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetMultiTabCollection(payload, sender) {
    console.log('[TabSense] GET_MULTI_TAB_COLLECTION received');
    try {
      const result = await chrome.storage.local.get(['multi_tab_collection']);
      const collection = result.multi_tab_collection || [];
      console.log('[TabSense] Retrieved multi_tab_collection:', collection.length, 'items');
      console.log('[TabSense] Collection data:', collection);
      // Return with 'tabs' key that sidebar expects
      return { success: true, data: { tabs: collection } };
      } catch (error) {
      console.error('[TabSense] Error getting collection:', error);
      return { success: false, error: error.message };
    }
  }

  async handleClearMultiTabCollection(payload, sender) {
    console.log('[TabSense] CLEAR_MULTI_TAB_COLLECTION received');
    try {
      await chrome.storage.local.remove(['multi_tab_collection']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error clearing collection:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAllTabsData(payload, sender) {
    console.log('[TabSense] GET_ALL_TABS_DATA received');
    try {
      const result = await chrome.storage.local.get(['processed_tabs']);
      return { success: true, data: { tabs: result.processed_tabs || [] } };
    } catch (error) {
      console.error('[TabSense] Error getting tabs data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataDeleteSummaries(payload, sender) {
    console.log('[TabSense] DATA_DELETE_SUMMARIES received');
    try {
      // Remove all summary-related storage keys
      await chrome.storage.local.remove([
        'tab_summaries',
        'processed_tabs',
        'multi_tab_collection'
      ]);
      console.log('[TabSense] Deleted all summaries and tab data');
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting summaries:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataDeleteConversations(payload, sender) {
    console.log('[TabSense] DATA_DELETE_CONVERSATIONS received');
    try {
      await chrome.storage.local.remove(['archive_conversations']);
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error deleting conversations:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataClearAll(payload, sender) {
    console.log('[TabSense] DATA_CLEAR_ALL received');
    try {
      await chrome.storage.local.clear();
      return { success: true };
        } catch (error) {
      console.error('[TabSense] Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataGetStats(payload, sender) {
    console.log('[TabSense] DATA_GET_STATS received');
    try {
      const allData = await chrome.storage.local.get();
      const dataSize = JSON.stringify(allData).length;

      return {
        success: true,
        data: {
          stats: {
            summaries: allData.multi_tab_collection?.length || 0,
            conversations: allData.archive_conversations?.length || 0,
            settings: 1, // There's always at least a config object
            totalSize: this.formatBytes(dataSize)
          },
          metadata: {
            totalItems: Object.keys(allData).length,
            totalSize: dataSize,
            totalSizeFormatted: this.formatBytes(dataSize),
            lastUpdated: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting stats:', error);
      return { success: false, error: error.message };
    }
  }

  async handleClearCache(payload, sender) {
    console.log('[TabSense] CLEAR_CACHE received');
    try {
      // Remove only cache keys (those with cachePrefix)
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData).filter(key => key.startsWith('tabSense_cache_'));
      
      await chrome.storage.local.remove(cacheKeys);
      console.log('[TabSense] Cleared cache keys:', cacheKeys.length);
      return { success: true, data: { clearedKeys: cacheKeys.length } };
    } catch (error) {
      console.error('[TabSense] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==================== QA Formatting Utilities ====================
  cleanMarkdown(text) {
    try {
      if (!text) return text;
      let out = text;
  
      // 🚫 Remove metadata tokens like "Document", "Context", "Claim Source"
      out = out.replace(/\b(Document|Context|Claim Source)\b\.?/gi, '');
  
      // 🔤 Fix broken lines: "word\nword" → "word word"
      out = out.replace(/(\w)\s*\n\s*(\w)/g, '$1 $2');
  
      // 📋 Normalize bullet styles
      out = out.replace(/•\s*/g, '• ');
      out = out.replace(/^(?:\s*[-*]\s+)/gm, '• ');
      out = out.replace(/^\s*\d+\.\s+/gm, '• ');
  
      // 📎 Join broken lines inside bullets
      out = out.replace(/• ([^\n]+)\n(?!•)/g, '• $1 ');
  
      // ✨ Clean bullet artifacts (e.g., "• ." or empty bullets)
      out = out.replace(/•\s*\./g, '•');
      out = out.replace(/•\s*(?=\n|$)/g, ''); // remove empty bullets
  
      // 📏 Reduce excessive newlines
      out = out.replace(/\n{3,}/g, '\n\n');
  
      // 🧾 Trim trailing spaces on lines
      out = out.replace(/[ \t]+$/gm, '');
  
      // 🎨 Convert emoji or bold headers into level-3 markdown headers
      out = out.replace(/^\s*(?:([^\w\s])\s*)?\*\*([^*]+)\*\*\s*$/gm, '### $1 **$2**');
  
      // Add blank lines before and after headings
      out = out.replace(/([^\n])\n(###\s)/g, '$1\n\n$2');
      out = out.replace(/(###[^\n]*)\n{1,}/g, '$1\n\n');
  
      // 🔗 Fix repeated [text](text) patterns
      out = out.replace(/\[([^\]]+)\]\(\1\)/g, '$1');
  
      // 🌐 Convert bare domains to clickable links
      out = out.replace(
        /\b(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-z]{2,})(\/\S*)?/g,
        '[$3](https://$3$4)'
      );
  
      // 🔠 Capitalize section headers
      out = out.replace(/### (overview|insight|external context|sentiment|comment themes)/gi, (m) =>
        m.replace(/\b\w/g, (c) => c.toUpperCase())
      );
  
      // 🔁 Deduplicate inline citations {Name}{Name} → {Name}
      out = out.replace(/(\{[^}]+\})(\s*\1)+/g, '$1');
  
      // 🧩 Remove empty citations {}
      out = out.replace(/\{\s*\}/g, '');
  
      // 🧹 Normalize spaces, punctuation, and non-breaking spaces
      out = out.replace(/\u00A0/g, ' ');
      out = out.replace(/ {2,}/g, ' ');
      out = out.replace(/\s*([.,!?])\s*/g, '$1 ');
  
      // ✂️ Clean any leftover bracketed fragments like "( )"
      out = out.replace(/\(\s*\)/g, '');
  
      // ✅ Final tidy trim
      return out.trim();
    } catch {
      return text;
    }
  }

  polishMarkdown(text) {
    try {
      if (!text) return text;
      let out = text;
      // Unicode normalization to NFC
      if (typeof out.normalize === 'function') out = out.normalize('NFC');
      // Replace invalid replacement chars
      out = out.replace(/[\uFFFD]/g, '');
      // Map common mojibake to intended emojis
      const emojiMap = [
        { bad: /\?\s*\?\s*\?\s*/g, rep: '' },
        { bad: /\bE\)\s*/g, rep: '' },
        { bad: /�️/g, rep: '⚠️' },
        { bad: /�/g, rep: '' }
      ];
      emojiMap.forEach(({bad, rep}) => { out = out.replace(bad, rep); });
      // Fix broken heading emojis and known section titles
      out = out.replace(/^###\s*�\s*/gm,'### ');
      out = out.replace(/^###\s*[^\w]*\s*(Key Evidence)\s*$/gmi, '🧾 **Key Evidence**');
      out = out.replace(/^###\s*[^\w]*\s*(Broader[^\n]*)$/gmi, '🌍 **$1**');
      out = out.replace(/^###\s*[^\w]*\s*(Insight)\s*$/gmi, '🧠 **Insight**');
      // Lift mid-line emojis to new heading line
      out = out.replace(/\s(🧾|🌍|🛠️|📊|💡|🧠)\s+([A-Z][^\n]+)/g, '\n\n### $1 **$2**');
      // Tone softeners
      out = out.replace(/\bhas undone\b/gi, 'has been described as reversing');
      out = out.replace(/\bproves\b/gi, 'suggests');
      out = out.replace(/\bclearly\b/gi, 'likely');
      out = out.replace(/\bwithout question\b/gi, 'by most accounts');
      // Ensure each section starts with a brief transition if missing
      out = out.replace(/(###\s[^\n]+)\n\n(?!In\b|As\b|In effect\b|In practice\b)/g, '$1\n\nIn effect, ');
      // Convert inline citations {Name} to prose style (source: Name) at sentence end
      out = out.replace(/\s*\{([^}]+)\}/g, ' (source: $1)');
      // If emojis appear mid-line as section starters, lift them to their own heading line
      out = out.replace(/\s([🛠️🌍📊💡🧩🎯✨💬🌐🧠])\s+/g, '\n\n$1 ');
      // Promote "emoji Title" lines to headings
      out = out.replace(/^([🛠️🌍📊💡🧩🎯✨💬🌐🧠])\s+([^\n*][^\n]*)$/gm, '### $1 **$2**');
      // Ensure bullets start on new lines (no run-on paragraphs)
      out = out.replace(/([^\n])\s*•\s/g, '$1\n• ');
      // Ensure a bullet starts under headings if paragraph-like content follows
      out = out.replace(/(###\s[^\n]+)\n\n([^•#\n][^\n]+)/g, '$1\n\n• $2');
      // Make "Label: value" lines into bullets (e.g., Accountability: …)
      out = out.replace(/(^|\n)([A-Z][A-Za-z ]{2,}:\s)/g, '\n• $2');
      // Ensure Insight section exists
      const hasInsight = /###\s*[🧠💡]?\s*\*\*?Insight/i.test(out) || /\bInsight\b:/i.test(out);
      if (!hasInsight) {
        const firstLine = out.split('\n').find(l => l.trim().length > 0) || '';
        const seed = firstLine.replace(/^###\s*/,'').replace(/\*\*/g,'').substring(0, 160);
        out = out.trim() + `\n\n### 🧠 **Insight**\n\nIn sum, ${seed}.`;
      }
      return out;
    } catch {
      return text;
    }
  }

  validateStructuredAnswer(answer) {
    try {
      if (!answer || answer.length < 40) return false;
      const hasHeadings = /\n###\s/.test(answer);
      const hasBullets = /(^|\n)•\s+/.test(answer);
      const hasInsight = /###\s*[🧠💡]?\s*\*\*?Insight/i.test(answer) || /\bInsight\b:/i.test(answer);
      return hasHeadings && hasBullets && hasInsight;
    } catch { return false; }
  }
  
  async handleAnswerQuestion(payload, sender) {
    console.log('[TabSense] ANSWER_QUESTION received');
    try {
      const { question, context, messages } = payload || {};
      console.log('[TabSense] Question:', question);
      console.log('[TabSense] Context tabs:', context?.length || 0);
      console.log('[TabSense] Conversation messages:', messages?.length || 0);
      
      // For now, create a context-aware response
      if (context && context.length > 0) {
        // Build context from tabs
        const contextPrompt = context.map((tab, i) => {
          const base = `Document ${i + 1} (${tab.title} - ${tab.url}):`;
          const category = tab.category || 'generic';
          const summary = tab.summary || 'No summary available';
          // For YouTube, include a compact excerpt of structured content (which contains comments)
          let extra = '';
          if (category === 'youtube') {
            const content = tab.content || '';
            const excerpt = content.substring(0, 3000);
            const commentHint = 'If present below, use TOP COMMENTS and DESCRIPTION for QA.';
            extra = `\n[YouTube Content Excerpt]\n${excerpt}\n${commentHint}`;
          }
          return `${base}\n${summary}${extra}\nCategory: ${category}\n---`;
        }).join('\n\n');
        
        // Build conversation history (exclude the initial summary which is context, not dialogue)
        // Only include user questions and assistant answers from previous Q&A
        let conversationHistory = '';
        if (messages && messages.length > 0) {
          // Filter to only Q&A pairs (not the initial summary)
          // The initial summary is typically the first assistant message and is part of context
          const qaMessages = messages.slice(1); // Skip first message (usually the summary)
          
          if (qaMessages.length > 0) {
            conversationHistory = qaMessages
              .map(msg => {
                if (msg.role === 'user') {
                  return `User: ${msg.content}`;
                } else if (msg.role === 'assistant') {
                  return `Assistant: ${msg.content}`;
                }
                return '';
              })
              .filter(line => line.length > 0)
              .join('\n\n');
          }
        }
        
        // Step 1: Extract key claims, facts, and entities from the document
        let extractedClaims = [];
        let needsVerification = false;
        
        try {
          console.log('[TabSense] Extracting key claims from document...');
          const extractionPrompt = `Analyze this document and extract the key claims, facts, statistics, dates, numbers, or specific claims that could be verified externally. Focus on verifiable factual information.

Document: ${contextPrompt.substring(0, 2000)}

Extract key claims in this format:
1. [Claim/Fact]
2. [Claim/Fact]
3. [Claim/Fact]

If no verifiable claims are found, respond with "NO_CLAIMS".`;
          
          const extractionResult = await this.aiProviderManager.answerQuestionWithFallback(extractionPrompt);
          if (extractionResult.success && extractionResult.answer) {
            const answer = extractionResult.answer.trim();
            if (!answer.includes('NO_CLAIMS') && answer.length > 20) {
              // Parse extracted claims
              const lines = answer.split('\n')
                .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
                .filter(line => line.length > 10 && !line.match(/^(NO_CLAIMS|None|N\/A)/i));
              
              extractedClaims = lines.slice(0, 5); // Limit to top 5 claims
              needsVerification = extractedClaims.length > 0;
              
              console.log('[TabSense] ✅ Extracted claims:', extractedClaims.length, extractedClaims);
            } else {
              console.log('[TabSense] No verifiable claims found in document');
            }
          }
        } catch (extractionError) {
          console.log('[TabSense] Claim extraction failed:', extractionError.message);
          // Continue - we can still do general search
        }
        
        // Step 2: Determine if external search is needed
        let needsSearch = true;
        let searchResults = null;
        let searchSources = [];
        
        console.log('[TabSense] QA: Forcing external context search for better completeness');
        
        // Step 3: Perform external search (claim-specific if available, or general) with caching
        if (needsSearch) {
          try {
            let searchQuery = this.buildContextualSearchQuery(question, context[0], extractedClaims);
            
            // If we have extracted claims, search for each one specifically
            if (extractedClaims.length > 0) {
              // Combine claims for comprehensive search
              const claimsQuery = extractedClaims.slice(0, 3).join(' OR ');
              searchQuery += ` (verify: ${claimsQuery})`;
              console.log('[TabSense] Performing fact-checking search for claims');
            } else {
              console.log('[TabSense] Performing general external search for:', searchQuery);
            }
            // Cache key based on question + primary URL + claims hash
            const primaryUrl = context[0]?.url || '';
            const claimsKey = extractedClaims.join('|');
            const cacheKey = `qa:${primaryUrl}:${question.trim().toLowerCase()}:${claimsKey}`;
            const nowTs = Date.now();
            const ttlMs = 10 * 60 * 1000; // 10 minutes
            const cached = this.qaSearchCache.get(cacheKey);
            if (cached && (nowTs - cached.timestamp) < ttlMs) {
              searchResults = cached.results;
              console.log('[TabSense] 🔁 Using cached external context:', searchResults?.totalResults || 0);
            } else {
              const fresh = await this.webSearchService.search(searchQuery, { newsLimit: 3, serperLimit: 3 });
              // Merge with cached if it exists (union by URL)
              if (cached && cached.results) {
                const byUrl = new Map();
                (cached.results.sources || []).forEach(s => byUrl.set(s.url, s));
                (fresh.sources || []).forEach(s => byUrl.set(s.url, s));
                fresh.sources = Array.from(byUrl.values());
                fresh.totalResults = fresh.sources.length;
              }
              this.qaSearchCache.set(cacheKey, { timestamp: nowTs, results: fresh });
              searchResults = fresh;
            }

            if (searchResults && searchResults.totalResults > 0) {
              searchSources = searchResults.sources || [];
              console.log('[TabSense] Found', searchResults.totalResults, 'external search results');
              
              // Log detailed search results payload
              console.log('[TabSense] 📊 SEARCH RESULTS PAYLOAD:', {
                totalResults: searchResults.totalResults,
                extractedClaims: extractedClaims.length > 0 ? extractedClaims : null,
                wikipedia: searchResults.wikipedia.length > 0 ? {
                  count: searchResults.wikipedia.length,
                  results: searchResults.wikipedia.map(r => ({
                    title: r.title,
                    url: r.url,
                    abstractPreview: r.abstract?.substring(0, 100) + '...'
                  }))
                } : null,
                news: searchResults.news.length > 0 ? {
                  count: searchResults.news.length,
                  results: searchResults.news.map(a => ({
                    title: a.title,
                    source: a.source,
                    url: a.url,
                    descriptionPreview: a.description?.substring(0, 100) + '...'
                  }))
                } : null,
                web: searchResults.web.length > 0 ? {
                  count: searchResults.web.length,
                  results: searchResults.web.map(w => ({
                    title: w.title,
                    link: w.link,
                    snippetPreview: w.snippet?.substring(0, 100) + '...',
                    isAnswerBox: w.isAnswerBox || false
                  }))
                } : null,
                sources: searchSources.map(s => ({
                  title: s.title,
                  url: s.url,
                  description: s.description?.substring(0, 80) + '...'
                }))
              });
            } else {
              console.log('[TabSense] No external search results found');
            }
          } catch (searchError) {
            console.warn('[TabSense] External search failed:', searchError.message);
            console.error('[TabSense] Search error details:', searchError);
            // Continue without external search - better to answer with context than fail
          }
        }
        
        // Step 4: Build enhanced prompt with conflict resolution logic
        const conversationSection = conversationHistory 
          ? `PREVIOUS CONVERSATION:\n${conversationHistory}\n\n` 
          : '';
        
        // Always include document context - external search supplements it
        const documentContextSection = `PRIMARY CONTEXT (from the document${context.length > 1 ? 's' : ''} the user is reading):\n${contextPrompt}\n\n`;
        
        // Add extracted claims if we have them
        const claimsSection = extractedClaims.length > 0
          ? `KEY CLAIMS EXTRACTED FROM DOCUMENT (to be verified):\n${extractedClaims.map((claim, i) => `${i + 1}. ${claim}`).join('\n')}\n\n`
          : '';
        
        // Add external context if available, with conflict resolution instructions
        let externalContextSection = '';
        let conflictResolutionInstructions = '';
        
        if (searchResults && searchResults.totalResults > 0) {
          externalContextSection = `EXTERNAL VERIFICATION CONTEXT (from external search to cross-check document claims):\n${this.webSearchService.formatResultsForPrompt(searchResults)}\n\n`;
          
          if (extractedClaims.length > 0) {
            conflictResolutionInstructions = `CONFLICT RESOLUTION LOGIC:
1. Cross-check each extracted claim against external sources above
2. If external sources AGREE with the document → accept the document as correct and state confidence
3. If external sources CONFLICT with the document → you MUST:
   a) Flag the discrepancy explicitly (e.g., "However, external sources indicate...")
   b) Explain both perspectives (document vs. external sources)
   c) Default to external data if it's from credible, recent sources (Wikipedia, reputable news)
   d) If uncertainty remains, state it clearly (e.g., "Sources differ on this point...")
4. Always attribute sources clearly (e.g., "According to the document...", "Wikipedia states...", "Recent news reports indicate...")
5. Be transparent about where each piece of information came from

EXAMPLES OF GOOD SOURCE ATTRIBUTION:
- "The document claims X, and this aligns with Wikipedia's information on the topic."
- "While the document states Y, recent news from [Source] reports Z instead."
- "According to the document, A is true. External sources from Wikipedia confirm this."
- "The document mentions B, but external verification from [Source] suggests otherwise - sources differ on this point."`;
      } else {
            conflictResolutionInstructions = `CONTEXT USAGE:
- Use external sources to SUPPLEMENT the document context
- If external information contradicts the document, prioritize external sources if they're credible (Wikipedia, reputable news)
- Always attribute sources clearly`;
          }
        }
        
        // Log what we're providing to the AI
        if (searchResults && searchResults.totalResults > 0) {
          console.log('[TabSense] 📝 PROMPT CONTEXT BREAKDOWN:', {
            documentContext: {
              tabsCount: context.length,
              tabTitles: context.map(t => t.title),
              contextLength: contextPrompt.length
            },
            extractedClaims: extractedClaims.length > 0 ? extractedClaims : null,
            externalContext: {
              sources: searchResults.totalResults,
              wikipedia: searchResults.wikipedia.length,
              news: searchResults.news.length,
              web: searchResults.web.length,
              formattedLength: this.webSearchService.formatResultsForPrompt(searchResults).length
            },
            conflictResolution: extractedClaims.length > 0 ? 'enabled' : 'supplement only',
            conversationHistory: conversationHistory.length > 0 ? conversationHistory.length + ' chars' : 'none'
          });
        }
        
        // Format source names for inline citations
        const sourceNames = [];
        if (context.length > 0) {
          const primarySource = context[0];
          sourceNames.push({ name: primarySource.title || 'Document', type: 'document' });
        }
        if (searchResults && searchResults.totalResults > 0) {
          searchResults.news.slice(0, 2).forEach(article => {
            sourceNames.push({ name: article.source || 'News Source', type: 'news' });
          });
          if (searchResults.wikipedia.length > 0) {
            sourceNames.push({ name: 'Wikipedia', type: 'wikipedia' });
          }
        }
        
        // Category-specific guidance
        const cat = (context[0]?.category || 'generic').toLowerCase();
        let categoryGuidance = '';
        if (cat === 'news') {
          categoryGuidance = `\nNEWS FORMAT:\n- ### 📰 **Headline Context**\n- ### 📊 **Key Facts**\n- ### 🌍 **What It Means**\n- ### 🧠 **Insight**\n`;
        } else if (cat === 'blog') {
          categoryGuidance = `\nBLOG FORMAT:\n- ### 🧭 **Author’s Thesis**\n- ### 🧩 **Argument Chain**\n- ### 🔍 **Evidence & Counterpoints**\n- ### 🧠 **Insight**\n`;
        } else if (cat === 'reference') {
          categoryGuidance = `\nREFERENCE FORMAT:\n- ### 📖 **Definition**\n- ### 🧱 **Core Components**\n- ### 🧪 **Examples**\n- ### 🧠 **Insight**\n`;
        }

        const fullPrompt = `You are a helpful research assistant providing concise, well-structured answers about web content. Your responses should be readable, direct, and efficiently formatted.${categoryGuidance}

${conversationSection}${documentContextSection}${claimsSection}${externalContextSection}CURRENT QUESTION:
${question}

${conflictResolutionInstructions}

OUTPUT FORMAT REQUIREMENTS:

1. OPENING: Start with ONE direct, concise statement that directly answers the question. No filler words like "Okay, so we were talking about", "The document I was reading", or "Let me explain". Just state the answer directly.

2. STRUCTURE: Use emojis and bold section headers for readability:
   - Use 🛠️ for strategy/approach sections
   - Use 🌍 for industry/broader trends
   - Use 📊 for data/statistics
   - Use 💡 for insights/recommendations
   - Use **Bold Text** for section headers

   Category additions:
   - If Category is youtube: include a short "🧩 Comment Themes" micro-section (3–5 themes) when comments inform the answer.

3. CITATIONS: Add inline citations at the end of relevant sentences using this format:
   - {Source Name} for document sources
   - {Reuters}, {Wikipedia}, {News Source Name} for external sources
   - Place citations in curly braces at the end of sentences containing facts

4. LANGUAGE STYLE:
   - Be CONCISE - remove unnecessary words
   - Be DIRECT - answer immediately, no preamble
   - Be HUMAN - conversational but efficient; neutral and analytical tone (avoid absolutist or politically loaded language)
   - NO filler phrases like "I don't have enough information", "I wish I had more info"
   - If a claim can't be verified, simply omit it or state briefly "External verification unavailable for this claim"

5. FORMATTING:
   - Use bullet points with • for lists
   - Use **bold** for key terms and section headers
   - Use emojis strategically for visual organization
   - Keep paragraphs short and scannable; start each section with a brief transition (e.g., "In practice," "As a result,")
    - Do NOT output empty bullets or placeholder bullets. If no bullets are warranted, write concise prose instead.
    - NEVER output standalone source names like "Document" or "Reuters" on their own lines; only use {Source Name} inline citations.

6. FOR UNVERIFIABLE CLAIMS:
   - Instead of: "I don't have enough information from external sources to confirm..."
   - Use: Skip mentioning it, or state "This cannot be verified externally" in parentheses
   - Focus on what you CAN verify rather than what you can't

7. ENDING: Do NOT include suggested follow-up questions unless the user explicitly asks for them.

CRITICAL: 
- NO filler words or verbose explanations
- NO phrases like "Okay, so", "The document says", "I found", "We were talking about"
- YES to concise, direct answers with visual structure
- YES to inline citations in curly braces
- YES to emojis and bold formatting for readability

OUTPUT EXAMPLE (copy the structure, not the content):

Xi Jinping’s Power Consolidation and Its Ripple Effects

China’s political architecture has entered a new era under Xi Jinping, whose anti-corruption purges and loyalty-driven promotions have consolidated his personal control — effectively dismantling Deng Xiaoping’s decentralized legacy.

🛠️ Strategies Behind the Power Shift

• Targeted Purges: Xi’s sweeping anti-corruption campaigns removed rivals while presenting him as a moral reformer {csmonitor.com}. This “self-revolution” narrative re-frames power consolidation as patriotic duty.
• Selective Promotions: Loyalists now fill key leadership posts across ministries and provinces, tightening ideological alignment and accelerating decision-making {Document}.

Together, these twin levers — purging and promoting — have built the most vertically integrated power structure in modern Chinese politics.

🌍 Governance and Policy Consequences

• Centralized Authority: Deng’s model of distributed leadership has yielded to a personality-centric system {project-syndicate.org}.
• Efficiency vs. Fragility: Rapid policy execution now coexists with greater risk — fewer institutional guardrails, faster feedback loops {asiasociety.org}.
• Global Perception: Analysts describe this phase as a return to “Stalin-logic politics” — a blend of fear-based loyalty and high administrative precision {Reuters}.

💬 Public Sentiment Snapshot

• Admiration: Some citizens and commentators praise Xi’s strength and stability narrative.
• Caution: Others fear the erosion of open debate and institutional diversity.
• Defense: A minority credits the approach for enhancing security and raising living standards.

💡 Insight: The Paradox of Stability

Xi’s governance philosophy fuses control with continuity — aiming for long-term stability through personal dominance. Yet history warns that the tighter a system centralizes, the less adaptive it becomes.
Whether this model ensures enduring order or sows the seeds of future volatility will define the next chapter of China’s political evolution.

Answer:`;
        
        // Step 4: Use AI to generate the answer with enhanced context
        try {
          let qaResult = await this.aiProviderManager.answerQuestionWithFallback(fullPrompt);
          
          if (qaResult.success && qaResult.answer) {
            // Combine document sources with search sources
            const allSources = [
              ...context.map(tab => ({ title: tab.title, url: tab.url, type: 'document' })),
              ...searchSources.map(src => ({ title: src.title, url: src.url, type: 'external' }))
            ];

            // Normalize answer to merge stray source-only lines into inline citations and clean markdown
            const normalizeAnswer = (answerText, sourcesList) => {
              const shortNameFrom = (s) => {
                if (s.title && s.title.trim().length > 0) {
                  const t = s.title.trim();
                  return t.length > 60 ? t.substring(0, 57) + '...' : t;
                }
                try {
                  const host = new URL(s.url).hostname.replace(/^www\./, '');
                  return host;
                } catch { return 'Source'; }
              };
              const sourceNames = new Set();
              (sourcesList || []).forEach(s => sourceNames.add(shortNameFrom(s)));
              sourceNames.add('Document');

              const lines = answerText.split('\n');
              const out = [];
              let lastWasContent = false;
              for (let i = 0; i < lines.length; i++) {
                const raw = lines[i];
                const line = raw.trim();
                if (line.length === 0) { out.push(raw); continue; }
                // Skip empty bullets
                if (line === '•' || line === '• ' || line === '•\t') continue;
                // Source-only line → append as inline citation to previous non-empty line
                const isDomain = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(line);
                if ((sourceNames.has(line) || isDomain)) {
                  if (out.length > 0) {
                  for (let j = out.length - 1; j >= 0; j--) {
                    if (out[j].trim().length > 0) {
                      out[j] = out[j].replace(/[\s.]*$/, '') + ` {${line}}`;
                      break;
                    }
                  }
                  }
                  // If there is no previous content, drop stray source-only line
                  continue;
                }
                // Join single-word bullets or dangling fragments with the next line if needed (basic heuristic)
                if (line === '•' || line === '• -') continue;
                out.push(raw);
                lastWasContent = true;
              }
              // Second pass: remove residual standalone 'Document' tokens inside lines
              let joined = out.join('\n');
              joined = joined.replace(/\bDocument\b\.?/g, '');
              // Apply global markdown cleaning
              return this.cleanMarkdown(joined);
            };

            // Formatting disabled for QA: return raw model answer
            let cleaned = qaResult.answer;

            // Get model name for logging
            let providerDisplay = qaResult.provider;
            if (qaResult.provider === 'gemini') {
              providerDisplay = 'gemini';
            }
            
            return {
              success: true,
              data: {
                answer: cleaned,
                sources: allSources,
                provider: providerDisplay,
                confidence: searchResults && searchResults.totalResults > 0 ? 0.9 : 0.8
              }
            };
          }
        } catch (aiError) {
          console.log('[TabSense] AI answer generation failed:', aiError.message);
        }
        
        // All providers failed - don't provide a fallback answer
        return {
          success: false,
          data: {
            answer: 'I apologize, but I\'m currently unable to answer your question. The AI service is temporarily unavailable. Please try again later.',
            sources: [],
            provider: 'none',
            confidence: 0
          }
        };
      }
      
      // No context - explain to user
      return {
            success: true,
            data: {
          answer: 'Please provide context by asking questions about your processed tabs. I need tab summaries to answer questions effectively.',
          sources: [],
          provider: 'none',
          confidence: 0.3
        }
      };
    } catch (error) {
      console.error('[TabSense] Error answering question:', error);
      return { success: false, error: error.message };
    }
  }

  buildContextualSearchQuery(question, primaryTab, extractedClaims) {
    try {
      const title = (primaryTab?.title || '').trim();
      const summary = (primaryTab?.summary || '').trim();
      const url = primaryTab?.url || '';
      let host = '';
      try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}

      // Keyword extraction from title + summary
      const baseText = `${title} ${summary}`.toLowerCase();
      const stop = new Set(['the','a','an','and','or','but','so','of','to','in','on','for','with','this','that','is','are','was','were','it','as','at','be','by','from','about','we','you','they','i','me','my','our','your','their','he','she','his','her','them','us','not','have','has','had','do','did','does','been','will','would','can','could','should','if','then','than','there','here','just','also','more','most','some','any','very','into','over','under','out','up','down','what','which','who','when','where','why','how']);
      const freq = new Map();
      baseText.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).forEach(w => {
        if (!w || w.length < 3 || stop.has(w)) return;
        freq.set(w, (freq.get(w) || 0) + 1);
      });
      const keywords = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([w])=>w);

      let query = question.trim();
      if (title) query += ` "${title.substring(0, 80)}"`;
      if (keywords.length > 0) query += ' ' + keywords.slice(0,4).join(' ');
      if (host) query += ` site:${host}`;
      if (extractedClaims && extractedClaims.length > 0) {
        query += ` (verify: ${extractedClaims.slice(0,3).join(' | ')})`;
      }
      return query;
    } catch {
      return question;
    }
  }

  getFormatterInstruction() {
    return 'INSTRUCTIONS: Format the output in clear Markdown with headings (###), short paragraphs (1–2 lines), bullet points, and tasteful emojis for readability. Avoid repeating sources or the word "Document". Use inline citations in curly braces e.g., {Reuters} where applicable.\n\n';
  }

  async handleSummarizeText(payload, sender) {
    console.log('[TabSense] SUMMARIZE_TEXT received');
    try {
      const { text } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'SUMMARIZE_TEXT',
          payload: { text }
        });

      if (response && response.success) {
      return {
        success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using placeholder');
      }
      
      // Fallback: simple extractive summarization
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';
      
      return {
            success: true,
            data: {
          summary
        }
      };
    } catch (error) {
      console.error('[TabSense] Error summarizing text:', error);
      return { success: false, error: error.message };
    }
  }

  async handleProcessAllTabs(payload, sender) {
    console.log('[TabSense] PROCESS_ALL_TABS received');
    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      console.log('[TabSense] Found tabs:', tabs.length);
      
      // Filter out internal pages
      const processableTabs = tabs.filter(tab => {
        if (!tab.url) return false;
        
        // Filter internal pages
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://')) return false;
        
        // Filter search engines
        if (tab.url.includes('google.com/search') ||
            tab.url.includes('bing.com/search') ||
            tab.url.includes('duckduckgo.com/?q=') ||
            tab.url.includes('yahoo.com/search')) return false;
        
        // Filter directory pages
        if (tab.url.match(/\/category\/|\/archive\/|\/tag\/|\/tags\//)) return false;
        
        // Filter BBC directory pages (e.g., bbc.com/news, not bbc.com/news/articles/)
        if (tab.url.match(/bbc\.com\/(news|sport|culture)(?!\/[^\/]+\/)/)) return false;
        
        return true;
      });
      
      console.log('[TabSense] Processable tabs:', processableTabs.length);
      
      // Inject content scripts to extract real content
      const tabsData = await Promise.all(processableTabs.map(async (tab) => {
        try {
          // Inject content script and get page data
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractPageContent
          });
          
          const extractedData = results[0]?.result || {};

      return {
            id: tab.id,
            title: extractedData.title || tab.title || 'Untitled',
            url: tab.url,
            content: extractedData.content || `Content from ${tab.title || tab.url}`,
            summary: extractedData.summary || 'Content extracted',
            category: extractedData.category || 'generic',
            processed: true,
          timestamp: Date.now()
      };
    } catch (error) {
          console.log('[TabSense] Error extracting from tab:', tab.id, error.message);
          // Fallback to placeholder
      return {
            id: tab.id,
            title: tab.title || 'Untitled',
            url: tab.url,
            content: `Content from ${tab.title || tab.url}`,
            summary: 'Waiting for content extraction...',
            category: 'generic',
            processed: false,
            timestamp: Date.now()
          };
        }
      }));
      
      // Store in both places for compatibility
      await chrome.storage.local.set({ 
        processed_tabs: tabsData,
        multi_tab_collection: tabsData 
      });
      
      // Wait a moment to ensure storage is written
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify storage
      const verify = await chrome.storage.local.get(['multi_tab_collection']);
      console.log('[TabSense] Verification - multi_tab_collection has:', verify.multi_tab_collection?.length || 0, 'items');

      return {
        success: true,
        data: {
          tabsProcessed: tabsData.length,
          tabs: tabsData,
          stored: verify.multi_tab_collection || []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error processing tabs:', error);
      return { success: false, error: error.message };
    } finally {
      this.processingTabs.delete(tab.id);
    }
  }

  async handleGetAPIStatus(payload, sender) {
    console.log('[TabSense] GET_API_STATUS received');
    try {
      // Get API keys from storage (check multiple locations for YouTube key)
      const result = await chrome.storage.local.get(['tabsense_api_keys', 'other_api_keys', 'ai_api_keys', 'youtube_api_key']);
      const keys = {
        youtube: result.tabsense_api_keys?.youtube || result.other_api_keys?.youtube || result.ai_api_keys?.youtube || result.youtube_api_key || '',
        newsapi: result.tabsense_api_keys?.newsapi || result.other_api_keys?.newsapi || ''
      };
      
        return {
          success: true,
        data: {
          youtube: { available: true, configured: !!keys.youtube },
          news: { available: true, configured: !!keys.newsapi }
        }
      };
      } catch (error) {
      console.error('[TabSense] Error getting API status:', error);
      return { success: false, error: error.message };
    }
  }

  async handleInitializeAPIs(payload, sender) {
    console.log('[TabSense] INITIALIZE_APIS received');
    try {
      const { apiKeys } = payload || {};
      
      if (apiKeys) {
        // Store API keys
        await chrome.storage.local.set({
          tabsense_api_keys: apiKeys
        });
        console.log('[TabSense] API keys stored');
      }

      return {
        success: true,
        data: { message: 'APIs initialized' }
      };
        } catch (error) {
      console.error('[TabSense] Error initializing APIs:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAPIKeys(payload, sender) {
    console.log('[TabSense] GET_API_KEYS received');
    try {
      const result = await chrome.storage.local.get(['tabsense_api_keys', 'ai_api_keys', 'other_api_keys']);

      return {
        success: true,
        data: {
          tabsense: result.tabsense_api_keys || {},
          ai: result.ai_api_keys || {},
          other: result.other_api_keys || {}
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting API keys:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSaveAPIKey(payload, sender) {
    console.log('[TabSense] SAVE_API_KEY received with payload:', payload);
    try {
      const { provider, apiKey, type = 'other' } = payload || {};
      
      if (!provider || !apiKey) {
        return { success: false, error: 'Provider and API key are required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_keys' : 'other_api_keys';
      const result = await chrome.storage.local.get([storageKey]);
      const keys = result[storageKey] || {};
      keys[provider] = apiKey;
      await chrome.storage.local.set({ [storageKey]: keys });
      
      return {
        success: true,
        data: { message: 'API key saved successfully' }
      };
    } catch (error) {
      console.error('[TabSense] Error saving API key:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDeleteAPIKey(payload, sender) {
    console.log('[TabSense] DELETE_API_KEY received');
    try {
      const { provider, type = 'other' } = payload || {};
      
      if (!provider) {
        return { success: false, error: 'Provider is required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_keys' : 'other_api_keys';
      const result = await chrome.storage.local.get([storageKey]);
      const keys = result[storageKey] || {};
      delete keys[provider];
      await chrome.storage.local.set({ [storageKey]: keys });

      return {
        success: true,
        data: { message: 'API key deleted successfully' }
      };
    } catch (error) {
      console.error('[TabSense] Error deleting API key:', error);
      return { success: false, error: error.message };
    }
  }

  async handleToggleAPIEnabled(payload, sender) {
    console.log('[TabSense] TOGGLE_API_ENABLED received');
    try {
      const { provider, enabled, type = 'other' } = payload || {};
      
      if (!provider || typeof enabled !== 'boolean') {
        return { success: false, error: 'Provider and enabled state are required' };
      }

      const storageKey = type === 'ai' ? 'ai_api_enabled' : 'other_api_enabled';
      const result = await chrome.storage.local.get([storageKey]);
      const enabledStates = result[storageKey] || {};
      enabledStates[provider] = enabled;
      await chrome.storage.local.set({ [storageKey]: enabledStates });

      return {
        success: true,
        data: { message: 'API enabled state updated' }
      };
    } catch (error) {
      console.error('[TabSense] Error toggling API enabled:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetAPIEnabledStates(payload, sender) {
    console.log('[TabSense] GET_API_ENABLED_STATES received');
    try {
      const result = await chrome.storage.local.get(['ai_api_enabled', 'other_api_enabled', 'chrome_ai_available']);
      
      // Check Chrome AI availability if not already checked
      let chromeAiAvailable = result.chrome_ai_available;
      if (chromeAiAvailable === undefined) {
        chromeAiAvailable = await this.checkChromeAIAvailability();
        await chrome.storage.local.set({ chrome_ai_available: chromeAiAvailable });
      }

      return {
        success: true,
        data: {
          ai_enabled: result.ai_api_enabled || {},
          other_enabled: result.other_api_enabled || {},
          chrome_ai_available: chromeAiAvailable
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting API enabled states:', error);
      return { success: false, error: error.message };
    }
  }

  async checkChromeAIAvailability() {
    try {
      // Check if Chrome AI APIs are available
      if (chrome.readingMode && chrome.ai) {
        // Try to create a reading mode reader to test availability
        const reader = await chrome.readingMode.createReader();
        if (reader) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log('[TabSense] Chrome AI not available:', error.message);
      return false;
    }
  }

  async handlePageDataExtracted(payload, sender) {
    console.log('[TabSense] PAGE_DATA_EXTRACTED received');
    try {
      // This is for content scripts that send page data - we can just acknowledge it
      return { success: true, data: { message: 'Page data received' } };
    } catch (error) {
      console.error('[TabSense] Error handling page data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleTabProcessed(payload, sender) {
    console.log('[TabSense] TAB_PROCESSED received');
    try {
      const { tabId, data } = payload || {};
      if (tabId && data) {
        const result = await chrome.storage.local.get(['processed_tabs']);
        const tabs = result.processed_tabs || [];
        const existingIndex = tabs.findIndex(t => t.id === tabId);
      if (existingIndex >= 0) {
          tabs[existingIndex] = { ...tabs[existingIndex], ...data };
      } else {
          tabs.push({ id: tabId, ...data });
      }
        await chrome.storage.local.set({ processed_tabs: tabs });
      }
      return { success: true };
    } catch (error) {
      console.error('[TabSense] Error processing tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetCategoryStats(payload, sender) {
    console.log('[TabSense] GET_CATEGORY_STATS received');
    try {
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      
      const stats = tabs.reduce((acc, tab) => {
        const category = tab.category || 'generic';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: { categories: stats, total: tabs.length }
      };
    } catch (error) {
      console.error('[TabSense] Error getting category stats:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAdaptiveSummarize(payload, sender) {
    console.log('[TabSense] ADAPTIVE_SUMMARIZE received');
    try {
      const { text, options } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ADAPTIVE_SUMMARIZE',
          payload: { text, options }
        });
        
        if (response && response.success) {
          return {
        success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic summarization');
      }
      
      // Fallback: basic summarization
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ') + '.';

      return {
        success: true,
        data: { summary }
      };
    } catch (error) {
      console.error('[TabSense] Error adapting summarize:', error);
      return { success: false, error: error.message };
    }
  }

  async handleEnhanceContext(payload, sender) {
    console.log('[TabSense] ENHANCE_CONTEXT received');
    try {
      const { pageData, contextType } = payload || {};
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ENHANCE_CONTEXT',
          payload: { pageData, contextType }
        });
        
        if (response && response.success) {
          return {
            success: true,
            data: response.data
          };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, returning basic context');
      }
      
      // Fallback: return basic page data
      return {
          success: true,
        data: {
          title: pageData?.title || 'No title',
          summary: pageData?.summary || 'No summary available',
          context: []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error enhancing context:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataResetSettings(payload, sender) {
    console.log('[TabSense] DATA_RESET_SETTINGS received');
    try {
      const defaults = { theme: 'system', language: 'en', autoSummarize: false };
      await chrome.storage.local.set({ config: defaults });
      return { success: true, data: { message: 'Settings reset' } };
    } catch (error) {
      console.error('[TabSense] Error resetting settings:', error);
      return { success: false, error: error.message };
    }
  }

  async handleDataExportData(payload, sender) {
    console.log('[TabSense] DATA_EXPORT_DATA received');
    try {
      const allData = await chrome.storage.local.get();
      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename: 'tabsense-export.json', saveAs: true });
      return { success: true, data: { message: 'Export started' } };
    } catch (error) {
      console.error('[TabSense] Error exporting data:', error);
      return { success: false, error: error.message };
    }
  }

  async handleCheckCachedSummaries(payload, sender) {
    console.log('[TabSense] CHECK_CACHED_SUMMARIES received');
    try {
      const result = await chrome.storage.local.get(['cache']);
      const cache = result.cache || {};
      const count = Object.keys(cache).length;
      return { success: true, data: { count, cached: count > 0 } };
    } catch (error) {
      console.error('[TabSense] Error checking cache:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetCachedSummaryByUrl(payload, sender) {
    console.log('[TabSense] GET_CACHED_SUMMARY_BY_URL received');
    try {
      const { url } = payload || {};
      if (!url) return { success: false, error: 'URL required' };
      
      const result = await chrome.storage.local.get(['cache']);
      const cache = result.cache || {};
      const summary = cache[url];
      
      if (summary) {
        return { success: true, data: { summary, cached: true } };
      }
      return { success: true, data: { summary: null, cached: false } };
    } catch (error) {
      console.error('[TabSense] Error getting cached summary:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetTabs(payload, sender) {
    console.log('[TabSense] GET_TABS received');
    try {
      const tabs = await chrome.tabs.query({});
      return { success: true, data: { tabs: tabs.filter(t => t.url && !t.url.startsWith('chrome://')) } };
    } catch (error) {
      console.error('[TabSense] Error getting tabs:', error);
      return { success: false, error: error.message };
    }
  }

  async handleProcessTab(payload, sender) {
    console.log('[TabSense] PROCESS_TAB received');
    try {
      const { tabId } = payload || {};
      if (!tabId) return { success: false, error: 'Tab ID required' };
      
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || tab.url.startsWith('chrome://')) {
        return { success: false, error: 'Cannot process internal pages' };
      }
      
      return { success: true, data: { tabId, url: tab.url, title: tab.title } };
        } catch (error) {
      console.error('[TabSense] Error processing tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetConfig(payload, sender) {
    console.log('[TabSense] GET_CONFIG received');
    try {
      const result = await chrome.storage.local.get(['config']);
      return { success: true, data: { config: result.config || {} } };
        } catch (error) {
      console.error('[TabSense] Error getting config:', error);
      return { success: false, error: error.message };
    }
  }

  async handleUpdateConfig(payload, sender) {
    console.log('[TabSense] UPDATE_CONFIG received');
    try {
      const { config } = payload || {};
      await chrome.storage.local.set({ config });
      return { success: true, data: { message: 'Config updated' } };
    } catch (error) {
      console.error('[TabSense] Error updating config:', error);
      return { success: false, error: error.message };
    }
  }

  async handleSummarizeMultiTab(payload, sender) {
    console.log('[TabSense] SUMMARIZE_MULTI_TAB received');
    try {
      const { tabIds } = payload || {};
      const result = await chrome.storage.local.get(['processed_tabs']);
      const tabs = result.processed_tabs || [];
      const relevantTabs = tabIds ? tabs.filter(t => tabIds.includes(t.id)) : tabs;
      
      if (relevantTabs.length === 0) {
        return { success: false, error: 'No tabs to summarize' };
      }
      
      const combinedContent = relevantTabs.map(t => `${t.title}: ${t.summary || 'No summary'}`).join('\n\n');
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'SUMMARIZE_MULTI_TAB',
          payload: { content: combinedContent }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic summarization');
      }
      
      // Fallback: extract first 200 chars
      const summary = combinedContent.substring(0, 200) + '...';
      return { success: true, data: { summary, tabCount: relevantTabs.length } };
        } catch (error) {
      console.error('[TabSense] Error summarizing multi-tab:', error);
      return { success: false, error: error.message };
    }
  }

  async handleAnswerMultiTabQuestion(payload, sender) {
    console.log('[TabSense] ANSWER_MULTI_TAB_QUESTION received');
    try {
      const { question, tabIds } = payload || {};
      
      if (!question) {
        return { success: false, error: 'Question is required' };
      }
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'ANSWER_MULTI_TAB_QUESTION',
          payload: { question, tabIds }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using placeholder response');
      }
      
      // Fallback: placeholder
      return {
        success: true,
        data: {
          answer: 'Multi-tab Q&A feature coming soon. This requires AI integration.',
          sources: [],
          confidence: 0.5
        }
      };
    } catch (error) {
      console.error('[TabSense] Error answering multi-tab question:', error);
      return { success: false, error: error.message };
    }
  }

  async handleGetExternalContext(payload, sender) {
    console.log('[TabSense] GET_EXTERNAL_CONTEXT received');
    try {
      const { topic, contextType } = payload || {};
      
      if (!topic) {
        return { success: false, error: 'Topic is required' };
      }
      
      // Try offscreen first
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'GET_EXTERNAL_CONTEXT',
          payload: { topic, contextType }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, returning empty context');
      }
      
      // Fallback: return empty context
      return {
        success: true,
        data: {
          topic,
          context: [],
          sources: []
        }
      };
    } catch (error) {
      console.error('[TabSense] Error getting external context:', error);
      return { success: false, error: error.message };
    }
  }

  async handleExtractDataFromUrl(payload, sender) {
    console.log('[TabSense] EXTRACT_DATA_FROM_URL received');
    try {
      const { url } = payload || {};
      
      if (!url) {
        return { success: false, error: 'URL is required' };
      }
      
      // Try offscreen first for external API integration
      try {
        const response = await chrome.runtime.sendMessage({
          target: 'offscreen',
          action: 'EXTRACT_DATA_FROM_URL',
          payload: { url }
        });
        
        if (response && response.success) {
          return { success: true, data: response.data };
        }
      } catch (offscreenError) {
        console.log('[TabSense] Offscreen not available, using basic extraction');
      }
      
      // Fallback: return basic URL data
      return {
        success: true,
        data: {
          url,
          type: url.includes('youtube.com') ? 'youtube' : 'generic',
          extracted: false,
          message: 'External API extraction requires API keys'
        }
      };
    } catch (error) {
      console.error('[TabSense] Error extracting data from URL:', error);
      return { success: false, error: error.message };
    }
  }
  
  async handleGenerateConversationTitle(payload, sender) {
    console.log('[TabSense] GENERATE_CONVERSATION_TITLE received');
    try {
      const { messages } = payload || {};
      
      if (!messages || messages.length === 0) {
        console.log('[TabSense] No messages provided for title generation');
        return { success: false, error: 'Messages required' };
      }
      
      // Try to extract title from the summary (first assistant message)
      const firstAssistantMessage = messages.find(m => m.role === 'assistant');
      if (firstAssistantMessage && firstAssistantMessage.content) {
        const content = firstAssistantMessage.content;
        const contentPreview = content.substring(0, 400);
        console.log('[TabSense] Extracting title from content (first 400 chars):', contentPreview);
        
        // Try multiple patterns to extract title based on page type
        // Order matters - try specific patterns first, then generic ones
        const patterns = [
          // News: Overview (most common)
          /(?:📰)\s*\*\*Overview:\*\*\s*([^\n]+)/,
          /\*\*Overview:\*\*\s*([^\n]+)/i,
          /Overview:\s*([^\n]+)/i,
          
          // Blog: Main Argument
          /(?:💭)\s*\*\*Main Argument:\*\*\s*([^\n]+)/,
          /\*\*Main Argument:\*\*\s*([^\n]+)/i,
          /Main Argument:\s*([^\n]+)/i,
          
          // YouTube/Generic: Main Topic
          /(?:🎯|📌)\s*\*\*Main Topic:\*\*\s*([^\n]+)/,
          /\*\*Main Topic:\*\*\s*([^\n]+)/,
          /Main Topic:\s*([^\n]+)/i,
          
          // Fallback: Extract first meaningful line after emoji
          /[📰📌💭🎥🎯]\s*\*\*([^*]+?)\*\*\s*([^\n]+)/,
          
          // Last resort: First non-empty line after cleaning
          /^[📰📌💭🎥🎯]?\s*\*\*([^*]+?)\*\*[:\s]*([^\n]+)/m,
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            // Get the captured group (could be in different positions)
            let title = match[2] || match[1];
            if (title) {
              title = title.trim();
              // Clean up any markdown formatting, emojis, extra whitespace
              title = title.replace(/\*\*/g, '').replace(/^[📰📌💭🎥🎯✨💡🔑👤💬📖]\s*/g, '').trim();
              // Remove common suffixes
              title = title.replace(/\s*[:\-]\s*$/, '').trim();
              
              if (title.length > 5 && title.length < 200) {
                // Truncate if too long
                if (title.length > 60) {
                  title = title.substring(0, 57).trim() + '...';
                }
                console.log('[TabSense] ✅ Extracted title using pattern:', pattern.toString().substring(0, 50), 'Result:', title);
                return { success: true, data: { title } };
              }
            }
          }
        }
        
        console.log('[TabSense] ⚠️ Could not extract title from summary patterns, trying fallback extraction');
        
        // Fallback: Extract first non-empty sentence/line
        const lines = content.split('\n').filter(l => l.trim().length > 10);
        for (const line of lines) {
          // Skip lines that are just section headers (like "**Key Points:**" or "📰 **Overview:**")
          const isSectionHeader = /^[📰📌💭🎥🎯✨💡🔑👤💬📖]?\s*\*\*[^*]+\*\*[:\s]*$/.test(line.trim()) ||
            /^\*\*(Key Points|Overview|Main Topic|Main Argument|Context|Details|Summary|Introduction)[:\s]*\*\*?$/.test(line.trim());
          if (isSectionHeader) {
            continue;
          }
          // Get first meaningful content line
          let title = line.replace(/\*\*/g, '').replace(/^[📰📌💭🎥🎯✨💡🔑👤💬📖]\s*/g, '').replace(/^[•\-\*]\s*/, '').trim();
          // Skip if it looks like a section header without markdown
          if (/^(Key Points|Overview|Main Topic|Main Argument|Context|Details|Summary|Introduction):?\s*$/.test(title)) {
            continue;
          }
          if (title.length > 10 && title.length < 100) {
            if (title.length > 60) title = title.substring(0, 57).trim() + '...';
            console.log('[TabSense] ✅ Extracted title from first content line:', title);
            return { success: true, data: { title } };
          }
        }
        
        console.log('[TabSense] ⚠️ All extraction methods failed, trying AI-based generation');
      }
      
      // Try AI-based title generation if pattern extraction failed
      try {
        console.log('[TabSense] Attempting AI-based title generation...');
        const aiPrompt = `Based on this summary content, generate a concise, descriptive title (max 60 characters, no prefixes like "Summary:" or "Title:"). Just return the title text:

${content.substring(0, 1000)}

Title:`;
        
        const aiResult = await this.aiProviderManager.answerQuestionWithFallback(aiPrompt);
        if (aiResult.success && aiResult.answer) {
          let aiTitle = aiResult.answer.trim();
          // Clean up AI response
          aiTitle = aiTitle.replace(/^(Title:|Summary:)/i, '').trim();
          aiTitle = aiTitle.replace(/[""]/g, '').trim();
          // Remove any newlines and extra whitespace
          aiTitle = aiTitle.split('\n')[0].trim();
          
          if (aiTitle.length > 5 && aiTitle.length < 100) {
            if (aiTitle.length > 60) {
              aiTitle = aiTitle.substring(0, 57).trim() + '...';
            }
            console.log('[TabSense] ✅ Generated title using AI:', aiTitle);
            return { success: true, data: { title: aiTitle } };
          }
        }
      } catch (aiError) {
        console.log('[TabSense] AI title generation failed:', aiError.message);
      }
      
      // Fallback: use first user message
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage && firstUserMessage.content) {
        let title = firstUserMessage.content.substring(0, 50).trim();
        if (title.length > 60) title = title.substring(0, 57) + '...';
        console.log('[TabSense] Using user message as title:', title);
        return { success: true, data: { title } };
      }
      
      // Final fallback
      console.log('[TabSense] Using default title: Conversation');
      return { success: true, data: { title: 'Conversation' } };
    } catch (error) {
      console.error('[TabSense] Error generating conversation title:', error);
      return { success: false, error: error.message };
    }
  }
  
  async handleGenerateSuggestedQuestions(payload, sender) {
    console.log('[TabSense] GENERATE_SUGGESTED_QUESTIONS received');
    try {
      const { summary, category, title } = payload || {};
      
      if (!summary) {
        return { success: false, error: 'Summary required' };
      }
      
      // Generate questions using AI
      try {
        const prompt = `Based on this ${category || 'article'} summary about "${title || 'the content'}", generate 6 thoughtful questions a user might want to ask. Format as simple bullet points without numbering:\n\n${summary.substring(0, 1000)}\n\nQuestions:`;
        
        const questionsResult = await this.aiProviderManager.summarizeWithFallback(
          prompt,
          'https://suggested-questions.com'
        );
        
        if (questionsResult.success) {
          const text = questionsResult.summary;
          let questions = text.split(/\n/)
            .filter(q => q.trim().length > 10 && q.trim().endsWith('?'))
            .map(q => q.replace(/^[-*•]\s*/, '').trim());
          
          if (questions.length === 0) {
            questions = text.split(/[.!?]+/)
              .filter(q => q.includes('?') && q.trim().length > 10)
              .map(q => q.trim());
          }
          
          const finalQuestions = questions.slice(0, 6);
          
          if (finalQuestions.length > 0) {
            return { success: true, data: { questions: finalQuestions } };
          }
        }
      } catch (aiError) {
        console.log('[TabSense] AI questions generation failed:', aiError.message);
      }
      
      // Fallback
      const fallbackQuestions = this.getFallbackQuestions(category);
      return { success: true, data: { questions: fallbackQuestions } };
    } catch (error) {
      console.error('[TabSense] Error generating suggested questions:', error);
      return { success: false, error: error.message };
    }
  }
  
  getFallbackQuestions(category) {
    const categoryQuestions = {
      news: [
        "What are the key facts in this news story?",
        "What is the significance of this event?",
        "Who are the main people mentioned?",
        "When and where did this happen?",
        "What are the implications of this news?",
        "Are there any conflicting viewpoints?"
      ],
      blog: [
        "What is the main argument of this blog post?",
        "What evidence supports the author's claims?",
        "What examples or case studies are provided?",
        "What is the author's conclusion?",
        "Are there any limitations mentioned?",
        "What actionable insights can I take away?"
      ],
      youtube: [
        "What is the main topic of this video?",
        "What are the key takeaways?",
        "Who is the creator and what is their perspective?",
        "What practical tips or advice are shared?",
        "Are there any interesting examples or demos?",
        "What should I know about this topic?"
      ],
      generic: [
        "What is the main topic covered?",
        "What are the most important points?",
        "What details stand out?",
        "How can I apply this information?",
        "What questions does this raise?",
        "What should I remember about this?"
      ]
    };
    
    return categoryQuestions[category] || categoryQuestions.generic;
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

