import React, { useState } from 'react';
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
  const allSuggestedQuestions = [
    { text: "What is React?", icon: Lightbulb },
    { text: "Explain React hooks", icon: Lightbulb },
    { text: "How does state work?", icon: Lightbulb },
    { text: "What are props?", icon: Lightbulb },
    { text: "Explain useEffect", icon: Lightbulb },
    { text: "What is JSX?", icon: Lightbulb },
    { text: "How to handle events?", icon: Lightbulb },
    { text: "What is React Error Boundary?", icon: Smile },
    { text: "How does React rendering work?", icon: Lightbulb },
    { text: "What are React components?", icon: Lightbulb },
    { text: "Explain React lifecycle methods", icon: Lightbulb },
    { text: "What is React context?", icon: Lightbulb }
  ];

  const [currentQuestions, setCurrentQuestions] = useState(
    allSuggestedQuestions.slice(0, 3)
  );

  const handleShuffle = () => {
    // Shuffle the array and take first 3
    const shuffled = [...allSuggestedQuestions].sort(() => Math.random() - 0.5);
    setCurrentQuestions(shuffled.slice(0, 3));
    onShuffle();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-2 py-1">
        <span className="text-xs text-muted-foreground">Suggested Questions</span>
        <div className="flex gap-2">
          <button
            onClick={handleShuffle}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <Shuffle className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowSuggestions(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Questions with better padding and active archive card styling */}
      <div className="space-y-2 p-2">
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
    </div>
  );
};

export default SuggestedQuestionsSection;
