import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Download, Send, X, Loader2, CheckCircle2, ExternalLink, ChevronDown, ChevronLeft, ChevronRight,
  Globe, BookOpen, Video, MessageSquare, Newspaper, Zap, Flame, Brain, Lightbulb, 
  Smile, Frown, Meh, Star, HelpCircle, ThumbsUp, ThumbsDown, Minus, MoreVertical, Share2, 
  Copy, Trash2, Settings, History, Eye, EyeOff, Archive, BarChart3, Scale, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import ArchiveSection from '../components/ArchiveSection';
import QASection from '../components/QASection';
import SettingsPage from '../components/SettingsPage';
import EmptyState from '../components/EmptyState';
import { ToastContainer, useToast } from '../components/Toast';

// Chrome types declaration
declare global {
  interface Window {
    chrome: any;
  }
}

// Also declare chrome globally for service worker communication
declare const chrome: any;

// Service Worker Message Types
interface ServiceWorkerMessage {
  action: string;
  payload?: any;
  data?: any;
  [key: string]: any; // Allow additional properties
}

interface ServiceWorkerResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Conversation interface
interface Conversation {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tabId?: string;
  tabUrl?: string;
  tabTitle?: string;
  tabSummary?: string;
  tabCategory?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>;
  suggestedQuestions?: string[];
}

// Service Worker Communication Functions
const sendMessageToServiceWorker = async (message: ServiceWorkerMessage): Promise<ServiceWorkerResponse> => {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response || { success: false, error: 'No response from service worker' };
  } catch (error) {
    console.error('Failed to send message to service worker:', error);
    return { success: false, error: error.message };
  }
};

interface TabSummary {
  id: string;
  title: string;
  url: string;
  favicon: React.ComponentType<{ className?: string }> | string; // Support both icon components and favicon URLs
  summary: string;
  keyPoints: string[];
  analyzing?: boolean;
  category: "youtube" | "news" | "documentation" | "forum" | "blog" | "ecommerce" | "academic" | "entertainment" | "generic";
  
  // Enhanced categorization metadata
  categoryLabel?: string;
  categoryIcon?: string;
  categoryColor?: string;
  categoryConfidence?: number;
  categoryMethod?: string;
  categoryReasoning?: string;
  
  // Enhanced metadata
  author?: string;
  publishedTime?: string;
  description?: string;
  tags?: string[];
  topics?: string[];
  wordCount?: number;
  readingTime?: string;
  qualityScore?: number;
  
  // YouTube-specific data
  youtubeData?: {
    video?: {
      title?: string;
      description?: string;
      channel?: string;
      views?: string;
      likes?: string;
      url?: string;
      videoId?: string;
      transcript?: Array<{ time?: string; text?: string }>;
    };
    comments?: Array<{
      text?: string;
      author?: string;
      likes?: number;
      timestamp?: string;
      replies?: number;
      url?: string;
    }>;
    metadata?: {
      extractedAt?: string;
      commentCount?: number;
      hasTranscript?: boolean;
    };
  };
  
  // Legacy fields (for backward compatibility)
  sentiment?: "positive" | "neutral" | "negative";
  bias?: "left" | "center" | "right";
  engagementScore?: number;
  sentimentBreakdown?: { label: string; percentage: number; emoji: React.ComponentType<{ className?: string }> }[];
  themes?: string[];
  quotes?: string[];
  externalContext?: { source: string; headline: string }[];
  biasMap?: { source: string; tone: string; bias: string }[];
  factCheck?: string;
  dataInsight?: string;
  
  // Processing metadata
  metadata?: {
    processedAt?: string;
    summaryMethod?: 'adaptive' | 'basic';
    cached?: boolean;
    contextEnhanced?: boolean;
    contextSources?: string[];
    extractedAt?: string;
    tabId?: number;
  };
}

const categories = [
  { id: "all", label: "All Tabs", icon: Globe },
  { id: "youtube", label: "YouTube", icon: Video },
  { id: "news", label: "News", icon: Newspaper },
  { id: "documentation", label: "Documentation", icon: BookOpen },
  { id: "forum", label: "Forums", icon: MessageSquare },
  { id: "blog", label: "Blogs", icon: FileText },
  { id: "ecommerce", label: "Shopping", icon: BarChart3 },
  { id: "academic", label: "Academic", icon: Scale },
  { id: "entertainment", label: "Entertainment", icon: Sparkles },
];


