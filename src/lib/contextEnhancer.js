/**
 * Context Enhancement System using DuckDuckGo API
 * Provides external context for better summaries
 */

class ContextEnhancer {
  constructor() {
    // Multiple context sources
    this.sources = {
      duckduckgo: 'https://api.duckduckgo.com/',
      wikipedia: 'https://en.wikipedia.org/api/rest_v1/page/summary/',
      wikidata: 'https://www.wikidata.org/w/api.php'
    };
    // Removed global cache to prevent cross-contamination between videos
    // Each video should get fresh context based on its specific content
  }

  /**
   * Get external context for a page
   * @param {Object} pageData - {title, url, content, pageType}
   * @returns {Promise<Object>} Context data with links
   */
  async getExternalContext(pageData, apiKey = null) {
    try {
      console.log('[ContextEnhancer] Getting external context for:', pageData.title);
      
      // Generate AI-powered queries if API key is available
      let queries;
      if (apiKey) {
        console.log('[ContextEnhancer] Using AI to generate queries...');
        queries = await this.generateAIQueries(pageData, apiKey);
      } else {
        console.log('[ContextEnhancer] Using fallback query generation...');
        queries = this.generateShortQueries(
          pageData.title, 
          this.extractKeyThemes(pageData.content.substring(0, 500).toLowerCase()),
          pageData.pageType
        );
      }
      
      console.log('[ContextEnhancer] Generated queries:', queries);
      
      // Try each query with BOTH sources simultaneously
      for (const query of queries) {
        console.log('[ContextEnhancer] Trying query:', query);
        
        // Fetch BOTH Wikipedia and DuckDuckGo simultaneously
        console.log('[ContextEnhancer] Fetching Wikipedia and DuckDuckGo context simultaneously...');
        const [wikiContext, ddgContext] = await Promise.all([
          this.fetchWikipediaContext(query),
          this.fetchDuckDuckGoContext(query)
        ]);
        
        console.log('[ContextEnhancer] Wikipedia result:', wikiContext.abstract ? 'Found' : 'None');
        console.log('[ContextEnhancer] DuckDuckGo result:', ddgContext.abstract ? 'Found' : 'None');
        
        // Combine both contexts if we have results
        const combinedContext = this.combineContexts(wikiContext, ddgContext, query);
        
        if (combinedContext.abstract || combinedContext.relatedTopics.length > 0) {
          console.log('[ContextEnhancer] Found combined results with query:', query);
          // Summarize with AI if API key available
          const summarizedContext = apiKey ? await this.summarizeContextWithAI(combinedContext, apiKey) : combinedContext;
          return summarizedContext;
        }
      }
      
      // If no queries returned results, return fallback
      console.log('[ContextEnhancer] No queries returned results, using fallback');
      const fallbackContext = this.getFallbackContext(pageData);
      console.log('[ContextEnhancer] Fallback context generated:', fallbackContext);
      return fallbackContext;
    } catch (error) {
      console.error('[ContextEnhancer] Error getting context:', error);
      return this.getFallbackContext(pageData);
    }
  }

  /**
   * Build search query from page data
   */
  buildSearchQuery(pageData) {
    const { title, pageType, content } = pageData;
    
    // Extract key themes from content (first 500 chars)
    const contentPreview = content.substring(0, 500).toLowerCase();
    const keyThemes = this.extractKeyThemes(contentPreview);
    
    // Create short, focused queries that work well with DuckDuckGo
    const queries = this.generateShortQueries(title, keyThemes, pageType);
    
    // Return the first query (we'll try multiple if needed)
    return queries[0];
  }

