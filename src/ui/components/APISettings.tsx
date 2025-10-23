/**
 * API Settings Component
 * UI component for managing API keys and service configuration
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Settings, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff,
  ExternalLink,
  Info
} from 'lucide-react';

interface APISettingsProps {
  onClose?: () => void;
}

const APISettings: React.FC<APISettingsProps> = ({ onClose }) => {
  const [apiKeys, setApiKeys] = useState({
    youtube: '',
    newsapi: '',
    guardian: ''
  });
  
  const [showKeys, setShowKeys] = useState({
    youtube: false,
    newsapi: false,
    guardian: false
  });
  
  const [apiStatus, setApiStatus] = useState({
    youtube: { available: false, configured: false },
    news: { available: false, configured: false }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAPIKeys();
    checkAPIStatus();
  }, []);

  const loadAPIKeys = async () => {
    try {
      // Load API keys from storage
      const result = await chrome.storage.local.get(['tabsense_api_keys']);
      const keys = result.tabsense_api_keys || {};
      
      setApiKeys({
        youtube: keys.youtube || '',
        newsapi: keys.newsapi || '',
        guardian: keys.guardian || ''
      });
    } catch (error) {
      console.error('[APISettings] Failed to load API keys:', error);
    }
  };

  const checkAPIStatus = async () => {
    try {
      // Send message to service worker to check API status
      const response = await chrome.runtime.sendMessage({
        action: 'GET_API_STATUS'
      });
      
      if (response && response.success) {
        setApiStatus(response.data);
      }
    } catch (error) {
      console.error('[APISettings] Failed to check API status:', error);
    }
  };

  const saveAPIKeys = async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Save API keys to storage
      await chrome.storage.local.set({
        tabsense_api_keys: apiKeys
      });
      
      // Initialize APIs with new keys
      await chrome.runtime.sendMessage({
        action: 'INITIALIZE_APIS',
        data: { apiKeys }
      });
      
      setMessage({ type: 'success', text: 'API keys saved successfully!' });
      await checkAPIStatus();
    } catch (error) {
      console.error('[APISettings] Failed to save API keys:', error);
      setMessage({ type: 'error', text: 'Failed to save API keys. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (service: keyof typeof showKeys) => {
    setShowKeys(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const getAPIKeyInstructions = (service: string) => {
    switch (service) {
      case 'youtube':
        return {
          title: 'YouTube Data API v3',
          description: 'Required for YouTube video data, comments, and metadata extraction',
          steps: [
            'Go to Google Cloud Console',
            'Create a new project or select existing one',
            'Enable YouTube Data API v3',
            'Create credentials (API Key)',
            'Copy the API key and paste it below'
          ],
          link: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'
        };
      case 'newsapi':
        return {
          title: 'NewsAPI',
          description: 'Provides access to news articles from various sources',
          steps: [
            'Visit NewsAPI.org',
            'Sign up for a free account',
            'Get your API key from the dashboard',
            'Copy the API key and paste it below'
          ],
          link: 'https://newsapi.org/register'
        };
      case 'guardian':
        return {
          title: 'Guardian API',
          description: 'Access to The Guardian news content',
          steps: [
            'Visit Guardian Open Platform',
            'Register for an API key',
            'Copy the API key and paste it below'
          ],
          link: 'https://open-platform.theguardian.com/access/'
        };
      default:
        return null;
    }
  };

  const renderAPIKeyInput = (service: keyof typeof apiKeys, label: string) => {
    const instructions = getAPIKeyInstructions(service);
    const isConfigured = apiStatus[service === 'newsapi' || service === 'guardian' ? 'news' : 'youtube']?.configured;
    
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <h3 className="font-semibold">{label}</h3>
            {isConfigured ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>
        
        {instructions && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{instructions.description}</p>
            <div className="space-y-1">
              <p className="text-xs font-medium">Setup Steps:</p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4">
                {instructions.steps.map((step, index) => (
                  <li key={index}>{index + 1}. {step}</li>
                ))}
              </ol>
            </div>
            <a 
              href={instructions.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Get API Key
            </a>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            type={showKeys[service] ? 'text' : 'password'}
            placeholder={`Enter ${label} API key`}
            value={apiKeys[service]}
            onChange={(e) => setApiKeys(prev => ({ ...prev, [service]: e.target.value }))}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleKeyVisibility(service)}
          >
            {showKeys[service] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-lg font-semibold">API Configuration</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>Configure API keys to enable enhanced content extraction and search capabilities.</span>
        </div>

        {renderAPIKeyInput('youtube', 'YouTube Data API')}
        {renderAPIKeyInput('newsapi', 'NewsAPI')}
        {renderAPIKeyInput('guardian', 'Guardian API')}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        <Button 
          onClick={saveAPIKeys} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : 'Save API Keys'}
        </Button>
        <Button 
          variant="outline" 
          onClick={checkAPIStatus}
          disabled={isLoading}
        >
          Refresh Status
        </Button>
      </div>
    </div>
  );
};

export default APISettings;
