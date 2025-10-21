import React from 'react';
import { 
  Send, Loader2, Share2, MoreVertical, Copy, Trash2, Settings, History, 
  Eye, EyeOff, Lightbulb, ExternalLink, Smile, ChevronDown 
} from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

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
  onMenuAction
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

  const handleShuffle = () => {
    const shuffled = [...suggestedQuestions].sort(() => Math.random() - 0.5);
    // You can implement shuffle logic here
    console.log('Shuffled questions:', shuffled);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          Ask Questions
        </h2>
      </div>
      
      <div className="flex-1 flex flex-col px-3 pb-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-medium">AI Assistant Ready</span>
                </div>
                <p className="text-xs">Ask me anything about your open tabs</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-line transition-all relative ${
                  msg.role === "user"
                    ? "bg-black text-white ml-8"
                    : "bg-muted/50 mr-8"
                }`}
              >
                {msg.content}
                {msg.timestamp && (
                  <div className="absolute top-2 right-2 text-xs opacity-60">
                    {msg.timestamp}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="p-3 rounded-xl text-sm bg-muted/50 mr-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Questions - Scrollable */}
        {showSuggestions && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Suggested Questions</span>
              <div className="flex gap-2">
                <button
                  onClick={handleShuffle}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shuffle
                </button>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Hide suggestions"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <div className="max-h-32 overflow-y-auto scrollbar-hide">
              <div className="space-y-2 pr-2">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(q.text)}
                    className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.02] border border-border/20 flex items-center gap-2"
                  >
                    <q.icon className="w-3 h-3" />
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Show suggestions button when hidden */}
        {!showSuggestions && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowSuggestions(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" />
              Show suggestions
            </button>
          </div>
        )}

        {/* Input Section */}
        <div className="mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Ask about your tabs..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && onAskQuestion()}
                disabled={isTyping}
                className="flex-1 bg-muted/50 border-border/50 focus:border-primary/50 transition-all pr-10"
              />
              <button
                onClick={onAskQuestion}
                disabled={!question.trim() || isTyping}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                ) : (
                  <Send className="h-4 w-4 text-black" />
                )}
              </button>
            </div>
            
            <div className="flex gap-1 relative">
              <button
                onClick={onShareClick}
                className="p-2 hover:bg-muted/50 rounded transition-colors"
                title="Share conversation"
              >
                <Share2 className="h-4 w-4 text-black" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-muted/50 rounded transition-colors"
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4 text-black" />
                </button>
                
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsMenuOpen(false)}
                    />
                    
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-border/20 rounded-lg shadow-lg z-20">
                      <div className="py-1">
                        <button
                          onClick={() => onMenuAction('copy')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Copy conversation
                        </button>
                        <button
                          onClick={() => onMenuAction('clear')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear history
                        </button>
                        <button
                          onClick={() => onMenuAction('history')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                        >
                          <History className="h-4 w-4" />
                          View history
                        </button>
                        <div className="border-t border-border/20 my-1"></div>
                        <button
                          onClick={() => onMenuAction('settings')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QASection;
