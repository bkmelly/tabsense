import React, { useState } from 'react';
import { 
  Sparkles, Download, Send, X, Loader2, CheckCircle2, ExternalLink, ChevronDown, ChevronLeft, ChevronRight,
  Globe, BookOpen, Video, MessageSquare, Newspaper, Zap, Flame, Brain, Lightbulb, 
  Smile, Frown, Meh, Star, HelpCircle, ThumbsUp, ThumbsDown, Minus, MoreVertical, Share2, 
  Copy, Trash2, Settings, History, Eye, EyeOff, Archive
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import ArchiveSection from '../components/ArchiveSection';
import QASection from '../components/QASection';

interface TabSummary {
  id: string;
  title: string;
  url: string;
  favicon: React.ComponentType<{ className?: string }>;
  summary: string;
  keyPoints: string[];
  analyzing?: boolean;
  category: "documentation" | "youtube" | "forum" | "news";
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
  const [tabs, setTabs] = useState<TabSummary[]>(initialTabs);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isQAExpanded, setIsQAExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [isSummaryQAExpanded, setIsSummaryQAExpanded] = useState(false);
  const [selectedSummaryForQA, setSelectedSummaryForQA] = useState<TabSummary | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const filteredTabs = selectedCategory === "all" 
    ? tabs 
    : tabs.filter(tab => tab.category === selectedCategory);

  // Sample conversation history
  const conversationHistory = [
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
  ];

  const handleAskQuestion = () => {
    if (!question.trim() || isTyping) return;
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = { role: "user" as const, content: question, timestamp };
    setMessages(prev => [...prev, newMessage]);
    setQuestion("");
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const response = aiResponses[question.toLowerCase()] || aiResponses.default;
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: "assistant", content: response, timestamp: responseTimestamp }]);
      setIsTyping(false);
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
    setSelectedSummaryForQA(tab);
    setIsSummaryQAExpanded(true);
  };

  const closeSummaryQA = () => {
    setIsSummaryQAExpanded(false);
    setSelectedSummaryForQA(null);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <Header 
        title="TabSense AI"
        subtitle="Research Assistant"
        showSettings={true}
        showHistory={true}
        onSettingsClick={() => console.log('Settings clicked')}
        onHistoryClick={() => setIsArchiveExpanded(true)}
      />
      
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
            }}
            onShareConversation={(id) => console.log('Share conversation:', id)}
            onDeleteConversation={(id) => console.log('Delete conversation:', id)}
          />
        ) : isSummaryQAExpanded ? (
          /* Summary-Specific Q&A Section - Covers everything */
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Ask Questions - {selectedSummaryForQA?.title}
                </h2>
                <button
                  onClick={closeSummaryQA}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <QASection
              question={question}
              setQuestion={setQuestion}
              messages={messages}
              isTyping={isTyping}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              onAskQuestion={handleAskQuestion}
              onShareClick={() => console.log('Share clicked')}
              onMenuAction={(action) => {
                console.log('Menu action:', action);
                setIsMenuOpen(false);
              }}
            />
          </div>
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
              <div className="space-y-3 py-2 pb-4 px-3">
                {filteredTabs.map((tab) => (
                  <Card 
                    key={tab.id} 
                    onClick={() => setExpandedTabId(expandedTabId === tab.id ? null : tab.id)}
                    className={`group p-3 transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] overflow-hidden ${
                      tab.analyzing 
                        ? 'opacity-60 bg-primary/5' 
                        : 'bg-gradient-to-br from-card to-card/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 group-hover:scale-110 transition-transform">
                        <tab.favicon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium flex-1 group-hover:text-primary transition-colors overflow-hidden text-ellipsis whitespace-nowrap">
                            {tab.title}
                          </h3>
                          {!tab.analyzing && (
                            <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                          )}
                          {tab.analyzing && (
                            <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2 overflow-hidden">
                          <a 
                            href={`https://${tab.url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 flex-1 min-w-0 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{tab.url}</span>
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
                {filteredTabs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {categories.find(c => c.id === selectedCategory)?.label.toLowerCase()} yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Q&A Expanded Section */
          <QASection
            question={question}
            setQuestion={setQuestion}
            messages={messages}
            isTyping={isTyping}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            onAskQuestion={handleAskQuestion}
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