const TabSenseSidebar: React.FC = () => {
  // ==================== STATE MANAGEMENT ====================
  
  // Processing Status State
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // Core Tab Data State
  const [tabs, setTabs] = useState<TabSummary[]>([]);
  
  // Settings State
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  
  // Toast notifications
  const { toasts, error: showError, success: showSuccess, removeToast } = useToast();
  
  // Main Q&A State (All Tabs)
  const [mainQuestion, setMainQuestion] = useState("");
  const [mainMessages, setMainMessages] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isQAExpanded, setIsQAExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [mainSuggestedQuestions, setMainSuggestedQuestions] = useState<string[]>([]);
  const [isRegeneratingMainQuestions, setIsRegeneratingMainQuestions] = useState(false);
  
  // Archive State
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  
  // Summary-Specific Q&A State (Separate from Main Q&A)
  const [isSummaryQAExpanded, setIsSummaryQAExpanded] = useState(false);
  const [selectedSummaryForQA, setSelectedSummaryForQA] = useState<TabSummary | null>(null);
  const [summaryQuestion, setSummaryQuestion] = useState("");
  const [summarySuggestedQuestions, setSummarySuggestedQuestions] = useState<string[]>([]);
  const [isRegeneratingSummaryQuestions, setIsRegeneratingSummaryQuestions] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [summaryMessages, setSummaryMessages] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>>([]);
  const [summaryShowSuggestions, setSummaryShowSuggestions] = useState(true);
  const [summaryIsMenuOpen, setSummaryIsMenuOpen] = useState(false);
  
  // Conversation History State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Conversation[]>([]);

  /**
   * Validate URL and clean it
   */
  const validateAndCleanUrl = (url: string): string => {
    try {
      // Basic URL validation
      if (!url || typeof url !== 'string') return '';
      
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      
      // Remove tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', '_ga', '_gid', 'mc_cid', 'mc_eid'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (error) {
      console.warn('[TabSense] Invalid URL:', url, error);
      return url; // Return original if invalid
    }
  };

  /**
   * Clean and normalize content
   */
  const cleanContent = (content: string): string => {
    if (!content || typeof content !== 'string') return '';
    
    // Simple content cleaning
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()\-]/g, '')
      .trim();
  };

  /**
   * Create a clean summary from raw content
   */
  const createCleanSummary = (content: string, title: string): string => {
    if (!content || content.length < 50) {
      return `✅ Content extracted from ${title || 'this page'}`;
    }
    
    // Clean the content first
    const cleanedContent = cleanContent(content);
    
    // Extract first meaningful sentence
    const sentences = cleanedContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      return firstSentence.length > 150 
        ? firstSentence.substring(0, 150) + '...'
        : firstSentence;
    }
    
    return `✅ Content extracted from ${title || 'this page'}`;
  };


  // ==================== SERVICE WORKER INTEGRATION ====================
  
  /**
   * Initialize service worker connection and load real tab data
   */
  useEffect(() => {
    const initializeServiceWorker = async () => {
      try {
        console.log('[TabSense] Testing service worker connectivity...');
        
        // Test service worker connectivity with timeout
        const pingPromise = sendMessageToServiceWorker({ action: 'PING' });
        const timeoutPromise = new Promise<ServiceWorkerResponse>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker ping timeout')), 5000)
        );
        
        const pingResponse = await Promise.race([pingPromise, timeoutPromise]) as ServiceWorkerResponse;
        
        console.log('[TabSense] Service worker ping response:', pingResponse);
        
        if (pingResponse.success) {
          setServiceWorkerStatus('connected');
          console.log('[TabSense] ✅ Service worker connected:', pingResponse.data);
          
          // Check if service worker is fully initialized
          if (pingResponse.data?.initialized) {
            console.log('[TabSense] ✅ Service worker fully initialized');
            showSuccess(
              'Service worker connected',
              'Background service is ready',
              3000
            );
            
            // Check Chrome AI availability on startup with delay
            setTimeout(async () => {
              try {
                const availabilityResponse = await sendMessageToServiceWorker({ action: 'GET_API_ENABLED_STATES' });
                if (availabilityResponse.success && availabilityResponse.data.chrome_ai_available === false) {
                  showError(
                    'Chrome AI Unavailable',
                    'Your device is not compatible with Chrome Built-in AI. Please configure another AI provider in Settings.',
                    8000
                  );
                }
              } catch (error) {
                console.error('[TabSense] Error checking Chrome AI availability:', error);
              }
            }, 2000); // 2 second delay after service worker success message
          } else {
            console.log('[TabSense] ⚠️ Service worker connected but not fully initialized');
            showError(
              'Service worker initializing',
              'Background service is starting up...',
              5000
            );
          }
          
          // Load real tab data
          await loadRealTabData();
        } else {
          setServiceWorkerStatus('error');
          console.error('[TabSense] ❌ Service worker connection failed:', pingResponse.error);
          showError(
            'Service worker disconnected',
            `Background service error: ${pingResponse.error}`,
            8000
          );
        }
      } catch (error) {
        setServiceWorkerStatus('error');
        console.error('[TabSense] ❌ Failed to initialize service worker:', error);
        showError(
          'Service worker initialization failed',
          `Failed to connect: ${error.message}`,
          8000
        );
      }
    };

    initializeServiceWorker();
  }, []);

  /**
   * Listen for real-time tab processing updates
   */
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('[TabSense] Received message from service worker:', message);
      
      if (message.action === 'TAB_PROCESSED' || message.action === 'TAB_AUTO_PROCESSED') {
        console.log('[TabSense] Received real-time tab update:', message.data);
        
        // Add the new tab to the existing tabs
        const newTab = {
          id: message.data.id || `real-${Date.now()}`,
          title: message.data.title || 'Untitled',
          url: message.data.url,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(message.data.url).hostname}`,
          summary: message.data.summary || (message.data.processedData?.summary) || 'Content processed',
          keyPoints: (() => {
            const summary = message.data.summary || message.data.processedData?.summary || '';
            if (summary.includes('**')) {
              const keyPointsMatch = summary.match(/\*\*[Key Points|Key Facts|Key Takeaways]+\*\*[\s\S]*?(?=\n\*\*|$)/i);
              if (keyPointsMatch) {
                const keyPointsText = keyPointsMatch[0];
                const lines = keyPointsText.split('\n')
                  .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
                  .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
                  .filter(line => line.length > 0 && 
                    !line.includes('Content extracted') &&
                    !line.includes('characters') &&
                    !line.includes('Quality:') &&
                    !line.includes('words') &&
                    !line.includes('Page type:') &&
                    !line.includes('Unknown author') &&
                    !line.includes('generic')
                  );
                return lines.slice(0, 6);
              }
            }
            return [];
          })(),
          analyzing: false,
          category: (message.data.category || message.data.processedData?.category || 'generic') as "youtube" | "news" | "documentation" | "forum" | "blog" | "ecommerce" | "academic" | "entertainment" | "generic",
          // Enhanced categorization metadata
          categoryLabel: message.data.processedData?.categoryLabel,
          categoryIcon: message.data.processedData?.categoryIcon,
          categoryColor: message.data.processedData?.categoryColor,
          categoryConfidence: message.data.processedData?.categoryConfidence,
          categoryMethod: message.data.processedData?.categoryMethod,
          categoryReasoning: message.data.processedData?.categoryReasoning,
          author: message.data.processedData?.author,
          publishedTime: message.data.processedData?.publishedTime,
          description: message.data.processedData?.description,
          tags: message.data.processedData?.tags,
          topics: message.data.processedData?.topics,
          wordCount: message.data.processedData?.wordCount,
          readingTime: message.data.processedData?.readingTime,
          qualityScore: message.data.processedData?.qualityScore,
          // Processing metadata
          metadata: message.data.processedData?.metadata || {
            processedAt: message.data.processedData?.processedAt,
            summaryMethod: message.data.summaryMethod,
            cached: message.data.processedData?.cached,
            contextEnhanced: message.data.contextEnhanced,
            contextSources: message.data.contextSources,
            extractedAt: message.data.processedData?.extractedAt,
            tabId: message.data.processedData?.tabId
          }
        };
        
        // Add to existing tabs (avoid duplicates by URL)
        setTabs(prevTabs => {
          const exists = prevTabs.some(tab => tab.url === newTab.url);
          if (exists) {
            console.log('[TabSense] Tab already exists, updating instead');
            return prevTabs.map(tab => 
              tab.url === newTab.url ? { ...tab, ...newTab } : tab
            );
          }
          // Check if this is a duplicate by scanning all properties
          const isDuplicate = prevTabs.some(tab => 
            tab.url === newTab.url && tab.title === newTab.title
          );
          if (!isDuplicate) {
            return [newTab, ...prevTabs];
          }
          return prevTabs;
        });
        
        // Show success notification
        showSuccess(
          'New Tab Processed',
          `${message.data.title} has been automatically processed`,
          3000
        );
      } else if (message.action === 'SERVICE_WORKER_ERROR') {
        console.error('[TabSense] Service worker error:', message.error);
        setServiceWorkerStatus('error');
        showError(
          'Service worker error',
          `Background service error: ${message.error}`,
          8000
        );
      } else if (message.action === 'SERVICE_WORKER_READY') {
        console.log('[TabSense] Service worker ready notification received');
        setServiceWorkerStatus('connected');
        showSuccess(
          'Service worker ready',
          'Background service is now fully operational',
          3000
        );
      }
    };

    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  /**
   * Enhanced refresh function that processes all tabs automatically
   */
  const refreshAndProcessTabs = async () => {
    try {
      console.log('[TabSense] Refreshing and processing all tabs...');
      setIsProcessing(true);
      
      // Set processing status for all categories
      setProcessingStatus({
        all: 'Analyzing tabs...',
        documentation: 'Extracting content...',
        youtube: 'Processing videos...',
        forum: 'Analyzing discussions...',
        news: 'Summarizing articles...',
        blog: 'Processing posts...',
        ecommerce: 'Analyzing products...',
        reference: 'Indexing content...',
        academic: 'Processing papers...',
        generic: 'Analyzing content...'
      });
      
      // First, refresh the tab data
      await loadRealTabData();
      
      // Then trigger automatic processing of unprocessed tabs
      const response = await sendMessageToServiceWorker({
        action: 'PROCESS_ALL_TABS'
      });
      
      if (response.success) {
        console.log('[TabSense] Automatic processing triggered:', response.data);
        
        // Update processing status
        setProcessingStatus({
          all: 'Processing in background...',
          documentation: 'Extracting & summarizing...',
          youtube: 'Analyzing videos & comments...',
          forum: 'Processing discussions...',
          news: 'Summarizing articles...',
          blog: 'Analyzing posts...',
          ecommerce: 'Processing products...',
          reference: 'Indexing content...',
          academic: 'Processing papers...',
          generic: 'Analyzing content...'
        });
        
        // Show processing status
        showSuccess(
          "Processing Started",
          `Processing ${response.data.tabCount || 0} tabs in the background`,
          4000
        );
        
        // Refresh again after a delay to show processed results
        setTimeout(async () => {
          await loadRealTabData();
          setProcessingStatus({});
          setIsProcessing(false);
        }, 5000);
      } else {
        setProcessingStatus({});
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[TabSense] Error during refresh and process:', error);
      setProcessingStatus({});
      setIsProcessing(false);
      showError(
        "Processing Error",
        "An error occurred while processing tabs",
        6000
      );
    }
  };
  const loadRealTabData = async () => {
    // Debounce: prevent multiple rapid calls
    const now = Date.now();
    if (now - lastLoadTime < 2000) { // 2 second debounce
      console.log('[TabSense] Debouncing loadRealTabData call');
      return;
    }
    setLastLoadTime(now);

    setIsLoadingTabs(true);
    console.log('[TabSense] Loading real tab data...');
    
    try {
      const response = await sendMessageToServiceWorker({ 
        action: 'GET_MULTI_TAB_COLLECTION' 
      });
      
      console.log('[TabSense] GET_MULTI_TAB_COLLECTION response:', response);
      
      // Try different data access patterns
      const tabsData = response.data?.data?.tabs || response.data?.tabs || [];
      console.log('[TabSense] Extracted tabs data:', tabsData);
      
      if (response.success && tabsData && tabsData.length > 0) {
        console.log('[TabSense] Found tabs in response:', tabsData.length);
        
        const realTabs = tabsData.map((tab: any, index: number) => {
          try {
            // Clean and validate URL
            const cleanUrl = validateAndCleanUrl(tab.url || '');
            
            // Clean and normalize title
            const cleanTitle = cleanContent(tab.title || 'Untitled');
            
            // Use AI-generated summary if available, otherwise fall back to creating one
            const aiGeneratedSummary = tab.summary || tab.processedData?.summary;
            const cleanSummary = aiGeneratedSummary || createCleanSummary(tab.content || '', cleanTitle);
            
            // Check if this is YouTube data
            const isYouTubeData = tab.type === 'youtube' || tab.video || tab.comments;
            
            // Extract ONLY AI-generated key points from the summary
            // Do NOT include any metadata like word count, page type, etc.
            let keyPoints: string[] = [];
            
            if (cleanSummary && cleanSummary.includes('**')) {
              // Extract key points from the AI-generated summary
              const keyPointsMatch = cleanSummary.match(/\*\*[Key Points|Key Facts|Key Takeaways]+\*\*[\s\S]*?(?=\n\*\*|$)/i);
              if (keyPointsMatch) {
                const keyPointsText = keyPointsMatch[0];
                // Split by bullet points and filter out empty lines
                const lines = keyPointsText.split('\n')
                  .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
                  .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
                  .filter(line => line.length > 0 && 
                    !line.includes('Content extracted') &&
                    !line.includes('characters') &&
                    !line.includes('Quality:') &&
                    !line.includes('words') &&
                    !line.includes('Page type:') &&
                    !line.includes('Unknown author') &&
                    !line.includes('generic')
                  );
                keyPoints = lines.slice(0, 6); // Limit to 6 key points
              }
            }
            
            // Leave empty if no valid key points found - don't create fake ones
            
            return {
              id: tab.id || `real-${cleanUrl}-${index}`,
              title: cleanTitle,
              url: cleanUrl,
              favicon: `https://www.google.com/s2/favicons?domain=${new URL(cleanUrl).hostname}`,
              summary: cleanSummary,
              keyPoints: keyPoints,
              analyzing: false,
              category: (tab.category || 'generic') as "youtube" | "news" | "documentation" | "forum" | "blog" | "ecommerce" | "academic" | "entertainment" | "generic",
              // Enhanced categorization metadata
              categoryLabel: tab.categoryLabel,
              categoryIcon: tab.categoryIcon,
              categoryColor: tab.categoryColor,
              categoryConfidence: tab.categoryConfidence,
              categoryMethod: tab.categoryMethod,
              categoryReasoning: tab.categoryReasoning,
              // Enhanced metadata
              author: tab.author,
              publishedTime: tab.publishedTime,
              description: tab.description,
              tags: tab.tags,
              topics: tab.topics,
              wordCount: tab.wordCount,
              readingTime: tab.readingTime,
              qualityScore: tab.qualityScore,
              // YouTube-specific data
              ...(isYouTubeData && {
                youtubeData: {
                  video: tab.video,
                  comments: tab.comments,
                  metadata: tab.metadata
                }
              }),
              // Processing metadata
              metadata: tab.metadata || {
                processedAt: tab.processedAt,
                summaryMethod: tab.summaryMethod,
                cached: tab.cached,
                contextEnhanced: tab.contextEnhanced,
                contextSources: tab.contextSources,
                extractedAt: tab.extractedAt,
                tabId: tab.tabId
              }
            };
          } catch (error) {
            console.error('[TabSense] Error processing tab:', tab.url, error);
            return null;
          }
        });
        
        // Filter out null results from failed processing
        const validTabs = realTabs.filter(tab => tab !== null);
        
        if (validTabs.length === 0) {
          showError(
            'No tabs could be processed',
            'All tabs failed processing. Check console for details.',
            8000
          );
          return;
        }
        
        console.log('[TabSense] Transformed tabs:', validTabs);
        setTabs(validTabs);
        console.log('[TabSense] Loaded real tab data:', validTabs.length, 'tabs');
        
        showSuccess(
          'Tabs loaded successfully',
          `Processed ${validTabs.length} tabs`,
          4000
        );
      } else {
        console.warn('[TabSense] No real tab data available');
        showError(
          'No tab data available',
          'No tabs were found in the service worker response.',
          6000
        );
      }
    } catch (error) {
      console.error('[TabSense] Failed to load real tab data:', error);
      showError(
        'Failed to load tabs',
        `Service worker error: ${error.message}`,
        8000
      );
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const filteredTabs = selectedCategory === "all" 
    ? tabs 
    : tabs.filter(tab => tab.category === selectedCategory);

  // Handle data actions from settings
  const handleDataAction = async (action: string, data?: any) => {
    console.log('[TabSense] Data action received:', action, data);
    
    if (data?.refreshNeeded) {
      console.log('[TabSense] Refreshing tab data after data action');
      
      // Clear current tabs immediately for instant UI feedback
      setTabs([]);
      console.log('[TabSense] Cleared tabs array');
      
      // Give storage a moment to commit the deletion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload tab data
      await loadRealTabData();
      console.log('[TabSense] Reloaded tab data');
      
      // Also refresh conversations if they were deleted
      if (action.includes('CONVERSATIONS') || action.includes('CLEAR_ALL')) {
        await loadConversationsFromArchive();
        console.log('[TabSense] Reloaded conversations');
      }
      
      console.log('[TabSense] UI refreshed after action:', action);
    }
  };

  // Load conversations on component mount and restore state
  useEffect(() => {
    const initializeConversations = async () => {
      await loadConversationsFromArchive();
      
      // Try to restore the last active conversation (optional - can be enhanced later)
      // For now, just ensure conversations are loaded
      console.log('[TabSense] Conversations loaded, ready to use');
    };
    
    initializeConversations();
  }, []);

  // Generate suggested questions when Q&A section expands or category changes
  useEffect(() => {
    if (isQAExpanded && showSuggestions) {
      generateMainSuggestedQuestions();
    }
  }, [isQAExpanded, selectedCategory]);

  // Load conversations from backend
  const loadConversationsFromArchive = async () => {
    try {
      const response = await sendMessageToServiceWorker({
        action: 'GET_ARCHIVE_CONVERSATIONS'
      });
      
      if (response.success) {
        const conversations = response.data.conversations.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }));
        setConversationHistory(conversations);
      } else {
        console.error('Failed to load conversations:', response.error);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const saveConversationToArchive = async (title: string, messages: Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>, conversationId?: string) => {
    // Store the messages for this conversation in the backend
    try {
      const response = await sendMessageToServiceWorker({
        action: conversationId ? 'UPDATE_CONVERSATION_MESSAGES' : 'SAVE_CONVERSATION_TO_ARCHIVE',
        conversationId, // Pass ID if updating existing
        title,
        messages
      });
      
      if (response.success) {
        const savedId = conversationId || response.data?.conversationId || `conv-${Date.now()}`;
        console.log(`[TabSense] ✅ Saved conversation "${title}" (${savedId}) with ${messages.length} messages`);
        
        // Update local state - reload from backend to ensure consistency
        await loadConversationsFromArchive();
        setActiveConversationId(savedId);
      } else {
        console.error('[TabSense] Failed to save conversation to archive:', response.error);
      }
    } catch (error) {
      console.error('[TabSense] Error saving conversation to archive:', error);
    }
  };

  // Generate AI suggested questions for main Q&A based on category
  const generateMainSuggestedQuestions = async () => {
    try {
      const categoryTabs = filteredTabs;
      const categorySummaries = categoryTabs
        .filter(tab => tab.summary && tab.summary.length > 0)
        .map(tab => tab.summary)
        .join('\n\n');
      
      if (categorySummaries.length > 0) {
        const questionsResponse = await sendMessageToServiceWorker({
          action: 'GENERATE_SUGGESTED_QUESTIONS',
          summary: categorySummaries.substring(0, 2000), // Limit for API
          category: selectedCategory === 'all' ? 'generic' : selectedCategory,
          title: `${categories.find(c => c.id === selectedCategory)?.label || 'All'} Content Query`
        });
        
        if (questionsResponse.success && questionsResponse.data?.questions) {
          setMainSuggestedQuestions(questionsResponse.data.questions);
          console.log('[TabSense] Generated main suggested questions:', questionsResponse.data.questions);
        }
      }
    } catch (error) {
      console.error('[TabSense] Error generating main suggested questions:', error);
    }
  };

  const handleMainAskQuestion = async () => {
    if (!mainQuestion.trim() || isTyping) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const questionText = mainQuestion.trim();
    const newMessage = { role: "user" as const, content: questionText, timestamp };
    const updatedMessages = [...mainMessages, newMessage];
    setMainMessages(updatedMessages);
    setMainQuestion("");
    setIsTyping(true);
    setLoadingStage('Initializing AI model...');
    
    // Progressive loading messages
    const loadingStages = [
      { delay: 2000, message: 'Analyzing your question...' },
      { delay: 4000, message: 'Extracting context from documents...' },
      { delay: 6000, message: 'Searching external sources...' },
      { delay: 10000, message: 'This is taking longer than usual...' },
      { delay: 15000, message: 'Still processing, please wait...' }
    ];
    
    const stageTimers = loadingStages.map(({ delay, message }) => 
      setTimeout(() => setLoadingStage(message), delay)
    );
    
    try {
      // Check service worker status first
      if (serviceWorkerStatus !== 'connected') {
        setLoadingStage('Waiting for service worker...');
      }
      
      // Get context from all processed tabs
      const contextTabs = tabs.filter(tab => tab.summary && tab.summary.length > 0);
      const context = contextTabs.map(tab => ({
        title: tab.title,
        url: tab.url,
        summary: tab.summary,
        category: tab.category
      }));
      
      const response = await sendMessageToServiceWorker({
        action: 'ANSWER_QUESTION',
        question: questionText,
        context: context,
        messages: updatedMessages // Pass conversation history for continuity
      });
      
      if (response.success) {
        // Clear all loading stage timers on success
        stageTimers.forEach(timer => clearTimeout(timer));
        
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const finalMessages = [...updatedMessages, { 
          role: "assistant" as const, 
          content: response.data.answer, 
          timestamp: responseTimestamp,
          error: false
        }];
      setMainMessages(finalMessages);
      setLoadingStage(''); // Clear loading stage
      
      // Save to archive after first exchange with AI-generated title
      if (updatedMessages.length === 1) {
        try {
          // Generate AI title based on category and question
          const categoryLabel = categories.find(c => c.id === selectedCategory)?.label || 'All';
          const titleResponse = await sendMessageToServiceWorker({
            action: 'GENERATE_CONVERSATION_TITLE',
            messages: [{
              role: 'assistant',
              content: `${categoryLabel} Content: ${mainQuestion}`
            }]
          });
          
          const conversationTitle = titleResponse.success && titleResponse.data?.title
            ? titleResponse.data.title
            : `Q&A: ${categoryLabel} - ${mainQuestion.substring(0, 30)}`;
          
          saveConversationToArchive(conversationTitle, finalMessages);
        } catch (error) {
          console.error('[TabSense] Error generating main conversation title:', error);
          // Fallback
          const fallbackTitle = `Main Q&A: ${mainQuestion.substring(0, 30)}...`;
          saveConversationToArchive(fallbackTitle, finalMessages);
        }
      }
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('[TabSense] Q&A Error:', error);
      // Clear all loading stage timers if they exist
      if (typeof stageTimers !== 'undefined') {
        stageTimers.forEach(timer => clearTimeout(timer));
      }
      setLoadingStage('');
      
      const errorMessage = "Sorry, I couldn't process your question right now. Please try again.";
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalMessages = [...updatedMessages, { 
        role: "assistant" as const, 
        content: errorMessage, 
        timestamp: responseTimestamp,
        error: true,
        question: questionText // Store question for retry
      }];
      setMainMessages(finalMessages);
    } finally {
      setIsTyping(false);
      setLoadingStage(''); // Always clear loading stage
    }
  };

  const handleSummaryAskQuestion = async () => {
    if (!summaryQuestion.trim() || isTyping) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const questionText = summaryQuestion.trim(); // Capture question before clearing
    const newMessage = { role: "user" as const, content: questionText, timestamp };
    const updatedMessages = [...summaryMessages, newMessage];
    setSummaryMessages(updatedMessages);
    setSummaryQuestion("");
    setIsTyping(true);
    setLoadingStage('Initializing AI model...');
    
    // Progressive loading messages
    const loadingStages = [
      { delay: 2000, message: 'Analyzing your question...' },
      { delay: 4000, message: 'Extracting context from document...' },
      { delay: 6000, message: 'Searching external sources...' },
      { delay: 10000, message: 'This is taking longer than usual...' },
      { delay: 15000, message: 'Still processing, please wait...' }
    ];
    
    const stageTimers = loadingStages.map(({ delay, message }) => 
      setTimeout(() => setLoadingStage(message), delay)
    );
    
    try {
      // Check service worker status first
      if (serviceWorkerStatus !== 'connected') {
        setLoadingStage('Waiting for service worker...');
      }
      
      // Get context from the selected summary
      const context = selectedSummaryForQA ? [{
        title: selectedSummaryForQA.title,
        url: selectedSummaryForQA.url,
        summary: selectedSummaryForQA.summary,
        category: selectedSummaryForQA.category
      }] : [];
      
      const response = await sendMessageToServiceWorker({
        action: 'ANSWER_QUESTION',
        question: questionText, // Use captured question, not cleared state
        context: context,
        messages: updatedMessages // Pass conversation history for continuity
      });
      
      if (response.success) {
        // Clear all loading stage timers on success
        stageTimers.forEach(timer => clearTimeout(timer));
        
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const finalMessages = [...updatedMessages, { 
          role: "assistant" as const, 
          content: response.data.answer, 
          timestamp: responseTimestamp,
          sources: response.data.sources || [],
          error: false
        }];
      setSummaryMessages(finalMessages);
      setLoadingStage(''); // Clear loading stage
      
      // Conversation was already saved when Ask Questions was clicked
      // Just update it with the new message
      try {
        // Get the active conversation ID
        const conversationsResponse = await sendMessageToServiceWorker({
          action: 'GET_ARCHIVE_CONVERSATIONS'
        });
        
        if (conversationsResponse.success && activeConversationId) {
          // Update using the stored conversation ID
          await sendMessageToServiceWorker({
            action: 'UPDATE_CONVERSATION_MESSAGES',
            conversationId: activeConversationId,
            title: conversationTitle || selectedSummaryForQA?.title || 'Conversation',
            messages: finalMessages
          });
          console.log('[TabSense] ✅ Updated conversation', activeConversationId, 'with new message');
        } else if (selectedSummaryForQA) {
          // Fallback: try to find by tab context
          const existingConv = conversationsResponse.data.conversations.find((conv: any) => 
            conv.tabId === selectedSummaryForQA.id || conv.tabUrl === selectedSummaryForQA.url
          );
          
          if (existingConv) {
            await sendMessageToServiceWorker({
              action: 'UPDATE_CONVERSATION_MESSAGES',
              conversationId: existingConv.id,
              title: conversationTitle || selectedSummaryForQA.title || 'Conversation',
              messages: finalMessages
            });
            setActiveConversationId(existingConv.id);
            console.log('[TabSense] ✅ Updated conversation (found by tab context):', existingConv.id);
          }
        }
      } catch (error) {
        console.error('[TabSense] Error updating conversation:', error);
      }
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('[TabSense] Summary Q&A Error:', error);
      // Clear all loading stage timers if they exist
      if (typeof stageTimers !== 'undefined') {
        stageTimers.forEach(timer => clearTimeout(timer));
      }
      setLoadingStage('');
      
      const errorMessage = "Sorry, I couldn't process your question about this summary right now. Please try again.";
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalMessages = [...updatedMessages, { 
        role: "assistant" as const, 
        content: errorMessage, 
        timestamp: responseTimestamp,
        error: true,
        question: questionText // Store question for retry
      }];
      setSummaryMessages(finalMessages);
    } finally {
      setIsTyping(false);
      setLoadingStage(''); // Always clear loading stage
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 border-green-200 bg-green-50';
      case 'negative': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'documentation': return 'bg-blue-100 text-blue-800';
      case 'youtube': return 'bg-red-100 text-red-800';
      case 'forum': return 'bg-green-100 text-green-800';
      case 'news': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBiasColor = (bias?: string) => {
    switch (bias) {
      case "left": return "text-blue-500";
      case "right": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const handleAnalyzeTab = (tabId: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, analyzing: true } : tab
      )
    );
    
    setTimeout(() => {
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === tabId ? { ...tab, analyzing: false } : tab
        )
      );
    }, 2000);
  };

  const toggleTabExpansion = (tabId: string) => {
    setExpandedTabId(expandedTabId === tabId ? null : tabId);
  };

  const openSummaryQA = async (tab: TabSummary) => {
    // First, check if conversation already exists BEFORE clearing state
    let existingConversation: Conversation | null = null;
    
    try {
      const conversationsResponse = await sendMessageToServiceWorker({
        action: 'GET_ARCHIVE_CONVERSATIONS'
      });
      
      if (conversationsResponse.success) {
        // Check if a conversation exists for THIS SPECIFIC TAB
        const foundConversation = conversationsResponse.data.conversations.find(
          (conv: any) => {
            // Match by tab.id if stored in conversation metadata
            if (conv.tabId === tab.id) {
              return true;
            }
            // Fallback: Match by exact URL match in first message AND check it's from the same source
            const firstMessage = conv.messages?.[0];
            if (firstMessage?.content && tab.url) {
              const urlPattern = new RegExp(`\\b${tab.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
              if (urlPattern.test(firstMessage.content)) {
                const summaryStart = tab.summary.substring(0, 100);
                const messageStart = firstMessage.content.substring(0, 100);
                if (summaryStart === messageStart) {
                  return true;
                }
              }
            }
            return false;
          }
        );
        
        if (foundConversation) {
          existingConversation = foundConversation as Conversation;
        }
      }
    } catch (error) {
      console.error('[TabSense] Error checking for existing conversation:', error);
    }
    
    // If conversation exists, RESTORE it fully instead of starting fresh
    if (existingConversation) {
      console.log('[TabSense] 🔄 Restoring existing conversation:', existingConversation.id);
      
      // Restore the FULL conversation state
      setSummaryMessages(existingConversation.messages || []);
      setConversationTitle(existingConversation.title || tab.title);
      setActiveConversationId(existingConversation.id || null);
      
      // Restore tab context
      setSelectedSummaryForQA(tab);
      setIsSummaryQAExpanded(true);
      setSummaryQuestion("");
      setSummaryShowSuggestions(true);
      setSummaryIsMenuOpen(false);
      
      // Only generate suggested questions if they don't exist already (prevent regeneration)
      // Check if conversation has suggestedQuestions stored or use existing ones
      if (existingConversation.suggestedQuestions && existingConversation.suggestedQuestions.length > 0) {
        setSummarySuggestedQuestions(existingConversation.suggestedQuestions);
        console.log('[TabSense] Using stored suggested questions for existing conversation');
      } else {
        // Generate suggested questions only if not stored
        try {
          const summaryForQuestions = existingConversation.tabSummary || tab.summary;
          const categoryForQuestions = existingConversation.tabCategory || tab.category;
          const titleForQuestions = existingConversation.tabTitle || tab.title;
          
          const questionsResponse = await sendMessageToServiceWorker({
            action: 'GENERATE_SUGGESTED_QUESTIONS',
            summary: summaryForQuestions,
            category: categoryForQuestions,
            title: titleForQuestions
          });
          
          if (questionsResponse.success && questionsResponse.data?.questions) {
            setSummarySuggestedQuestions(questionsResponse.data.questions);
            console.log('[TabSense] Generated suggested questions for existing conversation');
            // Store questions in conversation for future use
            await sendMessageToServiceWorker({
              action: 'UPDATE_CONVERSATION_MESSAGES',
              conversationId: existingConversation.id,
              title: existingConversation.title,
              messages: existingConversation.messages,
              suggestedQuestions: questionsResponse.data.questions
            });
          }
        } catch (error) {
          console.error('[TabSense] Error generating suggested questions:', error);
        }
      }
      
      return; // Don't create a new conversation
    }
    
    // NEW conversation - create from scratch
    console.log('[TabSense] ✨ Creating new conversation for tab:', tab.id);
    
    // Clear previous state to ensure fresh start for each tab
    setConversationTitle('');
    setSummaryMessages([]);
    
    // Use the AI-generated summary as-is - it already has proper formatting
    let formattedContent = tab.summary;
    
    const summaryMessage = {
      role: "assistant" as const,
      content: formattedContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setSummaryMessages([summaryMessage]);
    setSummaryQuestion("");
    setSummaryShowSuggestions(true);
    setSummaryIsMenuOpen(false);
    setSelectedSummaryForQA(tab);
    setIsSummaryQAExpanded(true);
    
    // Generate AI title and save conversation immediately
    let generatedTitle = tab.title; // Declare outside try block so it's accessible later
    try {
      console.log('[TabSense] Generating conversation title for tab:', tab.title);
      console.log('[TabSense] Summary content length:', formattedContent?.length || 0);
      
      const titleResponse = await sendMessageToServiceWorker({
        action: 'GENERATE_CONVERSATION_TITLE',
        messages: [summaryMessage]
      });
      
      console.log('[TabSense] Title response for tab:', tab.title, titleResponse);
      
      generatedTitle = tab.title; // Fallback to tab title
      
      if (titleResponse && titleResponse.success && titleResponse.data?.title) {
        generatedTitle = titleResponse.data.title;
        console.log('[TabSense] ✅ Successfully generated title:', generatedTitle);
      } else {
        console.log('[TabSense] ⚠️ Title generation failed or returned no title, using fallback:', tab.title);
      }
      
      // Update the conversation title in state
      setConversationTitle(generatedTitle);
      
      // Create new conversation with FULL tab context for future Q&A
      const conversationWithMetadata = {
        ...summaryMessage,
        tabId: tab.id,
        tabUrl: tab.url,
        tabTitle: tab.title,
        tabSummary: tab.summary, // Store summary so Q&A works independently
        tabCategory: tab.category // Store category for suggested questions
      };
      
      // Save conversation first, then update with suggested questions if available
      await saveConversationToArchive(generatedTitle, [conversationWithMetadata]);
      
      // Store suggested questions in conversation if they were generated
      if (summarySuggestedQuestions.length > 0) {
        try {
          // Find the conversation we just created to update it with questions
          const conversationsResponse = await sendMessageToServiceWorker({
            action: 'GET_ARCHIVE_CONVERSATIONS'
          });
          if (conversationsResponse.success) {
            const newConversation = conversationsResponse.data.conversations.find((conv: any) => 
              conv.tabId === tab.id || (conv.title === generatedTitle && conv.messages?.length === 1)
            );
            if (newConversation) {
              await sendMessageToServiceWorker({
                action: 'UPDATE_CONVERSATION_MESSAGES',
                conversationId: newConversation.id,
                title: generatedTitle,
                messages: [conversationWithMetadata],
                suggestedQuestions: summarySuggestedQuestions
              });
            }
          }
        } catch (error) {
          console.error('[TabSense] Error saving suggested questions:', error);
        }
      }
      
      console.log('[TabSense] ✅ New conversation saved with title:', generatedTitle, 'for tab:', tab.id);
    } catch (error) {
      console.error('[TabSense] ❌ Error in openSummaryQA:', error);
      // Fallback title
      const fallbackTitle = tab.title;
      setConversationTitle(fallbackTitle);
      
      // Always save with fallback - include full context
      try {
        const conversationWithMetadata = {
          ...summaryMessage,
          tabId: tab.id,
          tabUrl: tab.url,
          tabTitle: tab.title,
          tabSummary: tab.summary,
          tabCategory: tab.category
        };
        await saveConversationToArchive(fallbackTitle, [conversationWithMetadata]);
        console.log('[TabSense] Saved conversation with fallback title:', fallbackTitle);
      } catch (saveError) {
        console.error('[TabSense] Failed to save conversation with fallback:', saveError);
      }
    }
    
    // Generate AI suggested questions based on the summary (only once, not on every restore)
    try {
      const questionsResponse = await sendMessageToServiceWorker({
        action: 'GENERATE_SUGGESTED_QUESTIONS',
        summary: tab.summary,
        category: tab.category,
        title: tab.title
      });
      
      if (questionsResponse.success && questionsResponse.data?.questions) {
        setSummarySuggestedQuestions(questionsResponse.data.questions);
        console.log('[TabSense] Generated suggested questions:', questionsResponse.data.questions);
        
        // Store questions in conversation immediately
        // Use the current conversationTitle or generatedTitle if available
        const currentTitle = conversationTitle || generatedTitle || tab.title;
        try {
          const conversationsResponse = await sendMessageToServiceWorker({
            action: 'GET_ARCHIVE_CONVERSATIONS'
          });
          if (conversationsResponse.success) {
            const newConversation = conversationsResponse.data.conversations.find((conv: any) => 
              conv.tabId === tab.id || (conv.title === currentTitle && conv.messages?.length === 1)
            );
            if (newConversation) {
              await sendMessageToServiceWorker({
                action: 'UPDATE_CONVERSATION_MESSAGES',
                conversationId: newConversation.id,
                title: currentTitle,
                messages: [summaryMessage],
                suggestedQuestions: questionsResponse.data.questions
              });
            }
          }
        } catch (error) {
          console.error('[TabSense] Error saving suggested questions:', error);
        }
      }
    } catch (error) {
      console.error('[TabSense] Error generating suggested questions:', error);
      // Continue without questions - not critical
    }
  };

  const closeSummaryQA = () => {
    // DON'T clear everything - preserve state so it can be restored
    // Only close the UI, keep the conversation data
    setIsSummaryQAExpanded(false);
    // Keep selectedSummaryForQA, messages, and title for potential restoration
    // setSelectedSummaryForQA(null);
    // setSummaryMessages([]);
    // setConversationTitle('');
    setSummaryQuestion(""); // Only clear the input
    setSummaryShowSuggestions(true);
    setSummaryIsMenuOpen(false);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden shadow-2xl">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <Header 
        title="TabSense AI"
        subtitle="Research Assistant"
        showSettings={true}
        showHistory={true}
        onSettingsClick={() => {
          console.log('[TabSense] Settings button clicked, showSettingsPage:', showSettingsPage);
          setShowSettingsPage(true);
          console.log('[TabSense] After setShowSettingsPage(true)');
        }}
        onHistoryClick={() => setIsArchiveExpanded(true)}
        onRefreshClick={refreshAndProcessTabs}
        serviceWorkerStatus={serviceWorkerStatus}
      />
      
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Settings Page */}
        {showSettingsPage ? (
          <SettingsPage 
            onClose={() => setShowSettingsPage(false)} 
            onDataAction={handleDataAction}
          />
        ) : isArchiveExpanded ? (
          <ArchiveSection
            conversations={conversationHistory}
            activeConversationId={activeConversationId}
            onClose={() => setIsArchiveExpanded(false)}
            onLoadConversation={async (id) => {
              console.log('[TabSense] Load conversation from history:', id);
              setActiveConversationId(id);
              // IMPORTANT: Set Q&A expanded FIRST to prevent showing tab list view
              setIsSummaryQAExpanded(true);
              
              try {
                // Get the conversation from backend
                const response = await sendMessageToServiceWorker({
                  action: 'GET_ARCHIVE_CONVERSATIONS'
                });
                
                if (response.success) {
                  const conversation = response.data.conversations.find((conv: any) => conv.id === id);
                  if (conversation) {
                    console.log('[TabSense] Loading conversation:', conversation.title);
                    console.log('[TabSense] Conversation has', conversation.messages?.length || 0, 'messages');
                    console.log('[TabSense] Conversation context:', {
                      tabUrl: conversation.tabUrl,
                      tabTitle: conversation.tabTitle,
                      hasSummary: !!conversation.tabSummary
                    });
                    
                    // Restore conversation state
                    setSummaryMessages(conversation.messages || []);
                    setConversationTitle(conversation.title);
                    
                    // Restore tab context from stored metadata so Q&A works
                    if (conversation.tabSummary && conversation.tabUrl) {
                      const restoredTab: TabSummary = {
                        id: conversation.tabId || `restored-${id}`,
                        title: conversation.tabTitle || conversation.title,
                        url: conversation.tabUrl,
                        summary: conversation.tabSummary,
                        category: conversation.tabCategory || 'generic',
                        favicon: Globe,
                        keyPoints: [],
                        analyzing: false
                      };
                      setSelectedSummaryForQA(restoredTab);
                      
                      // Only generate suggested questions if they don't exist already (prevent regeneration)
                      if (conversation.suggestedQuestions && conversation.suggestedQuestions.length > 0) {
                        setSummarySuggestedQuestions(conversation.suggestedQuestions);
                        console.log('[TabSense] Using stored suggested questions for loaded conversation');
                      } else {
                        // Generate suggested questions only if not stored
                        try {
                          const questionsResponse = await sendMessageToServiceWorker({
                            action: 'GENERATE_SUGGESTED_QUESTIONS',
                            summary: conversation.tabSummary,
                            category: conversation.tabCategory || 'generic',
                            title: conversation.tabTitle || conversation.title
                          });
                          
                          if (questionsResponse.success && questionsResponse.data?.questions) {
                            setSummarySuggestedQuestions(questionsResponse.data.questions);
                            console.log('[TabSense] Generated suggested questions for loaded conversation');
                            // Store questions in conversation for future use
                            await sendMessageToServiceWorker({
                              action: 'UPDATE_CONVERSATION_MESSAGES',
                              conversationId: conversation.id,
                              title: conversation.title,
                              messages: conversation.messages,
                              suggestedQuestions: questionsResponse.data.questions
                            });
                          }
                        } catch (error) {
                          console.error('[TabSense] Error generating questions for loaded conversation:', error);
                        }
                      }
                    } else {
                      // No stored context - conversation might be old format
                      console.warn('[TabSense] Loaded conversation has no stored context (old format?)');
                      setSelectedSummaryForQA(null);
                    }
                    
                    setSummaryQuestion("");
                    setSummaryShowSuggestions(true);
                    
                    // Close archive AFTER Q&A is set up
                    setIsArchiveExpanded(false);
                    
                    console.log('[TabSense] ✅ Conversation loaded successfully');
                  } else {
                    console.error('[TabSense] Conversation not found:', id);
                    setSummaryMessages([]);
                    setIsArchiveExpanded(false);
                  }
                } else {
                  console.error('[TabSense] Failed to load conversation:', response.error);
                  setSummaryMessages([]);
                  setIsArchiveExpanded(false);
                }
              } catch (error) {
                console.error('[TabSense] Error loading conversation:', error);
                setSummaryMessages([]);
                setIsArchiveExpanded(false);
              }
            }}
            onShareConversation={(id) => console.log('Share conversation:', id)}
            onDeleteConversation={async (id) => {
              console.log('Delete conversation:', id);
              
              try {
                const response = await sendMessageToServiceWorker({
                  action: 'DELETE_ARCHIVE_CONVERSATION',
                  conversationId: id
                });
                
                if (response.success) {
                  // Update local state
                  setConversationHistory(prev => prev.filter(conv => conv.id !== id));
                  if (activeConversationId === id) {
                    setActiveConversationId(null);
                    setMainMessages([]);
                  }
                  console.log('Conversation deleted successfully');
                } else {
                  console.error('Failed to delete conversation:', response.error);
                }
              } catch (error) {
                console.error('Error deleting conversation:', error);
              }
            }}
          />
        ) : isSummaryQAExpanded ? (
          /* Summary-Specific Q&A Section - Covers everything */
            <QASection
            question={summaryQuestion}
            setQuestion={setSummaryQuestion}
            messages={summaryMessages}
              isTyping={isTyping}
            showSuggestions={summaryShowSuggestions}
            setShowSuggestions={setSummaryShowSuggestions}
            isMenuOpen={summaryIsMenuOpen}
            setIsMenuOpen={setSummaryIsMenuOpen}
            onAskQuestion={handleSummaryAskQuestion}
              onShareClick={() => console.log('Share clicked')}
              onMenuAction={(action) => {
                console.log('Menu action:', action);
              setSummaryIsMenuOpen(false);
              }}
            onClose={closeSummaryQA}
            suggestedQuestions={summarySuggestedQuestions}
            conversationTitle={conversationTitle}
            loadingStage={loadingStage}
            serviceWorkerStatus={serviceWorkerStatus}
            onRegenerateQuestions={async () => {
              // Works for both active tabs and loaded conversations
              const summaryForQuestions = selectedSummaryForQA?.summary || 
                (activeConversationId ? (() => {
                  // Try to get summary from loaded conversation
                  const conv = conversationHistory.find(c => c.id === activeConversationId);
                  return null; // Will need to fetch from backend
                })() : null);
              
              if (!selectedSummaryForQA) {
                // Try to load conversation context if we have activeConversationId
                if (activeConversationId) {
                  try {
                    const convResponse = await sendMessageToServiceWorker({
                      action: 'GET_ARCHIVE_CONVERSATIONS'
                    });
                    const conversation = convResponse.data?.conversations?.find((c: any) => c.id === activeConversationId);
                    if (conversation?.tabSummary) {
                      setIsRegeneratingSummaryQuestions(true);
                      const questionsResponse = await sendMessageToServiceWorker({
                        action: 'GENERATE_SUGGESTED_QUESTIONS',
                        summary: conversation.tabSummary,
                        category: conversation.tabCategory || 'generic',
                        title: conversation.tabTitle || conversation.title
                      });
                      
                      if (questionsResponse.success && questionsResponse.data?.questions) {
                        setSummarySuggestedQuestions(questionsResponse.data.questions);
                        console.log('[TabSense] Regenerated suggested questions for loaded conversation');
                      }
                      setIsRegeneratingSummaryQuestions(false);
                      return;
                    }
                  } catch (error) {
                    console.error('[TabSense] Error loading conversation for questions:', error);
                  }
                }
                return;
              }
              
              setIsRegeneratingSummaryQuestions(true);
              try {
                const questionsResponse = await sendMessageToServiceWorker({
                  action: 'GENERATE_SUGGESTED_QUESTIONS',
                  summary: selectedSummaryForQA.summary,
                  category: selectedSummaryForQA.category,
                  title: selectedSummaryForQA.title
                });
                
                if (questionsResponse.success && questionsResponse.data?.questions) {
                  setSummarySuggestedQuestions(questionsResponse.data.questions);
                  console.log('[TabSense] Regenerated suggested questions:', questionsResponse.data.questions);
                }
              } catch (error) {
                console.error('[TabSense] Error regenerating suggested questions:', error);
              } finally {
                setIsRegeneratingSummaryQuestions(false);
              }
            }}
            isRegeneratingQuestions={isRegeneratingSummaryQuestions}
            />
        ) : (
          <>

        {/* Category Filter */}
        <div className="bg-muted/30">
          <div className="flex items-center gap-1">
            <div 
              className="flex gap-2 py-3 overflow-x-auto scrollbar-hide flex-1 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <cat.icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                  
                  {/* Dynamic Status Indicator */}
                  {processingStatus[cat.id] ? (
                    <div className="flex items-center gap-1 ml-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[10px] opacity-75">{processingStatus[cat.id]}</span>
                    </div>
                  ) : (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {cat.id === "all" ? tabs.length : tabs.filter(t => t.category === cat.id).length}
                  </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Summaries or Q&A Section */}
        {!isQAExpanded ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  {(() => {
                    const category = categories.find(c => c.id === selectedCategory);
                    const IconComponent = category?.icon;
                    return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
                  })()} {categories.find(c => c.id === selectedCategory)?.label}
                </h2>
                {tabs.some(t => t.analyzing) && (
                  <Badge variant="secondary" className="text-xs animate-pulse">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-2 pb-4 px-3">
                {isLoadingTabs ? (
                  <EmptyState type="loading" />
                ) : filteredTabs.length === 0 ? (
                  <EmptyState 
                    type="no-tabs" 
                    onRetry={loadRealTabData}
                  />
                ) : (
                  <div className="space-y-3">
                {filteredTabs.map((tab) => (
                  <Card 
                    key={tab.id} 
                    onClick={() => setExpandedTabId(expandedTabId === tab.id ? null : tab.id)}
                        className={`group p-3 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] overflow-hidden w-full max-w-full ${
                      tab.analyzing 
                        ? 'opacity-60 bg-primary/5' 
                        : 'bg-gradient-to-br from-card to-card/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform">
                            {typeof tab.favicon === 'string' ? (
                              <img 
                                src={tab.favicon} 
                                alt={`${tab.title} favicon`}
                                className="w-6 h-6 rounded-sm"
                                onError={(e) => {
                                  // Fallback to Globe icon if favicon fails to load
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'block';
                                }}
                              />
                            ) : (
                        <tab.favicon className="w-6 h-6 text-primary" />
                            )}
                            {/* Fallback Globe icon */}
                            <Globe className="w-6 h-6 text-primary hidden" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-medium flex-1 group-hover:text-primary transition-colors break-words">
                            {tab.title}
                          </h3>
                          {!tab.analyzing && (
                            <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                          )}
                          {tab.analyzing && (
                            <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                          )}
                        </div>
                        
                            <div className="flex items-center gap-2 mb-2">
                          <a 
                            href={`https://${tab.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                                title={tab.url}
                          >
                                <span className="truncate max-w-[120px]">{tab.url}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>

                        {/* Category-specific badges */}
                        {!tab.analyzing && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {tab.sentiment && tab.sentimentBreakdown && (
                              <Badge variant="outline" className={`text-[10px] ${getSentimentColor(tab.sentiment)} flex items-center gap-1`}>
                                {tab.sentiment === "positive" && <Smile className="w-3 h-3" />} 
                                {tab.sentiment === "negative" && <Frown className="w-3 h-3" />} 
                                {tab.sentiment === "neutral" && <Meh className="w-3 h-3" />} 
                                {tab.sentiment} ({tab.sentimentBreakdown[0]?.percentage}%)
                              </Badge>
                            )}
                            {tab.sentiment && !tab.sentimentBreakdown && (
                              <Badge variant="outline" className={`text-[10px] ${getSentimentColor(tab.sentiment)} flex items-center gap-1`}>
                                {tab.sentiment === "positive" && <Smile className="w-3 h-3" />} 
                                {tab.sentiment === "negative" && <Frown className="w-3 h-3" />} 
                                {tab.sentiment === "neutral" && <Meh className="w-3 h-3" />} 
                                {tab.sentiment}
                              </Badge>
                            )}
                            {tab.bias && (
                              <Badge variant="outline" className={`text-[10px] ${getBiasColor(tab.bias)}`}>
                                Bias: {tab.bias}
                              </Badge>
                            )}
                            {tab.engagementScore && (
                              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {tab.engagementScore}% engaged
                              </Badge>
                            )}
                            {/* Context Enhancement Indicators */}
                            {tab.metadata?.contextEnhanced && (
                              <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200 bg-purple-50 flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                Enhanced
                              </Badge>
                            )}
                            {tab.metadata?.summaryMethod === 'adaptive' && (
                              <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                Adaptive
                              </Badge>
                            )}
                            {tab.metadata?.cached && (
                              <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-50 flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                Cached
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Show first section preview when collapsed */}
                        {expandedTabId !== tab.id && !tab.analyzing && tab.summary && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {(() => {
                                // Extract just the Main Topic section for preview
                                const mainTopicMatch = tab.summary.match(/(?:📌|📰)\s*\*\*Main Topic:\*\*\s*([^\n]+)/);
                                if (mainTopicMatch && mainTopicMatch[1]) {
                                  return mainTopicMatch[1].trim();
                                }
                                
                                // Fallback: Extract the first section
                                const firstSection = tab.summary.split('\n\n')[0] || tab.summary;
                                const preview = firstSection.length > 150 
                                  ? firstSection.substring(0, 150).replace(/^\*\*[^*]+\*\*\s*/, '').trim() + '...' 
                                  : firstSection.replace(/^\*\*[^*]+\*\*\s*/, '').trim();
                                return preview;
                              })()}
                            </p>
                          </div>
                        )}
                        
                        {/* Expanded content - Show only a preview */}
                        {expandedTabId === tab.id && !tab.analyzing && (
                          <div className="animate-fade-in mt-3 space-y-3 overflow-hidden">
                            {/* Summary Preview - Just show more text */}
                            <div className="space-y-1.5 overflow-hidden">
                              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                                {(() => {
                                  // Show the full Main Topic section plus a bit more
                                  const fullSummary = tab.summary;
                                  const preview = fullSummary.length > 300 
                                    ? fullSummary.substring(0, 300) + '...' 
                                    : fullSummary;
                                  return preview;
                                })()}
                              </p>
                            </div>

                                {/* YouTube-specific information */}
                                {tab.youtubeData && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <Video className="w-4 h-4 text-primary" />
                                      <h4 className="text-xs font-bold text-foreground">Video Details</h4>
                                    </div>
                                    <div className="pl-6 space-y-2">
                                      {tab.youtubeData.video?.channel && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Channel:</span> {tab.youtubeData.video.channel}
                                        </div>
                                      )}
                                      {tab.youtubeData.video?.views && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Views:</span> {tab.youtubeData.video.views}
                                        </div>
                                      )}
                                      {tab.youtubeData.video?.likes && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Likes:</span> {tab.youtubeData.video.likes}
                                        </div>
                                      )}
                                      {tab.youtubeData.comments && tab.youtubeData.comments.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Comments:</span> {tab.youtubeData.comments.length} extracted
                                        </div>
                                      )}
                                      {tab.youtubeData.video?.transcript && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Transcript:</span> Available ({tab.youtubeData.video.transcript.length} segments)
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Processing Information */}
                                {(tab.metadata?.summaryMethod || tab.metadata?.contextEnhanced || tab.metadata?.cached) && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5">
                                      <Settings className="w-4 h-4 text-primary" />
                                      <h4 className="text-xs font-bold text-foreground">Processing Details</h4>
                                    </div>
                                    <div className="pl-6 space-y-2">
                                      {tab.metadata?.summaryMethod && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Zap className="w-3 h-3" />
                                          <span className="font-medium">Method:</span> {tab.metadata.summaryMethod === 'adaptive' ? 'Adaptive AI Summarization' : 'Basic AI Summarization'}
                                        </div>
                                      )}
                                      {tab.metadata?.contextEnhanced && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Brain className="w-3 h-3" />
                                          <span className="font-medium">Context:</span> Enhanced with external data ({tab.metadata.contextSources?.length || 0} sources)
                                        </div>
                                      )}
                                      {tab.metadata?.cached && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Download className="w-3 h-3" />
                                          <span className="font-medium">Cache:</span> Summary retrieved from cache
                                        </div>
                                      )}
                                      {tab.metadata?.processedAt && (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-medium">Processed:</span> {new Date(tab.metadata.processedAt).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                            {/* More Button */}
                            <div className="pt-2 border-t border-border/20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSummaryQA(tab);
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <Sparkles className="w-3 h-3" />
                                Ask Questions
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {tab.analyzing && (
                          <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            AI is analyzing this {tab.category}...
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Q&A Expanded Section */
          <QASection
            question={mainQuestion}
            setQuestion={setMainQuestion}
            messages={mainMessages}
            isTyping={isTyping}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            onAskQuestion={handleMainAskQuestion}
            onShareClick={() => console.log('Share clicked')}
            onMenuAction={(action) => {
              console.log('Menu action:', action);
              setIsMenuOpen(false);
            }}
            suggestedQuestions={mainSuggestedQuestions}
            loadingStage={loadingStage}
            serviceWorkerStatus={serviceWorkerStatus}
            onRegenerateQuestions={async () => {
              setIsRegeneratingMainQuestions(true);
              try {
                const categoryTabs = filteredTabs;
                const categorySummaries = categoryTabs
                  .filter(tab => tab.summary && tab.summary.length > 0)
                  .map(tab => tab.summary)
                  .join('\n\n');
                
                if (categorySummaries.length > 0) {
                  const questionsResponse = await sendMessageToServiceWorker({
                    action: 'GENERATE_SUGGESTED_QUESTIONS',
                    summary: categorySummaries.substring(0, 2000),
                    category: selectedCategory === 'all' ? 'generic' : selectedCategory,
                    title: `${categories.find(c => c.id === selectedCategory)?.label || 'All'} Content Query`
                  });
                  
                  if (questionsResponse.success && questionsResponse.data?.questions) {
                    setMainSuggestedQuestions(questionsResponse.data.questions);
                    console.log('[TabSense] Regenerated main suggested questions:', questionsResponse.data.questions);
                  }
                }
              } catch (error) {
                console.error('[TabSense] Error regenerating main suggested questions:', error);
              } finally {
                setIsRegeneratingMainQuestions(false);
              }
            }}
            isRegeneratingQuestions={isRegeneratingMainQuestions}
          />
        )}

        {/* Ask AI Section - Only show when not in summary QA mode */}
        {!isSummaryQAExpanded && (
          <div className="bg-muted/10 rounded-b-lg">
            <div className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <button 
                onClick={() => {
                  if (isQAExpanded) {
                    setIsArchiveExpanded(true);
                  } else {
                    setIsQAExpanded(!isQAExpanded);
                  }
                }}
                className="flex items-center gap-2 flex-1"
              >
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  {isQAExpanded ? (
                    <Archive className="w-3 h-3 text-primary" />
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-primary" />
                      Ask Questions
                    </>
                  )}
                </h2>
              </button>
              <button
                onClick={() => setIsQAExpanded(!isQAExpanded)}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
              >
                <ChevronDown 
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    isQAExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        <div className="h-0">
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TabSenseSidebar;
