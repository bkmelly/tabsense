import React from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="h-full overflow-y-auto scrollbar-hide pb-4">
      <div className="space-y-3">
        {messages.map((msg, idx) => {
          // Display messages as-is without special parsing
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-line transition-all relative break-words ${
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
