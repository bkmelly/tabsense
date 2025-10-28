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
  suggestedQuestions?: string[];
  onRegenerateQuestions?: () => Promise<void>;
  isRegeneratingQuestions?: boolean;
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
  onClose,
  suggestedQuestions = [],
  onRegenerateQuestions,
  isRegeneratingQuestions = false
}) => {
  // Empty fallback - let the empty state handle the UI when no questions are available
  const fallbackQuestions: Array<{ text: string; icon: any }> = [];

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleShuffle = () => {
    // Only shuffle if we have questions
    if (suggestedQuestions.length > 0) {
      const shuffled = [...suggestedQuestions].sort(() => Math.random() - 0.5);
      console.log('Shuffled questions:', shuffled);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            {messages.length > 0 && messages[0].role === "assistant" && messages[0].content.includes("**") ? "Conversation" : "Ask Questions"}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-3 h-3 transition-transform duration-200 rotate-180" />
            </button>
          )}
        </div>
            </div>
            
      <div className="flex-1 flex flex-col px-3 relative overflow-hidden">
        {!isCollapsed && (
          <>
            {/* Scrollable Text Area - Full height with padding at bottom */}
            <div className="flex-1 overflow-hidden mb-2">
              <TextArea 
                messages={messages} 
                showSuggestions={showSuggestions} 
                isTyping={isTyping} 
              />
            </div>

            {/* Suggested Questions Section - Floating between text and input */}
            {showSuggestions && (
              <div className="absolute left-3 right-3 bg-white rounded-lg border border-border/20 shadow-sm z-10"
                   style={{ bottom: '72px' }}>
                <SuggestedQuestionsSection
                  showSuggestions={showSuggestions}
                  setShowSuggestions={setShowSuggestions}
                  onQuestionClick={(question) => setQuestion(question)}
                  onShuffle={handleShuffle}
                  onRegenerate={onRegenerateQuestions}
                  isRegenerating={isRegeneratingQuestions}
                  questions={suggestedQuestions}
                  fallbackQuestions={fallbackQuestions}
                />
          </div>
        )}

                {/* Show suggestions button when hidden - Removed, will be in the input area */}

            {/* Input Section - Fixed at bottom */}
            <div className="absolute bottom-2 left-3 right-3 z-20">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                    placeholder="Ask about this summary..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && onAskQuestion()}
                disabled={isTyping}
                    className="w-full pr-20 bg-white hover:bg-gray-50 border-border/20 focus:border-primary/50 transition-all shadow-sm"
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
                  {!showSuggestions && (
                    <Button 
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowSuggestions(true)}
                      className="h-10 w-10 hover:bg-muted/50"
                      title="Show suggestions"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
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
