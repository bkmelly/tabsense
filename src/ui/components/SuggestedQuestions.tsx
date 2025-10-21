import React, { useState, useEffect } from 'react';
import { Lightbulb, ExternalLink, Smile, ChevronUp } from 'lucide-react';

interface SuggestedQuestion {
  id: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onQuestionClick: (question: string) => void;
  onShuffle?: () => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onQuestionClick,
  onShuffle
}) => {
  const [displayedQuestions, setDisplayedQuestions] = useState<SuggestedQuestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Initially show only 3 questions
    setDisplayedQuestions(questions.slice(0, 3));
  }, [questions]);

  const handleShuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setDisplayedQuestions(shuffled.slice(0, isExpanded ? questions.length : 3));
    onShuffle?.();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Show all questions when expanding
      setDisplayedQuestions(questions);
    } else {
      // Show only 3 when collapsing
      setDisplayedQuestions(questions.slice(0, 3));
    }
  };

  return (
    <div className="space-y-2">
      {/* Shuffle Button */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Suggested Questions</span>
        <button
          onClick={handleShuffle}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Shuffle
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
        {displayedQuestions.map((question) => (
          <button
            key={question.id}
            onClick={() => onQuestionClick(question.text)}
            className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.02] border border-border/20 flex items-center gap-2"
          >
            <question.icon className="w-3 h-3" />
            {question.text}
          </button>
        ))}
      </div>

      {/* Show More/Less Button */}
      {questions.length > 3 && (
        <button
          onClick={toggleExpanded}
          className="w-full text-xs text-center py-1 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              Show Less
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show More ({questions.length - 3} more)
              <ChevronUp className="w-3 h-3 rotate-180" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default SuggestedQuestions;
