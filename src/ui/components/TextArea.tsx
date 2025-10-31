import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ExternalLink, RotateCcw, Image as ImageIcon, ChevronRight, ChevronLeft, X, Maximize2 } from 'lucide-react';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: Array<{ title: string; url: string; type?: string }>;
  error?: boolean;
  question?: string; // Store the original question for retry
}

interface ExportPromptData {
  id: string;
  url: string;
  title: string;
  count: number;
  format?: 'csv' | 'excel'; // Optional format, defaults to csv
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

interface TextAreaProps {
  messages: Message[];
  showSuggestions: boolean;
  isTyping: boolean;
  onRetry?: (question: string) => void; // Retry handler
  loadingStage?: string; // Enhanced loading stage message
  exportPrompt?: ExportPromptData | null;
  onExportChoice?: (choice: 'yes' | 'no' | 'later', data?: ExportPromptData) => void;
  onExportToGoogleSheets?: (data?: ExportPromptData) => void;
  reportPrompt?: ReportPromptData | null;
  onReportChoice?: (choice: 'yes' | 'no' | 'later', data?: ReportPromptData) => void;
  onExportToGoogleDocs?: (data?: ReportPromptData) => void;
  googleSheetsEnabled?: boolean;
  googleDocsEnabled?: boolean;
  extractedImages?: ExtractedImage[]; // Extracted images from the tab
  onImageQuestionClick?: (question: string) => void; // Handler for clicking suggested image question
  showImages?: boolean; // Whether images should be shown (controlled by parent)
}

const TextArea: React.FC<TextAreaProps> = ({ messages, showSuggestions, isTyping, onRetry, loadingStage, exportPrompt, onExportChoice, onExportToGoogleSheets, reportPrompt, onReportChoice, onExportToGoogleDocs, googleSheetsEnabled, googleDocsEnabled, extractedImages, onImageQuestionClick, showImages = false }) => {
  // Modal removed; use inline collapsible sources instead
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevLenRef = useRef<number>(messages.length);
  const nearBottomRef = useRef<boolean>(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    try {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    } catch {}
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 72; // px from bottom
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    nearBottomRef.current = distanceFromBottom <= threshold;
  };

  // Ensure container can scroll; initialize at bottom on mount
  useEffect(() => {
    scrollToBottom('auto');
    prevLenRef.current = messages.length;
  }, []);

  // Auto scroll when new messages arrive if user is near the bottom
  useEffect(() => {
    const lenIncreased = messages.length > prevLenRef.current;
    if (lenIncreased && nearBottomRef.current) {
      scrollToBottom('smooth');
    }
    prevLenRef.current = messages.length;
  }, [messages]);

  // Parse markdown and inline citations
  const parseContent = (content: string, sources: Array<{ title: string; url: string; type?: string }> = []) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Find all inline citations {Source Name}
    const citationPattern = /\{([^}]+)\}/g;
    let match;
    
    // Create a map of source names to URLs
    const sourceMap = new Map<string, string>();
    sources.forEach(source => {
      // Try to match by title or a shortened version
      const shortTitle = source.title.length > 30 ? source.title.substring(0, 30) : source.title;
      sourceMap.set(source.title, source.url);
      sourceMap.set(shortTitle, source.url);
      // Also map common source patterns
      if (source.title.toLowerCase().includes('reuters')) sourceMap.set('Reuters', source.url);
      if (source.title.toLowerCase().includes('document')) sourceMap.set('Document', source.url);
      if (source.type === 'wikipedia') sourceMap.set('Wikipedia', source.url);
    });
    
    // Process content with citations
    const allMatches: Array<{ index: number; length: number; text: string; url: string | null }> = [];
    
    while ((match = citationPattern.exec(content)) !== null) {
      const sourceName = match[1];
      const url = sourceMap.get(sourceName) || null;
      allMatches.push({
        index: match.index,
        length: match[0].length,
        text: sourceName,
        url
      });
    }
    
