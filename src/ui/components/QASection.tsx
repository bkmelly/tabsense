import React, { useState } from 'react';
import { 
  Send, Loader2, Share2, MoreVertical, Copy, Trash2, Settings, History, 
  Eye, EyeOff, Lightbulb, ExternalLink, Smile, ChevronDown, Brain, BarChart3, FileText, Archive, Sparkles, Download
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import SuggestedQuestionsSection from './SuggestedQuestionsSection';
import TextArea from './TextArea';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface QASectionProps {
  question: string;
  setQuestion: (q: string) => void;
  messages: Message[];
  isTyping: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  onAskQuestion: () => void;
  onShareClick: () => void;
  onMenuAction: (action: string) => void;
  onClose?: () => void;
}

const QASection: React.FC<QASectionProps> = ({
  question,
  setQuestion,
  messages,
  isTyping,
  showSuggestions,
  setShowSuggestions,
  isMenuOpen,
  setIsMenuOpen,
  onAskQuestion,
  onShareClick,
  onMenuAction,
  onClose
}) => {
  const suggestedQuestions = [
    { text: "What is React?", icon: Lightbulb },
    { text: "Explain React hooks", icon: ExternalLink },
    { text: "Analyze sentiment in comments", icon: Smile },
    { text: "What are the key differences between React and Vue?", icon: Lightbulb },
    { text: "How does state management work in React?", icon: ExternalLink },
    { text: "What are the best practices for React components?", icon: Smile },
    { text: "Explain the React lifecycle methods", icon: Lightbulb },
    { text: "How to optimize React performance?", icon: ExternalLink },
    { text: "What is the difference between useState and useEffect?", icon: Lightbulb },
    { text: "How to handle forms in React?", icon: ExternalLink },
    { text: "What are React Context and Redux?", icon: Smile },
    { text: "How to test React components?", icon: Lightbulb },
    { text: "What is React Router?", icon: ExternalLink },
    { text: "How to optimize React bundle size?", icon: Smile },
    { text: "What are React Portals?", icon: Lightbulb },
    { text: "How to handle errors in React?", icon: ExternalLink },
    { text: "What is React Suspense?", icon: Lightbulb },
    { text: "How to use React.memo?", icon: ExternalLink },
    { text: "What are React Fragments?", icon: Smile },
    { text: "How to implement React lazy loading?", icon: Lightbulb },
    { text: "What is React Concurrent Mode?", icon: ExternalLink },
    { text: "How to handle React state updates?", icon: Smile },
    { text: "What are React Custom Hooks?", icon: Lightbulb },
    { text: "How to optimize React re-renders?", icon: ExternalLink },
    { text: "What is React Error Boundary?", icon: Smile },
    { text: "How to use React DevTools?", icon: Lightbulb }
  ];

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleShuffle = () => {
    const shuffled = [...suggestedQuestions].sort(() => Math.random() - 0.5);
    // You can implement shuffle logic here
    console.log('Shuffled questions:', shuffled);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        {messages.length > 0 && messages[0].role === "assistant" && messages[0].content.includes("**Summary**") ? (
          <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Chrome Extension Development Guide
        </h2>
            <button
              onClick={() => onClose ? onClose() : setIsCollapsed(!isCollapsed)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown 
                className={`w-3 h-3 transition-transform duration-200 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
              />
                </button>
              </div>
        ) : (
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            Ask Questions
          </h2>
        )}
            </div>
            
      <div className="flex-1 flex flex-col px-3 pb-4 relative">
        {!isCollapsed && (
          <>
            {/* Text Area Component */}
            <TextArea 
              messages={messages} 
              showSuggestions={showSuggestions} 
              isTyping={isTyping} 
            />

            {/* Suggested Questions Section - Absolutely positioned with white background */}
            {showSuggestions && (
              <div className="absolute bottom-16 left-3 right-3 bg-white rounded-lg border border-border/20 shadow-sm">
                <SuggestedQuestionsSection
                  showSuggestions={showSuggestions}
                  setShowSuggestions={setShowSuggestions}
                  onQuestionClick={(question) => setQuestion(question)}
                  onShuffle={handleShuffle}
                />
          </div>
        )}

                {/* Show suggestions button when hidden - Above input */}
        {!showSuggestions && (
                  <div className="absolute bottom-16 left-3 right-3 flex justify-center">
            <button
              onClick={() => setShowSuggestions(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" />
              Show suggestions
            </button>
          </div>
        )}

            {/* Input Section - Absolutely positioned at bottom */}
            <div className="absolute bottom-3 left-3 right-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                    placeholder="Ask about this summary..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && onAskQuestion()}
                disabled={isTyping}
                    className="w-full pr-20 bg-muted/30 hover:bg-muted/50 border-border/20 focus:border-primary/50 transition-all"
              />
              <button
                onClick={onAskQuestion}
                disabled={!question.trim() || isTyping}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                      <Send className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
                <div className="flex gap-1">
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 hover:bg-muted/50"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon"
                    variant="ghost"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="h-10 w-10 hover:bg-muted/50"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                      </div>
                    </div>
                  </>
                )}
      </div>
    </div>
  );
};

export default QASection;
