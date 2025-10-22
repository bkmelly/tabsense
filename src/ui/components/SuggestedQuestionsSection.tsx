import React from 'react';
import { Lightbulb, Smile, Shuffle, EyeOff } from 'lucide-react';

interface SuggestedQuestionsSectionProps {
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onQuestionClick: (question: string) => void;
  onShuffle: () => void;
}

const SuggestedQuestionsSection: React.FC<SuggestedQuestionsSectionProps> = ({
  showSuggestions,
  setShowSuggestions,
  onQuestionClick,
  onShuffle
}) => {
  const suggestedQuestions = [
    { text: "What is React?", icon: Lightbulb },
    { text: "Explain React hooks", icon: Lightbulb },
    { text: "How does state work?", icon: Lightbulb },
    { text: "What are props?", icon: Lightbulb },
    { text: "Explain useEffect", icon: Lightbulb },
    { text: "What is JSX?", icon: Lightbulb },
    { text: "How to handle events?", icon: Lightbulb },
    { text: "What is React Error Boundary?", icon: Smile }
  ];

  const handleShuffle = () => {
    onShuffle();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Suggested Questions</span>
        <div className="flex gap-2">
          <button
            onClick={handleShuffle}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shuffle className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowSuggestions(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Fixed height container with scrollable questions inside */}
      <div className="h-40 border border-border/20 rounded-lg overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-hide">
          <div className="space-y-2 p-2">
            {suggestedQuestions.map((suggestedQuestion, idx) => (
              <button
                key={idx}
                onClick={() => onQuestionClick(suggestedQuestion.text)}
                className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.02] border border-border/20 flex items-center gap-2"
              >
                <suggestedQuestion.icon className="w-3 h-3" />
                {suggestedQuestion.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestedQuestionsSection;
