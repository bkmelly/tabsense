/**
 * API Keys Settings Component
 * Manages API key configuration for different AI models
 */

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ChevronDown, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useToast } from './Toast';
import ConfirmationDialog from './ConfirmationDialog';

// Declare chrome types for TypeScript
declare const chrome: any;

export interface OtherAPI {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  enabled: boolean;
  cost?: string;
  category?: string;
}

// Other APIs configuration
const otherAPIs: OtherAPI[] = [
  {
    id: "youtube",
    name: "YouTube Data API",
    description: "You can put in your YouTube API key to extract video data and comments.",
    placeholder: "Enter your YouTube Data API Key",
    enabled: false,
    cost: "Free (with quota)",
    category: "Video"
  },
  {
    id: "reddit",
    name: "Reddit API",
    description: "You can put in your Reddit API key to extract posts and comments.",
    placeholder: "Enter your Reddit API Key",
    enabled: false,
    cost: "Free",
    category: "Social"
  },
  {
    id: "news",
    name: "News API",
    description: "You can put in your News API key to fetch news articles and headlines.",
    placeholder: "Enter your News API Key",
    enabled: false,
    cost: "Free (with quota)",
    category: "News"
  },
  {
    id: "twitter",
    name: "Twitter API",
    description: "You can put in your Twitter API key to extract tweets and user data.",
    placeholder: "Enter your Twitter API Key",
    enabled: false,
    cost: "Paid",
    category: "Social"
  },
  {
    id: "github",
    name: "GitHub API",
    description: "You can put in your GitHub API key to access repository data.",
    placeholder: "Enter your GitHub API Key",
    enabled: false,
    cost: "Free (with rate limits)",
    category: "Development"
  }
];

export interface AIModel {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  enabled: boolean;
  isDefault?: boolean;
  cost?: string;
  models?: string[];
}

// Based on our actual AI adapter configuration
const aiModels: AIModel[] = [
  {
    id: "chrome",
    name: "Chrome Built-in AI",
    description: "You can use Chrome's built-in AI models for free.",
    placeholder: "No API key required",
    enabled: true,
    isDefault: true,
    cost: "Free",
    models: ["Summarizer", "Prompt", "Translator", "Language Detector", "Proofreader"]
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "You can put in your Anthropic key to use Claude models at cost.",
    placeholder: "Enter your Anthropic API Key",
    enabled: false,
    isDefault: false,
    cost: "Low ($0.0015/1K tokens)",
    models: ["Claude 3 Haiku", "Claude 3 Sonnet", "Claude 3 Opus"]
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "You can put in your Google key to use Gemini models at cost.",
    placeholder: "Enter your Google API Key",
    enabled: false,
    isDefault: false,
    cost: "Very Low ($0.002/1K tokens)",
    models: ["Gemini Pro", "Gemini Pro Vision"]
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "You can put in your OpenAI key to use OpenAI models at cost.",
    placeholder: "Enter your OpenAI API Key",
    enabled: false,
    isDefault: false,
    cost: "Medium ($0.0035/1K tokens)",
    models: ["GPT-3.5 Turbo", "GPT-4", "GPT-4 Turbo"]
  },
  {
    id: "xai",
    name: "xAI Grok",
    description: "You can put in your xAI key to use Grok models at cost.",
    placeholder: "Enter your xAI API Key",
    enabled: false,
    isDefault: false,
    cost: "Medium ($0.0027/1K tokens)",
    models: ["Grok Beta"]
  }
];

interface APIKeysSettingsProps {
  onApiKeyChange?: (modelId: string, apiKey: string) => void;
  onModelToggle?: (modelId: string, enabled: boolean) => void;
}

