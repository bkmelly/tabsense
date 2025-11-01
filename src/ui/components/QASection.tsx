import React, { useState } from 'react';
import { 
  Send, Loader2, Share2, MoreVertical, Copy, Trash2, Settings, History, 
  Eye, EyeOff, Lightbulb, ExternalLink, Smile, ChevronDown, Brain, BarChart3, FileText, Archive, Sparkles, X, Image as ImageIcon
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
  sources?: Array<{ title: string; url: string; type?: string }>;
  error?: boolean;
  question?: string;
}

interface ExportPromptData {
  id: string;
  url: string;
  title: string;
  count: number;
}

interface ReportPromptData {
  id?: string;
  url?: string;
  title?: string;
}

interface ExtractedImage {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  context?: string;
  analysis?: string | null;
  suggestedQuestion?: string | null;
  category?: string;
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
  conversationTitle?: string;
  loadingStage?: string; // Enhanced loading stage message
  serviceWorkerStatus?: 'connected' | 'connecting' | 'error';
  onRetry?: (q: string) => void;
  exportPrompt?: ExportPromptData | null;
  onExportChoice?: (choice: 'yes' | 'no' | 'later', data?: ExportPromptData) => void;
  onExportToGoogleSheets?: (data?: ExportPromptData) => void;
  reportPrompt?: ReportPromptData | null;
  onReportChoice?: (choice: 'yes' | 'no' | 'later', data?: ReportPromptData) => void;
  onExportToGoogleDocs?: (data?: ReportPromptData) => void;
  googleSheetsEnabled?: boolean;
  googleDocsEnabled?: boolean;
  onOpenExportMenu?: () => void;
  extractedImages?: ExtractedImage[]; // Extracted images from the tab
  onImageQuestionClick?: (question: string) => void; // Handler for clicking suggested image question
  onToggleImages?: () => void; // Handler for toggling images display
  showImages?: boolean; // Whether images are currently shown
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
  isRegeneratingQuestions = false,
  conversationTitle,
  loadingStage,
  serviceWorkerStatus,
  onRetry,
  exportPrompt,
  onExportChoice,
  onExportToGoogleSheets,
  reportPrompt,
  onReportChoice,
  onExportToGoogleDocs,
  googleSheetsEnabled,
  googleDocsEnabled,
  onOpenExportMenu,
  extractedImages,
  onImageQuestionClick,
  onToggleImages,
  showImages = false
}) => {
  // Create retry handler
  const handleRetry = (retryQuestion: string) => {
    setQuestion(retryQuestion);
    // Auto-submit after setting question
    setTimeout(() => {
      onAskQuestion();
    }, 100);
  };
  // Empty fallback - let the empty state handle the UI when no questions are available
  const fallbackQuestions: Array<{ text: string; icon: any }> = [];

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastAskAt, setLastAskAt] = useState<number>(0);

  const canSend = () => {
    const now = Date.now();
    const debounceOk = now - lastAskAt > 1500; // 1.5s debounce
    const swReady = (serviceWorkerStatus || 'connected') === 'connected';
    return debounceOk && swReady && !isTyping && question.trim().length > 0;
  };

  const handleAskClick = () => {
    if (!canSend()) return;
    setLastAskAt(Date.now());
    onAskQuestion();
  };

  const handleShuffle = () => {
    // Only shuffle if we have questions
    if (suggestedQuestions.length > 0) {
    const shuffled = [...suggestedQuestions].sort(() => Math.random() - 0.5);
    console.log('Shuffled questions:', shuffled);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {conversationTitle || 'Ask Questions'}
        </h2>
          {onClose && (
            <button
              className="p-1 hover:bg-muted/50 rounded"
              title="Collapse"
              onClick={onClose}
            >
              <ChevronDown className="w-4 h-4" />
                </button>
          )}
              </div>
            </div>
            
      <div className="flex-1 min-h-0 flex flex-col px-3 relative">
        {/* Scrollable Text Area */}
        <div className="flex-1 min-h-0">
            <TextArea 
              messages={messages} 
              showSuggestions={showSuggestions} 
              isTyping={isTyping} 
            onRetry={onRetry}
            loadingStage={loadingStage}
            exportPrompt={exportPrompt}
            onExportChoice={onExportChoice}
            onExportToGoogleSheets={onExportToGoogleSheets}
            reportPrompt={reportPrompt}
            onReportChoice={onReportChoice}
            onExportToGoogleDocs={onExportToGoogleDocs}
            googleSheetsEnabled={googleSheetsEnabled}
            googleDocsEnabled={googleDocsEnabled}
            extractedImages={extractedImages}
            onImageQuestionClick={onImageQuestionClick}
            showImages={showImages}
            />
        </div>

        {/* Suggested Questions Section - Floating between text and input */}
            {showSuggestions && (
          <div className="absolute left-3 right-3 z-10 pointer-events-none" style={{ bottom: '88px' }}>
            <div className="bg-white rounded-lg border border-border/20 shadow-sm pointer-events-auto">
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
          </div>
        )}

        {/* Input Section - Fixed at bottom in white container */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-2">
          <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                    placeholder="Ask about this summary..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAskClick()}
                  disabled={isTyping || (serviceWorkerStatus === 'connecting') || (serviceWorkerStatus === 'error')}
                  className="w-full pr-20 bg-white hover:bg-gray-50 border-border/20 focus:border-primary/50 transition-all shadow-sm"
              />
              <button
                  onClick={handleAskClick}
                  disabled={!canSend()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                      <Send className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
                {serviceWorkerStatus !== 'connected' && (
                  <div className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground/70">
                    Waiting for AI to be ready...
                  </div>
                )}
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
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="h-10 w-10 hover:bg-muted/50"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                <Button 
                  size="icon"
                  variant="ghost"
                  onClick={onOpenExportMenu}
                  className="h-10 w-10 hover:bg-muted/50"
                  title="Export / Report"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                {extractedImages && extractedImages.length > 0 && (
                  <Button 
                    size="icon"
                    variant="ghost"
                    onClick={onToggleImages}
                    className={`h-10 w-10 hover:bg-muted/50 relative ${showImages ? 'bg-primary/10' : ''}`}
                    title={`Show Extracted Images (${extractedImages.length})`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {/* Red dot indicator */}
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-background" />
                  </Button>
                )}
              </div>
                </div>
                      </div>
                    </div>
      </div>
    </div>
  );
};

export default QASection;
