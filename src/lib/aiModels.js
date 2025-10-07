/**
 * AI Models Configuration
 * Comprehensive list of AI models for different tasks
 */

class AIModels {
  constructor() {
    this.models = {
      // Google AI (Gemini) Models
      'gemini-2.0-flash': {
        provider: 'google',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, efficient model for general tasks',
        maxTokens: 8192,
        costPer1K: 0.000075,
        capabilities: ['text', 'reasoning', 'code'],
        bestFor: ['general_summarization', 'content_analysis', 'categorization']
      },
      'gemini-2.5-flash': {
        provider: 'google',
        name: 'Gemini 2.5 Flash',
        description: 'Latest fast model with improved capabilities',
        maxTokens: 8192,
        costPer1K: 0.000075,
        capabilities: ['text', 'reasoning', 'code', 'multimodal'],
        bestFor: ['general_summarization', 'content_analysis', 'categorization', 'image_analysis']
      },
      'gemini-2.5-pro': {
        provider: 'google',
        name: 'Gemini 2.5 Pro',
        description: 'Most capable model for complex tasks',
        maxTokens: 32768,
        costPer1K: 0.00125,
        capabilities: ['text', 'reasoning', 'code', 'multimodal'],
        bestFor: ['complex_analysis', 'research', 'detailed_summarization']
      },
      
      // OpenAI Models
      'gpt-4o': {
        provider: 'openai',
        name: 'GPT-4o',
        description: 'Latest OpenAI model with multimodal capabilities',
        maxTokens: 128000,
        costPer1K: 0.005,
        capabilities: ['text', 'reasoning', 'code', 'multimodal'],
        bestFor: ['complex_analysis', 'research', 'detailed_summarization', 'image_analysis']
      },
      'gpt-4o-mini': {
        provider: 'openai',
        name: 'GPT-4o Mini',
        description: 'Efficient model for most tasks',
        maxTokens: 128000,
        costPer1K: 0.00015,
        capabilities: ['text', 'reasoning', 'code'],
        bestFor: ['general_summarization', 'content_analysis', 'categorization']
      },
      'gpt-3.5-turbo': {
        provider: 'openai',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for simple tasks',
        maxTokens: 16384,
        costPer1K: 0.0005,
        capabilities: ['text', 'reasoning'],
        bestFor: ['simple_summarization', 'basic_analysis']
      },
      
      // Anthropic Models
      'claude-3-5-sonnet': {
        provider: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        description: 'Balanced model for most tasks',
        maxTokens: 200000,
        costPer1K: 0.003,
        capabilities: ['text', 'reasoning', 'code'],
        bestFor: ['general_summarization', 'content_analysis', 'categorization']
      },
      'claude-3-5-haiku': {
        provider: 'anthropic',
        name: 'Claude 3.5 Haiku',
        description: 'Fast model for simple tasks',
        maxTokens: 200000,
        costPer1K: 0.00025,
        capabilities: ['text', 'reasoning'],
        bestFor: ['simple_summarization', 'basic_analysis', 'categorization']
      },
      'claude-3-opus': {
        provider: 'anthropic',
        name: 'Claude 3 Opus',
        description: 'Most capable model for complex reasoning',
        maxTokens: 200000,
        costPer1K: 0.015,
        capabilities: ['text', 'reasoning', 'code'],
        bestFor: ['complex_analysis', 'research', 'detailed_summarization']
      },
      
      // Specialized Models for Different Tasks
      'specialized': {
        'sentiment-analysis': {
          model: 'gpt-3.5-turbo',
          prompt: 'Analyze sentiment of the following text. Respond with: positive, negative, or neutral.',
          maxTokens: 100
        },
        'categorization': {
          model: 'gemini-2.0-flash',
          prompt: 'Categorize this content into one of these categories: youtube, news, social, ecommerce, academic, reference, developer, entertainment, article, general.',
          maxTokens: 50
        },
        'comment-analysis': {
          model: 'gpt-4o-mini',
          prompt: 'Analyze these comments and extract themes, sentiment, and representative quotes.',
          maxTokens: 2000
        },
        'news-analysis': {
          model: 'gemini-2.5-flash',
          prompt: 'Analyze this news article for key facts, sources, and bias indicators.',
          maxTokens: 1500
        },
        'product-analysis': {
          model: 'claude-3-5-sonnet',
          prompt: 'Analyze this product page for features, pricing, and customer sentiment.',
          maxTokens: 1500
        },
        'research-analysis': {
          model: 'gpt-4o',
          prompt: 'Analyze this research content for methodology, findings, and implications.',
          maxTokens: 3000
        },
        'code-analysis': {
          model: 'claude-3-5-sonnet',
          prompt: 'Analyze this code for functionality, quality, and potential issues.',
          maxTokens: 2000
        }
      }
    };
  }

