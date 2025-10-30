import React, { useState, useEffect } from 'react';
import { Lightbulb, Smile, Shuffle, EyeOff, Loader2 } from 'lucide-react';

interface SuggestedQuestionsSectionProps {
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onQuestionClick: (question: string) => void;
  onShuffle: () => void;
  onRegenerate?: () => Promise<void>; // New prop for regenerating questions
  questions?: string[];
  fallbackQuestions?: Array<{ text: string; icon: any }>;
  isRegenerating?: boolean; // Loading state
}

const SuggestedQuestionsSection: React.FC<SuggestedQuestionsSectionProps> = ({
  showSuggestions,
  setShowSuggestions,
  onQuestionClick,
  onShuffle,
  onRegenerate,
  questions = [],
  fallbackQuestions = [],
  isRegenerating = false
}) => {
  // Use provided questions or fallback to predefined questions
  const hasQuestions = questions && questions.length > 0;
  const hasFallback = fallbackQuestions && fallbackQuestions.length > 0;
  
  // Transform string questions to objects with icons
  const questionObjects = hasQuestions 
    ? questions.map(q => ({ text: q, icon: Lightbulb }))
    : hasFallback
    ? fallbackQuestions
    : [];

  const [currentQuestions, setCurrentQuestions] = useState(
    questionObjects
  );

  // Update questions when props change
  useEffect(() => {
    setCurrentQuestions(questionObjects);
  }, [hasQuestions ? questions.length : hasFallback ? fallbackQuestions.length : 0]);

  const handleShuffle = async () => {
    if (onRegenerate) {
      // Generate new questions from AI
      await onRegenerate();
    } else {
      // Fallback to just shuffling existing questions
      const shuffled = [...questionObjects].sort(() => Math.random() - 0.5);
      setCurrentQuestions(shuffled);
    }
    onShuffle();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-2 py-1">
        <span className="text-xs text-muted-foreground">Suggested Questions</span>
        <div className="flex gap-2">
          <button
            onClick={handleShuffle}
            disabled={isRegenerating}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-50"
            title={onRegenerate ? "Generate new suggestions" : "Shuffle questions"}
          >
            {isRegenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
            <Shuffle className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => setShowSuggestions(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Questions with better padding and active archive card styling - Scrollable */}
      <div className="p-2">
        {currentQuestions.length > 0 ? (
          <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide pr-1">
            {currentQuestions.map((suggestedQuestion, idx) => (
              <button
                key={idx}
                onClick={() => onQuestionClick(suggestedQuestion.text)}
                className="block w-full text-xs text-left px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.01] border border-border/20 flex items-center gap-2"
              >
                <suggestedQuestion.icon className="w-3 h-3" />
                {suggestedQuestion.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Smile className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium mb-1">No suggestions available</p>
            <p className="text-[10px] opacity-75">Add tabs with summaries to get AI-powered questions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestedQuestionsSection;
