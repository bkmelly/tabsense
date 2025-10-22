import React from 'react';
import { 
  Send, Loader2, Share2, MoreVertical, Copy, Trash2, Settings, History, 
  Eye, EyeOff, Lightbulb, ExternalLink, Smile, ChevronDown, Brain, BarChart3, FileText
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import SuggestedQuestionsSection from './SuggestedQuestionsSection';

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
        {/* Messages Area - Fixed height, scrolls independently */}
        <div className={`${showSuggestions ? 'h-80 mb-4' : 'flex-1 mb-4'} overflow-y-auto scrollbar-hide`}>
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-medium">AI Assistant Ready</span>
                </div>
                <p className="text-xs">Ask me anything about your open tabs</p>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              // Check if this is a summary message (starts with "**Summary**")
              const isSummaryMessage = msg.role === "assistant" && msg.content.includes("**Summary**");
              
              if (isSummaryMessage) {
                // Style like tab summary cards - no background, clean text
                const content = msg.content;
                const summaryText = content.split('**Summary**')[1]?.split('**Key Points**')[0]?.trim();
                const keyPointsText = content.split('**Key Points**')[1]?.split('**')[0]?.trim();
                const sentimentText = content.split('**Sentiment Analysis**')[1]?.split('**')[0]?.trim();
                const additionalContextText = content.split('**Additional Context**')[1]?.split('**')[0]?.trim();
                const technicalDetailsText = content.split('**Technical Details**')[1]?.split('**')[0]?.trim();
                
                return (
                  <div key={idx} className="space-y-3">
                    {/* Summary Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-foreground">Summary</h4>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed pl-6 break-words whitespace-pre-line">
                        {summaryText}
                      </div>
                    </div>
                    
                    {/* Key Points Section */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-foreground">Key Points</h4>
                      </div>
                      <div className="pl-6 space-y-2">
                        <ul className="space-y-1.5">
                          {keyPointsText?.split('\n').filter(line => line.trim().startsWith('•')).map((point, pointIdx) => (
                            <li key={pointIdx} className="text-xs text-muted-foreground flex items-start gap-2 overflow-hidden">
                              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                              <span className="flex-1 break-words">{point.replace('•', '').trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {/* Sentiment Analysis Section */}
                    {sentimentText && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-bold text-foreground">Sentiment Analysis</h4>
                        </div>
                        <div className="pl-6 space-y-2">
                          <ul className="space-y-1.5">
                            {sentimentText.split('\n').filter(line => line.trim().startsWith('•')).map((point, pointIdx) => (
                              <li key={pointIdx} className="text-xs text-muted-foreground flex items-start gap-2 overflow-hidden">
                                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1 break-words">{point.replace('•', '').trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Context Section */}
                    {additionalContextText && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-bold text-foreground">Additional Context</h4>
                        </div>
                        <div className="pl-6 space-y-2">
                          <ul className="space-y-1.5">
                            {additionalContextText.split('\n').filter(line => line.trim().startsWith('•')).map((point, pointIdx) => (
                              <li key={pointIdx} className="text-xs text-muted-foreground flex items-start gap-2 overflow-hidden">
                                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1 break-words">{point.replace('•', '').trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Technical Details Section */}
                    {technicalDetailsText && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4 text-primary" />
                          <h4 className="text-xs font-bold text-foreground">Technical Details</h4>
                        </div>
                        <div className="pl-6 space-y-2">
                          <ul className="space-y-1.5">
                            {technicalDetailsText.split('\n').filter(line => line.trim().startsWith('•')).map((point, pointIdx) => (
                              <li key={pointIdx} className="text-xs text-muted-foreground flex items-start gap-2 overflow-hidden">
                                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                                <span className="flex-1 break-words">{point.replace('•', '').trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {msg.timestamp && (
                      <div className="text-xs text-muted-foreground opacity-60 text-right">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Regular message styling
              return (
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
              );
            })}
            
            {isTyping && (
              <div className="p-3 rounded-xl text-sm bg-muted/50 mr-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
              )}
            </div>
          </div>

        {/* Suggested Questions Section - Fixed height, scrolls under input */}
        {showSuggestions && (
          <div className="flex-shrink-0 mb-4">
            <SuggestedQuestionsSection
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              onQuestionClick={(question) => setQuestion(question)}
              onShuffle={handleShuffle}
            />
          </div>
        )}

        {/* Show suggestions button when hidden */}
        {!showSuggestions && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setShowSuggestions(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="w-3 h-3" />
              Show suggestions
            </button>
          </div>
        )}

        {/* Input Section - Fixed at bottom */}
        <div className="flex-shrink-0">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about this summary..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isTyping && onAskQuestion()}
              disabled={isTyping}
              className="flex-1 bg-muted/50 border-border/50 focus:border-primary/50 transition-all"
            />
            <Button 
              onClick={onAskQuestion} 
              size="icon"
              disabled={!question.trim() || isTyping}
              className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QASection;
