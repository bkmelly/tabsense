import React, { useState } from 'react';
import { Send, Loader2, Share2, MoreVertical, Copy, Trash2, Settings, History, X, Lightbulb, ExternalLink, Smile } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import SuggestedQuestionsSection from './SuggestedQuestionsSection';

interface FullScreenQAProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  setQuestion: (q: string) => void;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  isTyping: boolean;
  handleAskQuestion: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const FullScreenQA: React.FC<FullScreenQAProps> = ({
  isOpen,
  onClose,
  question,
  setQuestion,
  messages,
  isTyping,
  handleAskQuestion,
  isMenuOpen,
  setIsMenuOpen
}) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Suggested Questions */}
          <div className="w-80 border-r border-border/20 p-4">
            <SuggestedQuestionsSection
              showSuggestions={true}
              setShowSuggestions={() => {}}
              onQuestionClick={(q) => setQuestion(q)}
              onShuffle={() => console.log('Shuffled questions')}
            />
          </div>

          {/* Right Side - Chat */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Start a conversation by asking a question or selecting a suggestion.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg ${
                        msg.role === "user"
                          ? "bg-black text-white ml-8"
                          : "bg-muted/30 mr-8"
                      }`}
                    >
                      <div className="text-sm">
                        <strong>{msg.role === "user" ? "You" : "TabSense"}:</strong>
                        <div className="mt-2 whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="p-4 rounded-lg bg-muted/30 mr-8">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border/20">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Ask about your tabs..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !isTyping && handleAskQuestion()}
                    disabled={isTyping}
                    className="pr-10"
                  />
                  <button
                    onClick={handleAskQuestion}
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
                    onClick={() => console.log('Share clicked')}
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
                              onClick={() => {
                                console.log('Copy conversation');
                                setIsMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Copy conversation
                            </button>
                            <button
                              onClick={() => {
                                console.log('Clear history');
                                setIsMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Clear history
                            </button>
                            <button
                              onClick={() => {
                                console.log('View history');
                                setIsMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2"
                            >
                              <History className="h-4 w-4" />
                              View history
                            </button>
                            <div className="border-t border-border/20 my-1"></div>
                            <button
                              onClick={() => {
                                console.log('Settings');
                                setIsMenuOpen(false);
                              }}
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
      </div>
    </div>
  );
};

export default FullScreenQA;
