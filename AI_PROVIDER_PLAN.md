# AI Provider Architecture Plan

## Goal
Support multiple AI providers (Gemini, OpenAI, Anthropic) simultaneously without ES6 imports in service worker.

## Architecture

### AI Provider Abstraction (Plain JavaScript)
```javascript
// In service worker - no imports
class AIProviderManager {
  constructor() {
    this.providers = {
      gemini: {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        generateRequest: this.generateGeminiRequest.bind(this)
      },
      openai: {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        generateRequest: this.generateOpenAIRequest.bind(this)
      },
      anthropic: {
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        generateRequest: this.generateAnthropicRequest.bind(this)
      }
    };
  }

  async summarize(providerName, content, apiKey) {
    const provider = this.providers[providerName];
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);
    
    const requestBody = provider.generateRequest(content);
    
    const response = await fetch(`${provider.endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    return await this.parseResponse(providerName, response);
  }
  
  generateGeminiRequest(content) {
    return {
      contents: [{
        parts: [{ text: `Summarize this article: ${content.substring(0, 20000)}` }]
      }]
    };
  }
  
  generateOpenAIRequest(content) {
    return {
      model: 'gpt-4',
      messages: [{
        role: 'user',
        content: `Summarize: ${content.substring(0, 20000)}`
      }]
    };
  }
  
  generateAnthropicRequest(content) {
    return {
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Summarize this: ${content.substring(0, 20000)}`
      }]
    };
  }
  
  async parseResponse(providerName, response) {
    const data = await response.json();
    
    switch(providerName) {
      case 'gemini':
        return data.candidates[0].content.parts[0].text;
      case 'openai':
        return data.choices[0].message.content;
      case 'anthropic':
        return data.content[0].text;
      default:
        throw new Error('Unknown provider');
    }
  }
}
```

## Implementation Steps

1. Add AIProviderManager class to service worker
2. Update summarization to use provider manager
3. Load API keys from storage
4. Allow users to select which provider to use
5. Implement fallback chain (try provider 1, if fails try provider 2)

## Benefits
- ✅ No imports needed (works in service worker)
- ✅ Easy to add new providers
- ✅ User can choose which provider
- ✅ Can fallback if one provider fails
- ✅ All code in one file (no bundling issues)

## Usage in Summarization
```javascript
async generateAISummary(content, url) {
  // Get enabled providers and their keys
  const providers = await this.getEnabledProviders();
  
  for (const provider of providers) {
    try {
      const summary = await this.aiManager.summarize(
        provider.name, 
        content, 
        provider.key
      );
      return summary;
    } catch (error) {
      console.log(`Provider ${provider.name} failed, trying next...`);
      continue;
    }
  }
  
  // Fallback to extractive
  return this.extractiveSummary(content);
}
```

