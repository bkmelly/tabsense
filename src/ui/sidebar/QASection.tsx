import React, { useState } from 'react';
import { Sparkles, Send, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';

interface QASectionProps {
  question: string;
  setQuestion: (question: string) => void;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  isTyping: boolean;
  handleAskQuestion: () => void;
}

const QASection: React.FC<QASectionProps> = ({
  question,
  setQuestion,
  messages,
  isTyping,
  handleAskQuestion
}) => {
  const [isQAExpanded, setIsQAExpanded] = useState(true);

  return (
    <div className="border-t border-border bg-background">
      <button 
        onClick={() => setIsQAExpanded(!isQAExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          Ask Questions
        </h2>
        <ChevronDown 
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isQAExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      
      {isQAExpanded && (
        <>
          {messages.length === 0 && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-2 mb-2 bg-primary/10 p-2.5 rounded-lg border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">AI Assistant Ready</p>
                  <p className="text-xs text-muted-foreground">Ask about your tabs</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setQuestion("What is React?")}
                  className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/80 hover:bg-muted transition-all hover:scale-[1.02] border border-border/30"
                >
                  💡 What is React?
                </button>
                <button
                  onClick={() => setQuestion("Explain React hooks")}
                  className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/80 hover:bg-muted transition-all hover:scale-[1.02] border border-border/30"
                >
                  🔗 Explain React hooks
                </button>
                <button
                  onClick={() => setQuestion("Analyze sentiment in comments")}
                  className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/80 hover:bg-muted transition-all hover:scale-[1.02] border border-border/30"
                >
                  😊 Analyze sentiment in comments
                </button>
              </div>
            </div>
          )}
          
          {messages.length > 0 && (
            <div className="px-4 pb-4 pt-2">
              <ScrollArea className="max-h-40">
                <div className="space-y-3 pr-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-line transition-all ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-8 shadow-md"
                          : "bg-muted/50 mr-8 border border-border/30"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="p-3 rounded-xl text-sm bg-muted/50 mr-8 border border-primary/30">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Input - Inside collapsible */}
          <div className="p-4 pt-0">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your tabs..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && handleAskQuestion()}
                disabled={isTyping}
                className="flex-1 bg-muted/50 border-border/50 focus:border-primary/50 transition-all"
              />
              <Button 
                onClick={handleAskQuestion} 
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
        </>
      )}
    </div>
  );
};

export default QASection;