  /**
   * Combine Wikipedia and DuckDuckGo contexts
   */
  combineContexts(wikiContext, ddgContext, query) {
    const combined = {
      query: query,
      abstract: '',
      abstractUrl: '',
      relatedTopics: [],
      infobox: null,
      sources: []
    };

    // Combine abstracts (Wikipedia first, then DuckDuckGo)
    let abstractParts = [];
    if (wikiContext.abstract) {
      abstractParts.push(`Background: ${wikiContext.abstract}`);
      combined.abstractUrl = wikiContext.abstractUrl;
    }
    if (ddgContext.abstract) {
      abstractParts.push(`Current Context: ${ddgContext.abstract}`);
      if (!combined.abstractUrl) {
        combined.abstractUrl = ddgContext.abstractUrl;
      }
    }
    
    if (abstractParts.length > 0) {
      combined.abstract = abstractParts.join(' ');
    }

    // Combine related topics
    combined.relatedTopics = [...wikiContext.relatedTopics, ...ddgContext.relatedTopics];

    // Use Wikipedia infobox if available, otherwise DuckDuckGo
    combined.infobox = wikiContext.infobox || ddgContext.infobox;

    // Combine sources
    combined.sources = [...wikiContext.sources, ...ddgContext.sources];

    console.log('[ContextEnhancer] Combined context:', {
      abstract: combined.abstract ? 'Yes' : 'No',
      relatedTopics: combined.relatedTopics.length,
      sources: combined.sources.length
    });

    return combined;
  }