    // Build JSX elements
    let currentIndex = 0;
    
    allMatches.forEach((citation, idx) => {
      // Add text before citation
      if (citation.index > currentIndex) {
        const textBefore = content.substring(currentIndex, citation.index);
        parts.push(parseMarkdown(textBefore, idx * 2));
      }
      
      // Add citation
      const citationKey = `citation-${idx}`;
      if (citation.url) {
        parts.push(
          <span
            key={citationKey}
            className="inline-flex items-center"
            onMouseEnter={() => setHoveredCitation(citationKey)}
            onMouseLeave={() => setHoveredCitation(null)}
          >
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline mx-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
              title={citation.url}
            >
              {citation.text}
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        );
      } else {
        // Citation without URL - still show it but as plain text
        parts.push(
          <span
            key={citationKey}
            className="text-xs font-medium text-muted-foreground mx-1 px-1.5 py-0.5 rounded bg-muted/50"
          >
            {citation.text}
          </span>
        );
      }
      
      currentIndex = citation.index + citation.length;
    });
    
    // Add remaining text
    if (currentIndex < content.length) {
      parts.push(parseMarkdown(content.substring(currentIndex), allMatches.length * 2));
    }
    
    return parts.length > 0 ? parts : parseMarkdown(content, 0);
  };

  // Parse markdown (bold, bullet points, emojis, line breaks)
  const parseMarkdown = (text: string, keyOffset: number = 0): React.ReactNode => {
    // Sanitize unicode: normalize and drop replacement chars
    try {
      if ((text as any).normalize) text = (text as any).normalize('NFC');
      text = text.replace(/[\uFFFD]/g, '');
    } catch {}

    const elements: React.ReactNode[] = [];

    // Split into lines and process headings, bullets, bold
    const lines = text.split(/\n+/);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line.trim()) {
        elements.push(<br key={`br-${keyOffset + i}`} />);
        continue;
      }

      // Headings with emojis or bold
      const headingMatch = line.match(/^\s*(?:([\u{1F300}-\u{1FAFF}]|[\p{Emoji_Presentation}])\s*)?\*\*([^*]+)\*\*/u);
      if (headingMatch) {
        const emoji = headingMatch[1] || '';
        const title = headingMatch[2];
        elements.push(
          <span key={`h-${keyOffset + i}`} className="mt-3 mb-1 font-semibold inline-block">
            {emoji && <span className="mr-1">{emoji}</span>}<span className="font-bold">{title}</span>
          </span>
        );
        continue;
      }

      // Bullets: • item or - item
      const bulletMatch = line.match(/^\s*(?:•|-|\*)\s+(.+)/);
      if (bulletMatch) {
        elements.push(
          <span key={`b-${keyOffset + i}`} className="pl-5 list-disc block">
            <li>{parseInlineBold(bulletMatch[1])}</li>
          </span>
        );
        continue;
      }

      // Default paragraph with inline bold
      elements.push(
        <span key={`p-${keyOffset + i}`} className="leading-relaxed inline">
          {parseInlineBold(line)}
        </span>
      );
    }

    return <>{elements}</>;
  };

  const parseInlineBold = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part, idx) => {
          if (/^\*\*.+\*\*$/.test(part)) {
            return <strong key={`bold-${idx}`}>{part.slice(2, -2)}</strong>;
          }
          return <span key={`span-${idx}`}>{part}</span>;
        })}
      </>
    );
  };

  // Check if there are relevant images
  // Debug logging
  React.useEffect(() => {
    if (extractedImages) {
      console.log('[TextArea] extractedImages received:', extractedImages.length, extractedImages);
      const relevant = extractedImages.filter(img => {
        const hasSrc = img.src && img.src.length > 0;
        const hasSize = (img.width && img.width >= 100) || (img.height && img.height >= 100) || (!img.width && !img.height); // Allow images without size info
        return hasSrc && hasSize;
      });
      console.log('[TextArea] Relevant images after filter:', relevant.length, relevant);
    } else {
      console.log('[TextArea] extractedImages is undefined or null');
    }
  }, [extractedImages]);
  
  // More lenient check - images just need a src and reasonable size (or no size info)
  const hasImages = extractedImages && extractedImages.length > 0 && extractedImages.filter(img => {
    const hasSrc = img.src && img.src.length > 0;
    const hasSize = (img.width && img.width >= 100) || (img.height && img.height >= 100) || (!img.width && !img.height);
    return hasSrc && hasSize;
  }).length > 0;
  
  console.log('[TextArea] hasImages check:', hasImages, 'extractedImages count:', extractedImages?.length);

  // Render collapsible sources section
  const renderSourcesSection = (messageIndex: number, sources?: Array<{ title: string; url: string; type?: string }>) => {
    const isExpanded = expandedSources.has(messageIndex);
    const hasSources = sources && sources.length > 0;
    
    // Show section if there are sources OR images
    if (!hasSources && !hasImages) return null;
    
    return (
      <div className="mt-2 border-t border-muted/50 pt-2">
        <div className="flex items-center gap-2">
          {/* Sources button */}
          {hasSources && (
            <button
              onClick={() => {
                const newSet = new Set(expandedSources);
                if (isExpanded) {
                  newSet.delete(messageIndex);
                } else {
                  newSet.add(messageIndex);
                }
                setExpandedSources(newSet);
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Sources ({sources.length})</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          
        </div>
        
        {/* Sources list when expanded */}
        {hasSources && isExpanded && (
          <div className="mt-2 flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <a
                key={`src-${messageIndex}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium text-primary hover:underline px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors inline-flex items-center gap-1"
                title={s.url}
              >
                {s.title}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render extracted images gallery
  const renderImageGallery = () => {
    if (!extractedImages || extractedImages.length === 0) return null;
    
    const relevantImages = extractedImages.filter(img => {
      const hasSrc = img.src && img.src.length > 0;
      const hasSize = (img.width && img.width >= 100) || (img.height && img.height >= 100) || (!img.width && !img.height);
      return hasSrc && hasSize;
    });
    if (relevantImages.length === 0) return null;
    
    return (
      <div className="mt-2">
        {/* Horizontal scrollable gallery */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {relevantImages.map((img, idx) => {
                const aspectRatio = img.width && img.height ? img.width / img.height : 1;
                const maxHeight = 200;
                const calculatedWidth = aspectRatio * maxHeight;
                const isExpanded = expandedImageIndex === idx;
                
                return (
                  <div
                    key={`img-${idx}`}
                    className="flex-shrink-0 relative group"
                    style={{ width: isExpanded ? 'auto' : `${Math.min(calculatedWidth, 300)}px` }}
                  >
                    <div className="relative bg-muted/20 rounded-lg overflow-hidden border border-muted/50">
                      <img
                        src={img.src}
                        alt={img.alt || img.title || 'Extracted image'}
                        className={`object-contain transition-all ${isExpanded ? 'max-h-[400px]' : 'max-h-[200px]'}`}
                        style={{ width: isExpanded ? 'auto' : '100%', height: 'auto' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      
                      {/* Expand button */}
                      {!isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImageIndex(idx);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Expand image"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Collapse button (when expanded) */}
                      {isExpanded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedImageIndex(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded"
                          title="Collapse image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Image info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                        {img.alt && (
                          <div className="text-[10px] text-muted-foreground truncate">{img.alt}</div>
                        )}
                        
                        {/* Suggested question button */}
                        {img.suggestedQuestion && onImageQuestionClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onImageQuestionClick(img.suggestedQuestion!);
                            }}
                            className="mt-1 text-xs text-primary hover:underline font-medium"
                          >
                            💡 {img.suggestedQuestion.substring(0, 50)}{img.suggestedQuestion.length > 50 ? '...' : ''}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Analysis tooltip on hover (if available) */}
                    {img.analysis && (
                      <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-64 p-2 bg-background border border-muted rounded shadow-lg text-xs text-muted-foreground">
                        {img.analysis}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex flex-col-reverse overflow-y-auto scrollbar-hide pb-4"
      >
        <div className="flex flex-col gap-3 px-3">
        {messages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={idx}
                className={`${isAssistant ? 'mr-0' : 'ml-10'} p-3 rounded-xl text-sm ${isAssistant ? 'bg-muted/30' : 'bg-primary text-primary-foreground'} whitespace-pre-wrap`}
              >
                <span>
                  {parseContent(msg.content, msg.sources)}
                </span>
                {isAssistant && renderSourcesSection(idx, msg.sources)}
                {msg.error && msg.question && onRetry && (
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => onRetry(msg.question!)}
                  >
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Extracted Images Gallery - Show when images toggle is clicked from input */}
          {showImages && extractedImages && extractedImages.length > 0 && (
            <div className="mr-0 p-3 rounded-xl text-sm bg-muted/30">
              {renderImageGallery()}
            </div>
          )}

          {exportPrompt && (
            <div className="p-3 rounded-xl text-sm bg-muted/30 mr-0">
              <div className="font-medium mb-2">Export YouTube comments?</div>
              <div className="text-xs text-muted-foreground mb-3">
                Export {exportPrompt.count} comments for “{exportPrompt.title}” categorized by sentiment (Positive, Neutral, Negative).
                    </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs"
                  onClick={() => onExportChoice && onExportChoice('yes', exportPrompt)}
                >
                  Yes
                </button>
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => onExportChoice && onExportChoice('no', exportPrompt)}
                >
                  No
                </button>
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => onExportChoice && onExportChoice('later', exportPrompt)}
                >
                  Later
                </button>
                    </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Export as:</span>
                <button
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => onExportChoice && onExportChoice('yes', { ...exportPrompt, format: 'csv' })}
                >
                  CSV (.csv)
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20"
                  onClick={() => onExportChoice && onExportChoice('yes', { ...exportPrompt, format: 'excel' })}
                >
                  Excel (.xls)
                </button>
                {googleSheetsEnabled && (
                  <button
                    className="text-xs px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800"
                    onClick={() => onExportToGoogleSheets && onExportToGoogleSheets(exportPrompt)}
                  >
                    Google Sheets
                  </button>
                )}
                    </div>
                  </div>
                )}
                
          {reportPrompt && (
            <div className="p-3 rounded-xl text-sm bg-muted/30 mr-0">
              <div className="font-medium mb-2">Generate report?</div>
              <div className="text-xs text-muted-foreground mb-3">
                Create a Markdown report for “{reportPrompt.title || 'this tab'}” with Overview, Key Takeaways, Sources, and Insight.
                  </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs"
                  onClick={() => onReportChoice && onReportChoice('yes', reportPrompt)}
                >
                  Download (.md)
                </button>
                {googleDocsEnabled && (
                  <button
                    className="px-3 py-1 rounded bg-green-100 text-green-800 text-xs hover:bg-green-200"
                    onClick={() => onExportToGoogleDocs && onExportToGoogleDocs(reportPrompt)}
                  >
                    Google Docs
                  </button>
                )}
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => onReportChoice && onReportChoice('no', reportPrompt)}
                >
                  No
                </button>
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => onReportChoice && onReportChoice('later', reportPrompt)}
                >
                  Later
                </button>
              </div>
            </div>
          )}
        
        {isTyping && (
            <div className="p-3 rounded-xl text-sm bg-muted/30 mr-0">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStage || 'AI is thinking...'}</span>
              </div>
            </div>
          )}

          {/* Spacer to prevent overlap with the fixed input bar (works with column-reverse) */}
          <div className="h-24 shrink-0" />
          </div>
      </div>
    </div>
  );
};

export default TextArea;
