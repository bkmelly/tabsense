import React from 'react';
import { Brain, Lightbulb, BarChart3, FileText, Settings, Loader2 } from 'lucide-react';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface TextAreaProps {
  messages: Message[];
  showSuggestions: boolean;
  isTyping: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({ messages, showSuggestions, isTyping }) => {
  return (
    <div className={`${showSuggestions ? 'h-[calc(100%-120px)] mb-2' : 'flex-1 mb-4'} overflow-y-auto scrollbar-hide`}>
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
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
          <div className="p-3 rounded-xl text-sm bg-muted/50 mr-8 border border-primary/30">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextArea;
