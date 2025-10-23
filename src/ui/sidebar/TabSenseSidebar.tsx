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
import EmptyState from '../components/EmptyState';
import { ToastContainer, useToast } from '../components/Toast';

// Import content processing utilities
import { ContentCleaner } from '../../lib/contentCleaner';
import { ContentScorer } from '../../lib/contentScorer';
import { PageClassifier } from '../../lib/pageClassifier';
import { URLFilter } from '../../lib/urlFilter';

// Service Worker Communication Interface
interface ServiceWorkerMessage {
  action: string;
  payload?: any;
}

interface ServiceWorkerResponse {
  success: boolean;
  data?: any;
  error?: string;
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
  category: "documentation" | "youtube" | "forum" | "news" | "blog" | "ecommerce" | "reference" | "academic" | "generic";
  
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
}

const categories = [
  { id: "all", label: "All Tabs", icon: Globe },
  { id: "documentation", label: "Documentation", icon: BookOpen },
  { id: "youtube", label: "YouTube", icon: Video },
  { id: "forum", label: "Forums", icon: MessageSquare },
  { id: "news", label: "News", icon: Newspaper },
];

const initialTabs: TabSummary[] = [
  {
    id: "1",
    title: "React Documentation - Quick Start",
    url: "react.dev/learn",
    favicon: Zap,
    category: "documentation",
    summary: "Introduction to React fundamentals including components, props, and state management. Covers JSX syntax, component composition, and the React rendering cycle.",
    keyPoints: [
      "React components are JavaScript functions that return markup",
      "Use useState for adding state to components",
      "Props pass data from parent to child components",
      "useEffect handles side effects and lifecycle events"
    ]
  },
  {
    id: "2",
    title: "AI Will Replace Developers? - Fireship",
    url: "youtube.com/watch?v=xyz",
    favicon: Flame,
    category: "youtube",
    sentiment: "neutral",
    engagementScore: 92,
    summary: "Discussion on AI's impact on software development. Covers current AI capabilities, limitations, and future outlook for developers in an AI-enhanced world.",
    sentimentBreakdown: [
      { label: "Optimistic about AI as a tool", percentage: 52, emoji: Star },
      { label: "Concerned about job security", percentage: 28, emoji: Frown },
      { label: "Neutral/Wait and see", percentage: 20, emoji: HelpCircle }
    ],
    keyPoints: [
      "AI is augmenting, not replacing developers",
      "Focus on problem-solving skills remains crucial",
      "New AI tools require learning and adaptation"
    ]
  },
  {
    id: "3",
    title: "Chrome Extension Development Guide",
    url: "developer.chrome.com/docs/extensions",
    favicon: Globe,
    category: "documentation",
    sentiment: "positive",
    bias: "center",
    engagementScore: 85,
    summary: "Comprehensive guide to building Chrome extensions using Manifest V3. Covers service workers, content scripts, and modern extension architecture.",
    keyPoints: [
      "Manifest V3 introduces service workers",
      "Content scripts run in web page context",
      "Background scripts replaced by service workers"
    ]
  }
];

const aiResponses: Record<string, string> = {
  "what is react": "React is a JavaScript library for building user interfaces. Based on your open tabs, React uses a component-based architecture where UIs are built from reusable pieces. The documentation you have open covers the fundamentals including JSX, components, props, and hooks like useState and useEffect.",
  "hooks": "React Hooks are functions that let you use state and other React features in functional components. From the React documentation tab, the main hooks are:\n\n• useState - adds state to components\n• useEffect - handles side effects\n• useContext - accesses context\n• useCallback/useMemo - optimize performance",
  "components": "Components are the building blocks of React apps. According to your React documentation tab, components are JavaScript functions that return JSX markup. They can accept props as input and maintain their own state using hooks. Components should be reusable and composable.",
  "typescript": "TypeScript adds static typing to JavaScript. Your TypeScript Handbook tab covers type annotations, interfaces, generics, and how to use types to catch errors during development. It integrates seamlessly with React through typed props and state.",
  "default": "I've analyzed your open tabs on React, TypeScript, and Tailwind. I can help you understand concepts from these docs, compare approaches, or find specific information. Try asking about React hooks, TypeScript types, or Tailwind utilities!"
};