  /**
   * Get model configuration
   */
  getModel(modelName) {
    return this.models[modelName] || this.models['gemini-2.0-flash'];
  }

  /**
   * Get best model for a specific task
   */
  getBestModelForTask(task, budget = 'medium') {
    const taskModels = {
      'general_summarization': budget === 'low' ? 'gemini-2.0-flash' : 'gemini-2.5-flash',
      'content_analysis': budget === 'low' ? 'gpt-3.5-turbo' : 'claude-3-5-sonnet',
      'categorization': 'gemini-2.0-flash',
      'comment_analysis': 'gpt-4o-mini',
      'news_analysis': 'gemini-2.5-flash',
      'product_analysis': 'claude-3-5-sonnet',
      'research_analysis': 'gpt-4o',
      'code_analysis': 'claude-3-5-sonnet',
      'complex_analysis': 'gpt-4o',
      'detailed_summarization': 'claude-3-opus'
    };
    
    return taskModels[task] || 'gemini-2.0-flash';
  }

  /**
   * Get specialized model configuration for a task
   */
  getSpecializedModel(task) {
    return this.models.specialized[task] || {
      model: 'gemini-2.0-flash',
      prompt: 'Analyze the following content.',
      maxTokens: 1000
    };
  }

  /**
   * Get all available models
   */
  getAllModels() {
    return Object.keys(this.models).filter(key => key !== 'specialized');
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider) {
    return Object.entries(this.models)
      .filter(([key, config]) => key !== 'specialized' && config.provider === provider)
      .map(([key, config]) => ({ name: key, ...config }));
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(modelName, inputTokens, outputTokens = 0) {
    const model = this.getModel(modelName);
    const inputCost = (inputTokens / 1000) * model.costPer1K;
    const outputCost = (outputTokens / 1000) * model.costPer1K;
    return inputCost + outputCost;
  }

  /**
   * Get model recommendations based on content type and budget
   */
  getRecommendations(contentType, budget = 'medium', task = 'general_summarization') {
    const recommendations = {
      'youtube': {
        low: 'gemini-2.0-flash',
        medium: 'gpt-4o-mini',
        high: 'claude-3-5-sonnet'
      },
      'news': {
        low: 'gemini-2.0-flash',
        medium: 'gemini-2.5-flash',
        high: 'gpt-4o'
      },
      'social': {
        low: 'gpt-3.5-turbo',
        medium: 'gpt-4o-mini',
        high: 'claude-3-5-sonnet'
      },
      'ecommerce': {
        low: 'gemini-2.0-flash',
        medium: 'claude-3-5-sonnet',
        high: 'gpt-4o'
      },
      'academic': {
        low: 'gemini-2.5-flash',
        medium: 'gpt-4o',
        high: 'claude-3-opus'
      },
      'reference': {
        low: 'gemini-2.0-flash',
        medium: 'gemini-2.5-flash',
        high: 'claude-3-5-sonnet'
      },
      'developer': {
        low: 'gemini-2.0-flash',
        medium: 'claude-3-5-sonnet',
        high: 'gpt-4o'
      },
      'entertainment': {
        low: 'gpt-3.5-turbo',
        medium: 'gpt-4o-mini',
        high: 'claude-3-5-sonnet'
      },
      'article': {
        low: 'gemini-2.0-flash',
        medium: 'claude-3-5-sonnet',
        high: 'gpt-4o'
      },
      'general': {
        low: 'gemini-2.0-flash',
        medium: 'gemini-2.5-flash',
        high: 'claude-3-5-sonnet'
      }
    };
    
    return recommendations[contentType]?.[budget] || 'gemini-2.0-flash';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIModels;
}