  /**
   * Generate AI-powered search queries using Gemini
   */
  async generateAIQueries(pageData, apiKey) {
    try {
      const prompt = `Given this article title and content preview, generate 3 specific search queries that would find relevant Wikipedia articles AND current news/policy information:

Title: "${pageData.title}"
Content Preview: "${pageData.content.substring(0, 500)}"

Generate queries that focus on:
1. Background/definition (for Wikipedia)
2. Current events/policies (for news sources)
3. Related topics/context

Return only 3 queries, one per line, no explanations:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
            maxOutputTokens: 100,
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse AI response into queries
      const queries = aiResponse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      console.log('[ContextEnhancer] AI-generated queries:', queries);
      return queries.length > 0 ? queries : this.generateShortQueries(pageData.title, this.extractKeyThemes(pageData.content.substring(0, 500).toLowerCase()), pageData.pageType);
    } catch (error) {
      console.error('[ContextEnhancer] AI query generation failed:', error);
      // Fallback to original method
      return this.generateShortQueries(pageData.title, this.extractKeyThemes(pageData.content.substring(0, 500).toLowerCase()), pageData.pageType);
    }
  }

  /**
   * Generate multiple short, focused search queries
   */
  generateShortQueries(title, keyThemes, pageType) {
    const queries = [];
    
    // Extract main topic from title
    const mainTopic = this.extractMainTopic(title);
    
    // Strategy 1: Main topic + most relevant theme
    if (keyThemes.length > 0) {
      queries.push(`${mainTopic} ${keyThemes[0]}`);
    }
    
    // Strategy 2: Just main topic
    queries.push(mainTopic);
    
    // Strategy 3: Most relevant theme + context
    if (keyThemes.length > 0) {
      const theme = keyThemes[0];
      switch (theme) {
        case 'immigration':
          queries.push('Trump immigration policy');
          queries.push('ICE deportation policy');
          break;
        case 'deportation':
          queries.push('ICE deportation statistics');
          queries.push('deportation policy 2024');
          break;
        case 'asylum':
          queries.push('asylum policy US');
          queries.push('refugee asylum process');
          break;
        case 'legal':
          queries.push('immigration court system');
          queries.push('immigration appeals process');
          break;
      }
    }
    
    // Strategy 4: Page-type specific
    switch (pageType) {
      case 'news':
        queries.push('immigration news 2024');
        queries.push('ICE news recent');
        break;
      case 'reference':
        queries.push('immigration facts');
        queries.push('ICE information');
        break;
    }
    
    // Remove duplicates and limit to 3 queries
    return [...new Set(queries)].slice(0, 3);
  }

  /**
   * Extract main topic from title
   */
  extractMainTopic(title) {
    // Remove common words and extract key terms
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !['woman', 'man', 'person', 'years', 'old', 'after', 'three', 'decades'].includes(word));
    
    // Take first 2-3 meaningful words
    return words.slice(0, 2).join(' ');
  }

  /**
   * Extract key themes from content
   */
  extractKeyThemes(content) {
    const themes = [];
    
    // Common immigration terms
    if (content.includes('ice') || content.includes('immigration')) themes.push('immigration');
    if (content.includes('deportation') || content.includes('deported')) themes.push('deportation');
    if (content.includes('asylum') || content.includes('refugee')) themes.push('asylum');
    if (content.includes('visa') || content.includes('green card')) themes.push('visa');
    
    // Legal terms
    if (content.includes('court') || content.includes('judge')) themes.push('legal');
    if (content.includes('appeal') || content.includes('lawsuit')) themes.push('appeal');
    
    // Geographic terms
    if (content.includes('california') || content.includes('san francisco')) themes.push('california');
    if (content.includes('india') || content.includes('punjab')) themes.push('india');
    
    // Policy terms
    if (content.includes('policy') || content.includes('administration')) themes.push('policy');
    if (content.includes('trump') || content.includes('biden')) themes.push('administration');
    
    return themes;
  }

  /**
   * Clean and optimize title for search
   */
  cleanTitle(title) {
    return title
      .replace(/ - Wikipedia$/, '') // Remove Wikipedia suffix
      .replace(/ \| .*$/, '') // Remove site names after |
      .replace(/^.*: /, '') // Remove site prefixes
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 50); // Limit to 50 chars for better search
  }

  /**
   * Fetch context from Wikipedia API
   */
  async fetchWikipediaContext(query) {
    try {
      // Try multiple Wikipedia search strategies
      const searchQueries = this.generateWikipediaQueries(query);
      
      for (const searchQuery of searchQueries) {
        console.log('[ContextEnhancer] Trying Wikipedia search:', searchQuery);
        
        // First try direct page lookup
        const directUrl = `${this.sources.wikipedia}${encodeURIComponent(searchQuery)}`;
        console.log('[ContextEnhancer] Wikipedia direct URL:', directUrl);
        
        let response = await fetch(directUrl);
        console.log('[ContextEnhancer] Wikipedia direct response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[ContextEnhancer] Wikipedia direct response:', data);
          
          if (data.extract && data.extract.length > 50) {
            return this.processWikipediaResponse(data, query);
          }
        }
        
        // If direct lookup fails, try search API
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=1`;
        console.log('[ContextEnhancer] Wikipedia search URL:', searchUrl);
        
        response = await fetch(searchUrl);
        console.log('[ContextEnhancer] Wikipedia search response status:', response.status);
        
        if (response.ok) {
          const searchData = await response.json();
          console.log('[ContextEnhancer] Wikipedia search response:', searchData);
          
          if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            const pageTitle = searchData.query.search[0].title;
            console.log('[ContextEnhancer] Found Wikipedia page:', pageTitle);
            
            // Now get the actual page content
            const pageUrl = `${this.sources.wikipedia}${encodeURIComponent(pageTitle)}`;
            const pageResponse = await fetch(pageUrl);
            
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              console.log('[ContextEnhancer] Wikipedia page data:', pageData);
              
              if (pageData.extract && pageData.extract.length > 50) {
                return this.processWikipediaResponse(pageData, query);
              }
            }
          }
        }
      }
      
      console.log('[ContextEnhancer] No Wikipedia results found for any query');
      return { abstract: '', abstractUrl: '', relatedTopics: [], infobox: null, sources: [] };
    } catch (error) {
      console.error('[ContextEnhancer] Wikipedia API error:', error);
      return { abstract: '', abstractUrl: '', relatedTopics: [], infobox: null, sources: [] };
    }
  }

  /**
   * Generate Wikipedia-specific search queries
   */
  generateWikipediaQueries(query) {
    const queries = [];
    
    // Original query
    queries.push(query);
    
    // Clean version
    const cleanQuery = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    queries.push(cleanQuery);
    
    // Extract key terms
    const words = cleanQuery.split(' ').filter(word => word.length > 2);
    if (words.length > 1) {
      // Try combinations
      queries.push(words.slice(0, 2).join(' '));
      queries.push(words.slice(0, 3).join(' '));
    }
    
    // Add specific Wikipedia-friendly terms
    if (query.toLowerCase().includes('visa')) {
      queries.push('visa policy');
      queries.push('immigration policy');
    }
    if (query.toLowerCase().includes('immigration')) {
      queries.push('immigration');
      queries.push('immigration policy');
    }
    if (query.toLowerCase().includes('india')) {
      queries.push('india');
      queries.push('india policy');
    }
    
    // Remove duplicates and return
    return [...new Set(queries)].slice(0, 5);
  }

  /**
   * Process Wikipedia API response
   */
  processWikipediaResponse(data, query) {
    const context = {
      query: query,
      abstract: '',
      abstractUrl: '',
      relatedTopics: [],
      infobox: null,
      sources: []
    };

    if (data.extract) {
      context.abstract = data.extract;
      context.abstractUrl = data.content_urls?.desktop?.page || '';
    }

    if (data.content_urls?.desktop?.page) {
      context.sources.push({
        title: data.title || 'Wikipedia Article',
        url: data.content_urls.desktop.page,
        description: data.extract?.substring(0, 100) + '...' || ''
      });
    }

    return context;
  }

  /**
   * Fetch context from DuckDuckGo API
   */
  async fetchDuckDuckGoContext(query) {
    const url = `${this.sources.duckduckgo}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    console.log('[ContextEnhancer] DuckDuckGo API URL:', url);
    
    try {
      console.log('[ContextEnhancer] Making request to DuckDuckGo API...');
      const response = await fetch(url);
      console.log('[ContextEnhancer] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[ContextEnhancer] Raw DuckDuckGo response:', data);
      return this.processDuckDuckGoResponse(data, query);
    } catch (error) {
      console.error('[ContextEnhancer] DuckDuckGo API error:', error);
      throw error;
    }
  }

  /**
   * Process DuckDuckGo API response
   */
  processDuckDuckGoResponse(data, query) {
    const context = {
      query: query,
      abstract: '',
      abstractUrl: '',
      relatedTopics: [],
      infobox: null,
      sources: []
    };

    // Extract abstract - try multiple fields
    context.abstract = data.Abstract || data.AbstractText || data.Answer || '';
    context.abstractUrl = data.AbstractURL || '';

    // If still no abstract, try to extract from other fields
    if (!context.abstract) {
      if (data.Definition) {
        context.abstract = data.Definition;
      } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        context.abstract = data.RelatedTopics[0].Text || '';
        context.abstractUrl = data.RelatedTopics[0].FirstURL || '';
      }
    }

    // Extract related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      context.relatedTopics = data.RelatedTopics
        .slice(0, 3) // Limit to top 3
        .map(topic => ({
          text: topic.Text || '',
          url: topic.FirstURL || ''
        }))
        .filter(topic => topic.text && topic.url);
    }

    // Extract infobox data
    if (data.Infobox && data.Infobox.content) {
      context.infobox = data.Infobox.content
        .slice(0, 5) // Limit to top 5 facts
        .map(item => ({
          label: item.label || '',
          value: item.value || ''
        }))
        .filter(item => item.label && item.value);
    }

    // Collect sources
    if (context.abstractUrl) {
      context.sources.push({
        title: 'Primary Source',
        url: context.abstractUrl,
        description: context.abstract.substring(0, 100) + '...'
      });
    }

    context.relatedTopics.forEach(topic => {
      context.sources.push({
        title: topic.text,
        url: topic.url,
        description: 'Related information'
      });
    });

    return context;
  }

  /**
   * Get fallback context when API fails
   */
  getFallbackContext(pageData) {
    const { title, content } = pageData;
    const contentPreview = content.substring(0, 500).toLowerCase();
    const keyThemes = this.extractKeyThemes(contentPreview);
    
    // Generate contextual information based on themes
    let contextualInfo = '';
    let relatedTopics = [];
    let sources = [];
    
    if (keyThemes.includes('immigration')) {
      contextualInfo = 'Immigration policies in the US have been a contentious issue, with ongoing debates about border security, asylum processes, and deportation practices. Recent administrations have implemented various approaches to immigration enforcement.';
      relatedTopics = [
        { text: 'US Immigration Policy', url: 'https://en.wikipedia.org/wiki/Immigration_to_the_United_States' },
        { text: 'ICE Enforcement', url: 'https://en.wikipedia.org/wiki/U.S._Immigration_and_Customs_Enforcement' }
      ];
      sources = [
        { title: 'US Immigration Policy', url: 'https://en.wikipedia.org/wiki/Immigration_to_the_United_States', description: 'Overview of US immigration policies and procedures' },
        { title: 'ICE Enforcement', url: 'https://en.wikipedia.org/wiki/U.S._Immigration_and_Customs_Enforcement', description: 'Information about ICE enforcement practices' }
      ];
    }
    
    if (keyThemes.includes('deportation')) {
      contextualInfo += ' Deportation procedures involve complex legal processes, including appeals and judicial review. Cases involving long-term residents often raise questions about humanitarian considerations and due process.';
      relatedTopics.push(
        { text: 'Deportation Process', url: 'https://en.wikipedia.org/wiki/Deportation_from_the_United_States' }
      );
      sources.push(
        { title: 'Deportation Process', url: 'https://en.wikipedia.org/wiki/Deportation_from_the_United_States', description: 'Information about US deportation procedures' }
      );
    }
    
    if (keyThemes.includes('asylum')) {
      contextualInfo += ' Asylum applications require demonstrating persecution or fear of persecution in one\'s home country. The process involves multiple levels of review and appeals, with varying success rates depending on country of origin and specific circumstances.';
      relatedTopics.push(
        { text: 'Asylum in the US', url: 'https://en.wikipedia.org/wiki/Asylum_in_the_United_States' }
      );
      sources.push(
        { title: 'Asylum in the US', url: 'https://en.wikipedia.org/wiki/Asylum_in_the_United_States', description: 'Information about US asylum procedures' }
      );
    }
    
    if (keyThemes.includes('legal')) {
      contextualInfo += ' Immigration cases often involve complex legal proceedings, including appeals to federal courts. The Ninth Circuit Court of Appeals handles many immigration cases from western states, including California.';
      relatedTopics.push(
        { text: 'Immigration Courts', url: 'https://en.wikipedia.org/wiki/Executive_Office_for_Immigration_Review' }
      );
      sources.push(
        { title: 'Immigration Courts', url: 'https://en.wikipedia.org/wiki/Executive_Office_for_Immigration_Review', description: 'Information about US immigration court system' }
      );
    }
    
    return {
      query: pageData.title,
      abstract: contextualInfo,
      abstractUrl: '',
      relatedTopics: relatedTopics,
      infobox: null,
      sources: sources,
      fallback: true,
      contextual: true
    };
  }

  /**
   * Summarize context using AI to 2 sentences per source
   */
  async summarizeContextWithAI(context, apiKey) {
    try {
      if (!context.abstract) {
        return context; // No abstract to summarize
      }

      const prompt = `Summarize this external context information into exactly 2 concise sentences that provide relevant background information. Keep it factual and focused:

Context: "${context.abstract}"

Return only 2 sentences, no explanations:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
            maxOutputTokens: 100,
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const summarizedAbstract = data.candidates?.[0]?.content?.parts?.[0]?.text || context.abstract;
      
      console.log('[ContextEnhancer] AI-summarized context:', summarizedAbstract);
      
      return {
        ...context,
        abstract: summarizedAbstract.trim()
      };
    } catch (error) {
      console.error('[ContextEnhancer] AI context summarization failed:', error);
      return context; // Return original context if AI fails
    }
  }
  formatContextForTemplate(context) {
    console.log('[ContextEnhancer] Formatting context for template:', context);
    
    if (!context.abstract && context.relatedTopics.length === 0 && context.sources.length === 0) {
      console.log('[ContextEnhancer] Context has no useful information, returning empty');
      return '';
    }

    let formatted = '';
    
    if (context.abstract) {
      formatted += `**External Context:** ${context.abstract}\n\n`;
    }

    if (context.relatedTopics.length > 0) {
      formatted += '**Related Information:**\n';
      context.relatedTopics.forEach(topic => {
        formatted += `• [${topic.text}](${topic.url})\n`;
      });
      formatted += '\n';
    }

    if (context.infobox && context.infobox.length > 0) {
      formatted += '**Key Facts:**\n';
      context.infobox.forEach(fact => {
        formatted += `• **${fact.label}:** ${fact.value}\n`;
      });
      formatted += '\n';
    }

    console.log('[ContextEnhancer] Formatted context:', formatted);
    return formatted.trim();
  }

}

// Export for use in other modules
export { ContextEnhancer };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContextEnhancer;
} else if (typeof window !== 'undefined') {
  window.ContextEnhancer = ContextEnhancer;
}