const APIKeysSettings: React.FC<APIKeysSettingsProps> = ({
  onApiKeyChange,
  onModelToggle
}) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [modelEnabled, setModelEnabled] = useState<Record<string, boolean>>({
    chrome: true,
    anthropic: false,
    google: false,
    openai: false,
    xai: false
  });
  const { success: showSuccess, error: showError } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("chrome");
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Other APIs state
  const [otherApiKeys, setOtherApiKeys] = useState<Record<string, string>>({});
  const [showOtherKeys, setShowOtherKeys] = useState<Record<string, boolean>>({});
  const [otherApiEnabled, setOtherApiEnabled] = useState<Record<string, boolean>>({
    youtube: false,
    reddit: false,
    news: false,
    twitter: false,
    github: false
  });
  const [selectedOtherApi, setSelectedOtherApi] = useState<string>("youtube");
  
  const [chromeAiAvailable, setChromeAiAvailable] = useState<boolean>(true);
  const [inlineErrorShown, setInlineErrorShown] = useState<boolean>(false);
  const [showOtherDropdown, setShowOtherDropdown] = useState<boolean>(false);
  const otherDropdownRef = useRef<HTMLDivElement>(null);
  
  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: '',
    title: '',
    message: ''
  });

  // Service worker communication
  const sendMessageToServiceWorker = async (message: any): Promise<any> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[APIKeysSettings] Service worker error:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
  };

  // Click outside handler for both dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (otherDropdownRef.current && !otherDropdownRef.current.contains(event.target as Node)) {
        setShowOtherDropdown(false);
      }
    };

    if (showModelDropdown || showOtherDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown, showOtherDropdown]);

  // Load existing API keys on component mount
  useEffect(() => {
    const loadAPIKeys = async () => {
      try {
        // Add a small delay to ensure service worker is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const response = await sendMessageToServiceWorker({
          action: 'GET_API_KEYS'
        });

        if (response.success) {
          const { ai, other } = response.data;
          
          // Set AI API keys
          setApiKeys(ai || {});
          
          // Set Other API keys
          setOtherApiKeys(other || {});
          
               // Also load enabled states
               const enabledResponse = await sendMessageToServiceWorker({
                 action: 'GET_API_ENABLED_STATES'
               });
               
               if (enabledResponse.success) {
                 const { ai_enabled, other_enabled, chrome_ai_available } = enabledResponse.data || {};
                 if (ai_enabled) setModelEnabled(ai_enabled);
                 if (other_enabled) setOtherApiEnabled(other_enabled);
                 if (chrome_ai_available !== undefined) {
                   const previousAvailability = chromeAiAvailable;
                   setChromeAiAvailable(chrome_ai_available);
                   
                   // Show toast if Chrome AI is not available
                   if (!chrome_ai_available && (previousAvailability === true || previousAvailability === undefined)) {
                     showError('Chrome AI Unavailable', 'Your device is not compatible with Chrome Built-in AI. Please configure another AI provider.');
                   }
                 }
               }
          
          console.log('[APIKeysSettings] Loaded API keys and states:', { ai, other });
        } else {
          console.error('[APIKeysSettings] Failed to load API keys:', response.error);
        }
      } catch (error) {
        console.error('[APIKeysSettings] Error loading API keys:', error);
      }
    };

    loadAPIKeys();
  }, []);

  const handleApiKeyChange = async (modelId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [modelId]: value }));
    
    // Save to backend
    if (value.trim()) {
      try {
        const response = await sendMessageToServiceWorker({
          action: 'SAVE_API_KEY',
          provider: modelId,
          apiKey: value,
          type: 'ai'
        });

        if (response.success) {
          console.log('[APIKeysSettings] AI API key saved:', modelId);
          showSuccess('Success', 'API key saved successfully');
        } else {
          console.error('[APIKeysSettings] Failed to save AI API key:', response.error);
          showError('Error', response.error || 'Failed to save API key');
        }
      } catch (error) {
        console.error('[APIKeysSettings] Error saving AI API key:', error);
        showError('Error', 'Failed to save API key');
      }
    }
    
    onApiKeyChange?.(modelId, value);
  };

  const handleModelToggle = async (modelId: string, enabled: boolean) => {
    // Check if Chrome AI is incompatible and trying to enable it
    if (modelId === 'chrome' && !chromeAiAvailable && enabled) {
      showError('Device Incompatible', 'Chrome Built-in AI is not available on your device. Please use another AI provider.');
      // Set a flag to show inline error
      setInlineErrorShown(true);
      return;
    }
    
    setModelEnabled(prev => ({ ...prev, [modelId]: enabled }));
    
    // Save enabled state to backend
    try {
      const response = await sendMessageToServiceWorker({
        action: 'TOGGLE_API_ENABLED',
        provider: modelId,
        enabled: enabled,
        type: 'ai'
      });

      if (response.success) {
        console.log('[APIKeysSettings] AI API enabled state saved:', modelId, enabled);
        if (enabled) {
          showSuccess('Enabled', `${modelId} API has been enabled`);
        } else {
          showSuccess('Disabled', `${modelId} API has been disabled`);
        }
      } else {
        console.error('[APIKeysSettings] Failed to save AI API enabled state:', response.error);
        showError('Error', response.error || 'Failed to update API state');
      }
    } catch (error) {
      console.error('[APIKeysSettings] Error saving AI API enabled state:', error);
      showError('Error', 'Failed to update API state');
    }
    
    onModelToggle?.(modelId, enabled);
  };

  const toggleKeyVisibility = (modelId: string) => {
    setShowKeys(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const handleDeleteApiKey = async (modelId: string) => {
    try {
      const response = await sendMessageToServiceWorker({
        action: 'DELETE_API_KEY',
        provider: modelId,
        type: 'ai'
      });

      if (response.success) {
        setApiKeys(prev => {
          const updated = { ...prev };
          delete updated[modelId];
          return updated;
        });
        showSuccess('Success', 'API key deleted successfully');
      } else {
        showError('Error', response.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('[APIKeysSettings] Error deleting API key:', error);
      showError('Error', 'Failed to delete API key');
    }
  };

  const showDeleteConfirmation = (modelId: string, modelName: string) => {
    setConfirmationDialog({
      isOpen: true,
      action: 'DELETE_API_KEY',
      title: 'Delete API Key',
      message: `Are you sure you want to delete the API key for ${modelName}? This action cannot be undone.`
    });
    // Store modelId for confirmation
    (setConfirmationDialog as any)._pendingModelId = modelId;
  };

  const handleConfirmDelete = async () => {
    const modelId = (confirmationDialog as any)._pendingModelId;
    await handleDeleteApiKey(modelId);
    setConfirmationDialog({ isOpen: false, action: '', title: '', message: '' });
  };

  // Other APIs handlers
  const handleOtherApiKeyChange = async (apiId: string, value: string) => {
    setOtherApiKeys(prev => ({ ...prev, [apiId]: value }));
    
    // Save to backend
    if (value.trim()) {
      try {
        const response = await sendMessageToServiceWorker({
          action: 'SAVE_API_KEY',
          provider: apiId,
          apiKey: value,
          type: 'other'
        });

        if (response.success) {
          console.log('[APIKeysSettings] Other API key saved:', apiId);
        } else {
          console.error('[APIKeysSettings] Failed to save Other API key:', response.error);
        }
      } catch (error) {
        console.error('[APIKeysSettings] Error saving Other API key:', error);
      }
    }
    
    onApiKeyChange?.(apiId, value);
  };

  const handleOtherApiToggle = async (apiId: string, enabled: boolean) => {
    setOtherApiEnabled(prev => ({ ...prev, [apiId]: enabled }));
    
    // Save enabled state to backend
    try {
      const response = await sendMessageToServiceWorker({
        action: 'TOGGLE_API_ENABLED',
        provider: apiId,
        enabled: enabled,
        type: 'other'
      });

      if (response.success) {
        console.log('[APIKeysSettings] Other API enabled state saved:', apiId, enabled);
      } else {
        console.error('[APIKeysSettings] Failed to save Other API enabled state:', response.error);
      }
    } catch (error) {
      console.error('[APIKeysSettings] Error saving Other API enabled state:', error);
    }
    
    onModelToggle?.(apiId, enabled);
  };

  const toggleOtherKeyVisibility = (apiId: string) => {
    setShowOtherKeys(prev => ({ ...prev, [apiId]: !prev[apiId] }));
  };

  const selectedModelData = aiModels.find(model => model.id === selectedModel);
  const selectedOtherApiData = otherAPIs.find(api => api.id === selectedOtherApi);

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
        
        {/* Model Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-700">{selectedModelData?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {showModelDropdown && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
              {aiModels.map((model) => {
                const isActive = modelEnabled[model.id];
                const hasKey = apiKeys[model.id];
                const isSelected = selectedModel === model.id;
                
                return (
                  <div key={model.id} className="p-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isActive && hasKey && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {isActive && !hasKey && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="font-medium text-gray-900">{model.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{model.cost}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{model.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {model.models?.join(", ")}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelDropdown(false);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          isSelected
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Selected Model Configuration */}
      {selectedModelData && (
        <div className="space-y-3">
          {/* Model Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">{selectedModelData.name} API Key</h3>
            
            {/* Toggle Switch - Disabled for Chrome if incompatible */}
            <button
              onClick={() => handleModelToggle(selectedModelData.id, !modelEnabled[selectedModelData.id])}
              disabled={selectedModelData.id === 'chrome' && !chromeAiAvailable}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                modelEnabled[selectedModelData.id] ? 'bg-black' : 'bg-gray-300'
              } ${selectedModelData.id === 'chrome' && !chromeAiAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  modelEnabled[selectedModelData.id] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Inline error message for Chrome AI - Only show if user clicked toggle */}
          {selectedModelData.id === 'chrome' && !chromeAiAvailable && inlineErrorShown && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-800">
                Chrome Built-in AI cannot be enabled on your device. Please select another AI provider from the dropdown.
              </p>
            </div>
          )}
          
          {/* Description */}
          <p className="text-sm text-gray-600">
            {selectedModelData.description.split('your ')[0]}
            <span className="text-blue-600 font-medium">your {selectedModelData.name.toLowerCase()} key</span>
            {selectedModelData.description.split('your ')[1]}
          </p>
          
          {/* Cost and Models Info */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span><strong>Cost:</strong> {selectedModelData.cost}</span>
            <span><strong>Models:</strong> {selectedModelData.models?.join(", ")}</span>
          </div>
          
          {/* API Key Input - Only show for non-Chrome models */}
          {selectedModelData.id !== 'chrome' && (
            <div className="relative">
              <input
                type={showKeys[selectedModelData.id] ? 'text' : 'password'}
                value={apiKeys[selectedModelData.id] || ''}
                onChange={(e) => handleApiKeyChange(selectedModelData.id, e.target.value)}
                placeholder={selectedModelData.placeholder}
                disabled={!modelEnabled[selectedModelData.id]}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm transition-colors ${
                  modelEnabled[selectedModelData.id] 
                    ? 'bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'bg-gray-100 text-gray-400 placeholder-gray-400 cursor-not-allowed'
                }`}
              />
              
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {/* Show/Hide Toggle */}
                <button
                  onClick={() => toggleKeyVisibility(selectedModelData.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={!modelEnabled[selectedModelData.id]}
                >
                  {showKeys[selectedModelData.id] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                
                {/* Delete Button - Only show if key exists */}
                {apiKeys[selectedModelData.id] && (
                  <button
                    onClick={() => showDeleteConfirmation(selectedModelData.id, selectedModelData.name)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Chrome-specific message */}
          {selectedModelData.id === 'chrome' && (
            <div className={`p-3 border rounded-md ${
              chromeAiAvailable 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <p className={`text-sm ${
                chromeAiAvailable 
                  ? 'text-green-800' 
                  : 'text-yellow-800'
              }`}>
                {chromeAiAvailable 
                  ? 'Chrome Built-in AI is automatically available and doesn\'t require an API key.'
                  : 'Your device is not compatible with Chrome Built-in AI. Please use another AI provider by adding an API key.'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Other APIs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Other APIs</h3>
          
          {/* Other APIs Dropdown */}
          <div className="relative" ref={otherDropdownRef}>
            <button
              onClick={() => setShowOtherDropdown(!showOtherDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700">{selectedOtherApiData?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {showOtherDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
                {otherAPIs.map((api) => (
                  <div key={api.id} className="p-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{api.name}</span>
                      <span className="text-xs text-gray-500">{api.cost}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{api.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{api.category}</span>
                      <button
                        onClick={() => {
                          setSelectedOtherApi(api.id);
                          setShowOtherDropdown(false);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedOtherApi === api.id
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {selectedOtherApi === api.id ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Selected Other API Configuration */}
        {selectedOtherApiData && (
          <div className="space-y-3">
            {/* API Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-gray-800">{selectedOtherApiData.name} API Key</h4>
              
              {/* Toggle Switch */}
              <button
                onClick={() => handleOtherApiToggle(selectedOtherApiData.id, !otherApiEnabled[selectedOtherApiData.id])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  otherApiEnabled[selectedOtherApiData.id] ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    otherApiEnabled[selectedOtherApiData.id] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Description */}
            <p className="text-sm text-gray-600">
              {selectedOtherApiData.description.split('your ')[0]}
              <span className="text-blue-600 font-medium">your {selectedOtherApiData.name.toLowerCase()} key</span>
              {selectedOtherApiData.description.split('your ')[1]}
            </p>
            
            {/* Cost and Category Info */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span><strong>Cost:</strong> {selectedOtherApiData.cost}</span>
              <span><strong>Category:</strong> {selectedOtherApiData.category}</span>
            </div>
            
            {/* API Key Input */}
            <div className="relative">
              <input
                type={showOtherKeys[selectedOtherApiData.id] ? 'text' : 'password'}
                value={otherApiKeys[selectedOtherApiData.id] || ''}
                onChange={(e) => handleOtherApiKeyChange(selectedOtherApiData.id, e.target.value)}
                placeholder={selectedOtherApiData.placeholder}
                disabled={!otherApiEnabled[selectedOtherApiData.id]}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm transition-colors ${
                  otherApiEnabled[selectedOtherApiData.id] 
                    ? 'bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'bg-gray-100 text-gray-400 placeholder-gray-400 cursor-not-allowed'
                }`}
              />
              
              {/* Show/Hide Toggle */}
              <button
                onClick={() => toggleOtherKeyVisibility(selectedOtherApiData.id)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={!otherApiEnabled[selectedOtherApiData.id]}
              >
                {showOtherKeys[selectedOtherApiData.id] ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmationDialog({ isOpen: false, action: '', title: '', message: '' })}
      />
    </div>
  );
};

export default APIKeysSettings;
export { aiModels };

