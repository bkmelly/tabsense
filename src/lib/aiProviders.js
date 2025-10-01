/**
 * AI Provider Configuration for TabSense
 * Strategic configuration for multiple AI providers
 */

export const AI_PROVIDERS = {
  CHROME: 'chrome',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE_CLOUD: 'google_cloud',
  LOCAL: 'local',
  FALLBACK: 'fallback'
};

export const AI_MODELS = {
  // Chrome Built-in Models
  CHROME: {
    summarizer: 'chrome-summarizer',
    proofreader: 'chrome-proofreader',
    translator: 'chrome-translator',
    prompt: 'chrome-prompt'
  },
  
  // OpenAI Models
  OPENAI: {
    gpt4: 'gpt-4',
    gpt4Turbo: 'gpt-4-turbo-preview',
    gpt35Turbo: 'gpt-3.5-turbo',
    gpt35Turbo16k: 'gpt-3.5-turbo-16k'
  },
  
  // Anthropic Models
  ANTHROPIC: {
    claude3Opus: 'claude-3-opus-20240229',
    claude3Sonnet: 'claude-3-sonnet-20240229',
    claude3Haiku: 'claude-3-haiku-20240307'
  },
  
  // Google Cloud Models
  GOOGLE_CLOUD: {
    geminiPro: 'gemini-pro',
    geminiProVision: 'gemini-pro-vision',
    palm2: 'text-bison-001'
  },
  
  // Local Models (TensorFlow.js, ONNX.js)
  LOCAL: {
    distilbert: 'distilbert-base-uncased',
    bert: 'bert-base-uncased',
    roberta: 'roberta-base'
  }
};

export const PROVIDER_CONFIGS = {
  [AI_PROVIDERS.CHROME]: {
    name: 'Chrome Built-in AI',
    priority: 1,
    cost: 0,
    latency: 'low',
    features: ['summarization', 'proofreading', 'translation', 'qa'],
    requires: ['chrome_flags'],
    fallback: AI_PROVIDERS.OPENAI
  },
  
  [AI_PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    priority: 2,
    cost: 'medium',
    latency: 'medium',
    features: ['summarization', 'proofreading', 'translation', 'qa', 'image_analysis'],
    requires: ['api_key'],
    fallback: AI_PROVIDERS.ANTHROPIC
  },
  
  [AI_PROVIDERS.ANTHROPIC]: {
    name: 'Anthropic Claude',
    priority: 3,
    cost: 'medium',
    latency: 'medium',
    features: ['summarization', 'proofreading', 'translation', 'qa'],
    requires: ['api_key'],
    fallback: AI_PROVIDERS.GOOGLE_CLOUD
  },
  
  [AI_PROVIDERS.GOOGLE_CLOUD]: {
    name: 'Google Cloud AI',
    priority: 4,
    cost: 'low',
    latency: 'medium',
    features: ['summarization', 'translation', 'qa'],
    requires: ['api_key', 'project_id'],
    fallback: AI_PROVIDERS.LOCAL
  },
  
  [AI_PROVIDERS.LOCAL]: {
    name: 'Local Models',
    priority: 5,
    cost: 0,
    latency: 'high',
    features: ['summarization', 'qa'],
    requires: ['model_files'],
    fallback: AI_PROVIDERS.FALLBACK
  },
  
  [AI_PROVIDERS.FALLBACK]: {
    name: 'Fallback Algorithms',
    priority: 6,
    cost: 0,
    latency: 'very_low',
    features: ['summarization', 'qa'],
    requires: [],
    fallback: null
  }
};

export const TASK_CONFIGS = {
  summarization: {
    preferred_providers: [AI_PROVIDERS.CHROME, AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC],
    max_tokens: 500,
    temperature: 0.3,
    timeout: 30000
  },
  
  proofreading: {
    preferred_providers: [AI_PROVIDERS.CHROME, AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC],
    max_tokens: 1000,
    temperature: 0.1,
    timeout: 20000
  },
  
  translation: {
    preferred_providers: [AI_PROVIDERS.CHROME, AI_PROVIDERS.GOOGLE_CLOUD, AI_PROVIDERS.OPENAI],
    max_tokens: 1000,
    temperature: 0.2,
    timeout: 15000
  },
  
  qa: {
    preferred_providers: [AI_PROVIDERS.CHROME, AI_PROVIDERS.OPENAI, AI_PROVIDERS.ANTHROPIC],
    max_tokens: 800,
    temperature: 0.4,
    timeout: 25000
  }
};

/**
 * Get optimal provider for a specific task
 * @param {string} task - Task type (summarization, proofreading, etc.)
 * @param {Object} context - Context (cost sensitivity, latency requirements, etc.)
 * @returns {string} - Optimal provider
 */
export function getOptimalProvider(task, context = {}) {
  const taskConfig = TASK_CONFIGS[task];
  if (!taskConfig) {
    log('warn', `Unknown task: ${task}, using fallback`);
    return AI_PROVIDERS.FALLBACK;
  }
  
  const { preferred_providers } = taskConfig;
  const { costSensitive = false, latencySensitive = false } = context;
  
  // Filter providers based on context
  let availableProviders = preferred_providers;
  
  if (costSensitive) {
    availableProviders = availableProviders.filter(provider => 
      PROVIDER_CONFIGS[provider].cost === 0 || PROVIDER_CONFIGS[provider].cost === 'low'
    );
  }
  
  if (latencySensitive) {
    availableProviders = availableProviders.filter(provider => 
      PROVIDER_CONFIGS[provider].latency === 'low' || PROVIDER_CONFIGS[provider].latency === 'very_low'
    );
  }
  
  // Return first available provider
  return availableProviders[0] || AI_PROVIDERS.FALLBACK;
}

/**
 * Get provider configuration
 * @param {string} provider - Provider name
 * @returns {Object} - Provider configuration
 */
export function getProviderConfig(provider) {
  return PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS[AI_PROVIDERS.FALLBACK];
}

/**
 * Check if provider is available
 * @param {string} provider - Provider name
 * @param {Object} credentials - Available credentials
 * @returns {boolean} - True if provider is available
 */
export function isProviderAvailable(provider, credentials = {}) {
  const config = getProviderConfig(provider);
  const { requires } = config;
  
  return requires.every(requirement => {
    switch (requirement) {
      case 'api_key':
        return credentials.openai_key || credentials.anthropic_key || credentials.google_key;
      case 'chrome_flags':
        return typeof window !== 'undefined' && window.ai;
      case 'model_files':
        return credentials.localModels && credentials.localModels.length > 0;
      default:
        return true;
    }
  });
}