const TabSenseSidebar: React.FC = () => {
  // ==================== STATE MANAGEMENT ====================
  
  // Core Tab Data State
  const [tabs, setTabs] = useState<TabSummary[]>(initialTabs);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // Toast notifications
  const { toasts, error: showError, success: showSuccess, removeToast } = useToast();
  
  // Content Processing
  const contentCleaner = new ContentCleaner();
  const contentScorer = new ContentScorer();
  const pageClassifier = new PageClassifier();
  const urlFilter = new URLFilter();
  
  // Main Q&A State (All Tabs)
  const [mainQuestion, setMainQuestion] = useState("");
  const [mainMessages, setMainMessages] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isQAExpanded, setIsQAExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Archive State
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  
  // Summary-Specific Q&A State (Separate from Main Q&A)
  const [isSummaryQAExpanded, setIsSummaryQAExpanded] = useState(false);
  const [selectedSummaryForQA, setSelectedSummaryForQA] = useState<TabSummary | null>(null);
  const [summaryQuestion, setSummaryQuestion] = useState("");

  // ==================== CONTENT PROCESSING UTILITIES ====================

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
    
    return contentCleaner.normalizeWhitespace(
      contentCleaner.normalizeCharacters(content)
    );
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
        // Test service worker connectivity
        const pingResponse = await sendMessageToServiceWorker({ action: 'PING' });
        
        if (pingResponse.success) {
          setServiceWorkerStatus('connected');
          console.log('[TabSense] Service worker connected:', pingResponse.data);
          
          // Load real tab data from service worker
          await loadRealTabData();
        } else {
          setServiceWorkerStatus('error');
          console.error('[TabSense] Service worker connection failed:', pingResponse.error);
          showError(
            'Service worker connection failed',
            pingResponse.error || 'Unable to connect to background service',
            8000
          );
        }
      } catch (error) {
        setServiceWorkerStatus('error');
        console.error('[TabSense] Failed to initialize service worker:', error);
        showError(
          'Service worker initialization failed',
          `Failed to initialize: ${error.message}`,
          8000
        );
      }
    };

    initializeServiceWorker();
  }, []);

  /**
   * Load real tab data from service worker using GET_MULTI_TAB_COLLECTION
   */
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
        
        // Filter out non-processable URLs using URLFilter
        const processableTabs = urlFilter.filterTabs(tabsData);
        
        // Get filtering statistics
        const filterStats = urlFilter.getFilteringStats(tabsData, processableTabs);
        console.log('[TabSense] URL filtering stats:', filterStats);
        
        if (processableTabs.length === 0) {
          showError(
            'No processable content found',
            'All tabs were filtered out. Try opening some content pages.',
            8000
          );
          return;
        }
        
        const realTabs = await Promise.all(processableTabs.map(async (tab: any, index: number) => {
          try {
            // Clean and validate URL
            const cleanUrl = validateAndCleanUrl(tab.url || '');
            
            // Clean and normalize title
            const cleanTitle = cleanContent(tab.title || 'Untitled');
            
            // Process comprehensive metadata using enhanced ContentScorer
            const enhancedMetadata = await contentScorer.processMetadata({
              url: cleanUrl,
              title: cleanTitle,
              content: tab.content || '',
              metadata: tab.metadata || {},
              structure: tab.structure || {}
            });
            
            // Check if this is YouTube data
            const isYouTubeData = tab.type === 'youtube' || tab.video || tab.comments;
            
            // Create clean summary from content
            const cleanSummary = createCleanSummary(tab.content || '', cleanTitle);
            
            // Create YouTube-specific key points if available
            let keyPoints: string[] = [];
            if (isYouTubeData && tab.video) {
              keyPoints = [
                `📺 ${tab.video.channel || 'Unknown Channel'}`,
                `👀 ${tab.video.views || 'Unknown views'}`,
                `👍 ${tab.video.likes || 'Unknown likes'}`,
                `💬 ${tab.comments?.length || 0} comments`,
                tab.video.transcript ? `📝 Transcript available` : `📝 No transcript`
              ];
            } else {
              keyPoints = [
                `📊 Quality: ${enhancedMetadata.qualityScore}/100`,
                `📖 ${enhancedMetadata.readingTime}`,
                `🏷️ ${enhancedMetadata.category || 'General'}`,
                `👤 ${enhancedMetadata.author || 'Unknown author'}`
              ];
            }
            
            return {
              id: `real-${index}`,
              title: cleanTitle,
              url: cleanUrl,
              favicon: urlFilter.getFaviconUrl(cleanUrl), // Dynamic favicon URL
              summary: cleanSummary,
              keyPoints: keyPoints,
              analyzing: false,
              category: (enhancedMetadata.category || 'generic') as "documentation" | "youtube" | "forum" | "news" | "blog" | "ecommerce" | "reference" | "academic" | "generic",
              // Enhanced metadata
              author: enhancedMetadata.author,
              publishedTime: enhancedMetadata.publishedTime,
              description: enhancedMetadata.description,
              tags: enhancedMetadata.tags,
              topics: enhancedMetadata.topics,
              wordCount: enhancedMetadata.wordCount,
              readingTime: enhancedMetadata.readingTime,
              qualityScore: enhancedMetadata.qualityScore,
              // YouTube-specific data
              ...(isYouTubeData && {
                youtubeData: {
                  video: tab.video,
                  comments: tab.comments,
                  metadata: tab.metadata
                }
              })
            };
          } catch (error) {
            console.error('[TabSense] Error processing tab:', tab.url, error);
            showError(
              'Failed to process tab',
              `Error processing ${tab.title || tab.url}: ${error.message}`,
              6000
            );
            return null;
          }
        }));
        
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
        
        console.log('[TabSense] Transformed tabs with content cleaning and URL filtering:', validTabs);
        setTabs(validTabs);
        console.log('[TabSense] Loaded real tab data:', validTabs.length, 'tabs');
        
        showSuccess(
          'Tabs loaded successfully',
          `Processed ${validTabs.length} tabs with ${filterStats.filteredCount} filtered out`,
          4000
        );
      } else {
        console.warn('[TabSense] No real tab data available, using initial tabs');
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
  const [summaryMessages, setSummaryMessages] = useState<Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>>([]);
  const [summaryShowSuggestions, setSummaryShowSuggestions] = useState(true);
  const [summaryIsMenuOpen, setSummaryIsMenuOpen] = useState(false);
  
  // Conversation History State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const filteredTabs = selectedCategory === "all" 
    ? tabs 
    : tabs.filter(tab => tab.category === selectedCategory);

  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState([
    {
      id: '1',
      title: 'React Performance Optimization'
    },
    {
      id: '2', 
      title: 'Understanding React Hooks'
    },
    {
      id: '3',
      title: 'Tab Analysis Results'
    },
    {
      id: '4',
      title: 'Code Review Questions'
    },
    {
      id: '5',
      title: 'Web Development Best Practices'
    },
    {
      id: '6',
      title: 'API Integration Help'
    },
    {
      id: '7',
      title: 'CSS Styling Questions'
    },
    {
      id: '8',
      title: 'Database Design Discussion'
    }
  ]);

  const saveConversationToArchive = (title: string, messages: Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>) => {
    const conversationId = `conv-${Date.now()}`;
    const newConversation = {
      id: conversationId,
      title: title
    };
    
    setConversationHistory(prev => [newConversation, ...prev]);
    setActiveConversationId(conversationId);
    
    // Store the messages for this conversation (in a real app, this would be saved to a database)
    console.log(`Saved conversation "${title}" with ${messages.length} messages to archive`);
  };

  const handleMainAskQuestion = () => {
    if (!mainQuestion.trim() || isTyping) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = { role: "user" as const, content: mainQuestion, timestamp };
    const updatedMessages = [...mainMessages, newMessage];
    setMainMessages(updatedMessages);
    setMainQuestion("");
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const response = aiResponses[mainQuestion.toLowerCase()] || aiResponses.default;
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalMessages = [...updatedMessages, { role: "assistant" as const, content: response, timestamp: responseTimestamp }];
      setMainMessages(finalMessages);
      setIsTyping(false);
      
      // Save to archive after first exchange
      if (updatedMessages.length === 1) {
        saveConversationToArchive(`Main Q&A: ${mainQuestion.substring(0, 30)}...`, finalMessages);
      }
    }, 1500);
  };

  const handleSummaryAskQuestion = () => {
    if (!summaryQuestion.trim() || isTyping) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = { role: "user" as const, content: summaryQuestion, timestamp };
    const updatedMessages = [...summaryMessages, newMessage];
    setSummaryMessages(updatedMessages);
    setSummaryQuestion("");
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const response = aiResponses[summaryQuestion.toLowerCase()] || aiResponses.default;
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalMessages = [...updatedMessages, { role: "assistant" as const, content: response, timestamp: responseTimestamp }];
      setSummaryMessages(finalMessages);
      setIsTyping(false);
      
      // Save to archive after first exchange
      if (updatedMessages.length === 1) {
        const summaryTitle = selectedSummaryForQA?.title || "Unknown Summary";
        saveConversationToArchive(`Summary Q&A: ${summaryTitle} - ${summaryQuestion.substring(0, 20)}...`, finalMessages);
      }
    }, 1500);
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

  const openSummaryQA = (tab: TabSummary) => {
    // Create a new conversation with the full summary
    const conversationId = `summary-${tab.id}-${Date.now()}`;
    const conversationTitle = `Summary: ${tab.title}`;
    
    // Create formatted summary message with proper icons and structure
    const formattedContent = `**Summary**

${tab.summary}

**Key Points**
${tab.keyPoints.map(point => `• ${point}`).join('\n')}

${tab.sentimentBreakdown ? `**Sentiment Analysis**\n${tab.sentimentBreakdown.map(item => `• ${item.label}: ${item.percentage}%`).join('\n')}\n` : ''}${tab.engagementScore ? `**Engagement Score**: ${tab.engagementScore}%\n` : ''}${tab.bias ? `**Bias**: ${tab.bias}\n` : ''}

**Additional Context**
• This is a comprehensive analysis of the content
• The summary provides key insights and main points
• Sentiment analysis helps understand the overall tone
• Engagement metrics show how well the content performs

**Technical Details**
• Content has been processed and analyzed
• Key themes have been extracted and categorized
• The analysis includes both quantitative and qualitative insights
• This summary can be used for further research and analysis

---
*This conversation was created from the summary of "${tab.title}". You can now ask questions about this content.*`;
    
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
  };

  const closeSummaryQA = () => {
    setIsSummaryQAExpanded(false);
    setSelectedSummaryForQA(null);
    setSummaryMessages([]);
    setSummaryQuestion("");
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
        onSettingsClick={() => console.log('Settings clicked')}
        onHistoryClick={() => setIsArchiveExpanded(true)}
      />
      
      {/* Service Worker Status Indicator */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              serviceWorkerStatus === 'connected' ? 'bg-green-500' : 
              serviceWorkerStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              Service Worker: {serviceWorkerStatus}
            </span>
            {isLoadingTabs && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadRealTabData}
            className="text-xs h-6 px-2"
          >
            Refresh Tabs
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Archive Section - Covers everything */}
        {isArchiveExpanded ? (
          <ArchiveSection
            conversations={conversationHistory}
            activeConversationId={activeConversationId}
            onClose={() => setIsArchiveExpanded(false)}
            onLoadConversation={(id) => {
              console.log('Load conversation:', id);
              setActiveConversationId(id);
              setIsArchiveExpanded(false);
              
              // Load conversation messages based on ID
              if (id.startsWith('summary-')) {
                // This is a summary-based conversation, we'll need to reconstruct it
                // For now, we'll show a placeholder message with proper formatting
                setMainMessages([{
                  role: "assistant",
                  content: `**Summary**

This conversation was created from a tab summary. The original summary content would be loaded here with proper formatting including:

**Key Points**
• Structured bullet points
• Clean minimalist design
• Organized sections

**Additional Data**
• Sentiment analysis (if available)
• Engagement scores
• Bias information

---
*This is a reconstructed conversation from the conversation history.*`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
              } else {
                // Load existing conversation messages
                setMainMessages([]);
              }
            }}
            onShareConversation={(id) => console.log('Share conversation:', id)}
            onDeleteConversation={(id) => console.log('Delete conversation:', id)}
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
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {cat.id === "all" ? tabs.length : tabs.filter(t => t.category === cat.id).length}
                  </Badge>
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
                          </div>
                        )}
                        
                        {/* Expanded content */}
                        {expandedTabId === tab.id && !tab.analyzing && (
                          <div className="animate-fade-in mt-3 space-y-3 overflow-hidden">
                            {/* Summary Section */}
                            <div className="space-y-1.5 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <Brain className="w-4 h-4 text-primary" />
                                <h4 className="text-xs font-bold text-foreground">Summary</h4>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed pl-6 break-words">
                                {tab.summary}
                              </p>
                            </div>

                            {/* Key Points */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-primary" />
                                <h4 className="text-xs font-bold text-foreground">Key Points</h4>
                              </div>
                              <div className="pl-6 space-y-2">
                                <ul className="space-y-1.5">
                                  {tab.keyPoints.map((point, idx) => (
                                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2 overflow-hidden">
                                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                                      <span className="flex-1 break-words">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
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
