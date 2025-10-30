import React, { useState } from 'react';
import { Loader2, ExternalLink, RotateCcw } from 'lucide-react';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: Array<{ title: string; url: string; type?: string }>;
  error?: boolean;
  question?: string; // Store the original question for retry
}

interface TextAreaProps {
  messages: Message[];
  showSuggestions: boolean;
  isTyping: boolean;
  onRetry?: (question: string) => void; // Retry handler
  loadingStage?: string; // Enhanced loading stage message
}

const TextArea: React.FC<TextAreaProps> = ({ messages, showSuggestions, isTyping, onRetry, loadingStage }) => {
  // Modal removed; use inline collapsible sources instead
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);

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
    } catch {}
    text = text.replace(/[\uFFFD]/g, '');
    // Split by lines first to handle bullet points and headers
    const lines = text.split('\n');
    const lineElements: React.ReactNode[] = [];
    let keyCounter = keyOffset;
    
    // Expanded emoji list for headers
    const headerEmojis = /^([📰📌💭🎥🎯✨💡🔑👤💬📖🛠️🌍📊💼🔬🚀⚡🌱🏢💸📈📉💰🎯🎨🏭⚙️🔧🛡️🌐⚖️🔍📝💼])/;
    
    lines.forEach((line, lineIdx) => {
      const trimmedLine = line.trim();
      const isBlankLine = trimmedLine === '';
      
      // Check if it's a bullet point (starts with •, -, *, or numbered, or looks like a list item)
      const bulletMatch = trimmedLine.match(/^([•\-\*]|\d+\.)\s+(.+)$/);
      
      // Check if it's a section header with emoji + bold markers: 🛠️ **Header Text**
      const headerWithBoldMatch = trimmedLine.match(/^([📰📌💭🎥🎯✨💡🔑👤💬📖🛠️🌍📊💼🔬🚀⚡🌱🏢💸📈📉💰🎯🎨🏭⚙️🔧🛡️🌐⚖️🔍📝💼])?\s*\*\*([^*]+)\*\*(.*)$/);
      
      // Check if it's a section header with emoji but NO bold markers: 🛠️ Header Text (common in Q&A)
      const headerWithEmojiOnlyMatch = trimmedLine.match(/^([📰📌💭🎥🎯✨💡🔑👤💬📖🛠️🌍📊💼🔬🚀⚡🌱🏢💸📈📉💰🎯🎨🏭⚙️🔧🛡️🌐⚖️🔍📝💼])\s+(.+)$/);
      
      // Check if line starts with bold markers (without emoji): **Header Text**
      const headerBoldOnlyMatch = trimmedLine.match(/^\*\*([^*]+)\*\*(.*)$/);
      
      // Check if previous line was a header
      const prevLineWasHeader = lineIdx > 0 && (
        lines[lineIdx - 1].trim().match(/^([📰📌💭🎥🎯✨💡🔑👤💬📖🛠️🌍📊💼🔬🚀⚡🌱🏢💸📈📉💰🎯🎨🏭⚙️🔧🛡️🌐⚖️🔍📝💼])/) ||
        lines[lineIdx - 1].trim().match(/^\*\*[^*]+\*\*/)
      );
      
      // Check if it looks like a bullet point item (short line after header, or line after blank line)
      const isListContext = prevLineWasHeader || 
        (lineIdx > 0 && lines[lineIdx - 1].trim() === '');
      
      const looksLikeListItem = isListContext && 
        trimmedLine.length > 0 &&
        trimmedLine.length < 350 && // Reasonable line length for a list item
        !trimmedLine.match(/^[📰📌💭🎥🎯✨💡🔑👤💬📖🛠️🌍📊💼🔬🚀⚡🌱🏢💸📈📉💰🎯🎨🏭⚙️🔧🛡️🌐⚖️🔍📝💼]/) && // Not a header
        !trimmedLine.match(/^\*\*[^*]+\*\*/) && // Not a header with bold
        !trimmedLine.match(/^([•\-\*]|\d+\.)\s+/) && // Not already a marked bullet
        !trimmedLine.toLowerCase().startsWith('you might') && // Not the "suggested questions" section
        !trimmedLine.toLowerCase().startsWith('if you');
      
      if (bulletMatch) {
        // It's a bullet point with marker
        const bulletContent = bulletMatch[2];
        if (!bulletContent || bulletContent.trim().length < 2) {
          // Skip empty/placeholder bullets
          return;
        }
        lineElements.push(
          <div key={`bullet-${keyCounter + lineIdx}`} className="flex items-start gap-2 my-1">
            <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
            <span className="flex-1">{parseInlineMarkdown(bulletContent, keyCounter + lineIdx * 100)}</span>
          </div>
        );
      } else if (headerWithBoldMatch) {
        // Header with emoji + bold markers
        const emoji = headerWithBoldMatch[1] || '';
        const headerText = headerWithBoldMatch[2];
        const restText = headerWithBoldMatch[3];
        lineElements.push(
          <div key={`header-${keyCounter + lineIdx}`} className="my-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              {emoji && <span>{emoji}</span>}
              <span>{headerText}</span>
            </h4>
            {restText.trim() && (
              <div className="mt-1 ml-0">
                {parseInlineMarkdown(restText.trim(), keyCounter + lineIdx * 100 + 1)}
              </div>
            )}
          </div>
        );
      } else if (headerWithEmojiOnlyMatch) {
        // Header with emoji but NO bold markers (common in Q&A answers)
        const emoji = headerWithEmojiOnlyMatch[1];
        const headerText = headerWithEmojiOnlyMatch[2];
        lineElements.push(
          <div key={`header-${keyCounter + lineIdx}`} className="my-2">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span>{emoji}</span>
              <span>{parseInlineMarkdown(headerText, keyCounter + lineIdx * 100)}</span>
            </h4>
          </div>
        );
      } else if (headerBoldOnlyMatch) {
        // Header with bold markers only (no emoji)
        const headerText = headerBoldOnlyMatch[1];
        const restText = headerBoldOnlyMatch[2];
        lineElements.push(
          <div key={`header-${keyCounter + lineIdx}`} className="my-2">
            <h4 className="font-semibold text-foreground">{headerText}</h4>
            {restText.trim() && (
              <div className="mt-1">
                {parseInlineMarkdown(restText.trim(), keyCounter + lineIdx * 100 + 1)}
              </div>
            )}
          </div>
        );
      } else if (looksLikeListItem) {
        // List item following a header - format as bullet point
        lineElements.push(
          <div key={`bullet-${keyCounter + lineIdx}`} className="flex items-start gap-2 my-1">
            <span className="text-muted-foreground mt-0.5 flex-shrink-0">•</span>
            <span className="flex-1">{parseInlineMarkdown(trimmedLine, keyCounter + lineIdx * 100)}</span>
          </div>
        );
      } else if (isBlankLine) {
        // Blank line - add spacing
        lineElements.push(<br key={`blank-${keyCounter + lineIdx}`} />);
      } else {
        if (trimmedLine === 'Document') {
          // Skip stray standalone source label lines
          return;
        }
        // Regular line with inline markdown
        lineElements.push(
          <div key={`line-${keyCounter + lineIdx}`} className="my-1">
            {parseInlineMarkdown(trimmedLine, keyCounter + lineIdx * 100)}
          </div>
        );
      }
    });
    
    return <div className="space-y-0.5">{lineElements}</div>;
  };

  // Parse inline markdown (bold within text)
  const parseInlineMarkdown = (text: string, keyOffset: number = 0): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyCounter = keyOffset;
    
    // Pattern for **bold**
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const allMatches: Array<{ index: number; length: number; text: string }> = [];
    
    let match;
    while ((match = boldPattern.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        text: match[1]
      });
    }
    
    if (allMatches.length === 0) {
      return text;
    }
    
    allMatches.forEach((boldMatch, idx) => {
      // Text before bold
      if (boldMatch.index > currentIndex) {
        const beforeText = text.substring(currentIndex, boldMatch.index);
        parts.push(<span key={`before-${keyCounter + idx}`}>{beforeText}</span>);
      }
      
      // Bold text
      parts.push(
        <strong key={`bold-${keyCounter + idx}`} className="font-semibold">
          {boldMatch.text}
        </strong>
      );
      
      currentIndex = boldMatch.index + boldMatch.length;
    });
    
    // Remaining text
    if (currentIndex < text.length) {
      parts.push(<span key={`after-${keyCounter}`}>{text.substring(currentIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  // Extract all sources from messages
  const allSources = messages
    .filter(msg => msg.sources && msg.sources.length > 0)
    .flatMap(msg => msg.sources || []);

  return (
    <>
      <div className="h-full overflow-y-auto scrollbar-hide pb-4">
      <div className="space-y-3">
        {messages.map((msg, idx) => {
            const isAssistant = msg.role === "assistant";
            
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl text-sm leading-relaxed transition-all relative break-words ${
                  msg.role === "user"
                    ? "bg-black text-white ml-8"
                    : msg.error
                    ? "bg-red-50 border border-red-200 mr-0"
                    : "bg-muted/30 mr-0"
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  {isAssistant ? parseContent(msg.content, msg.sources) : msg.content}
                </div>
                {isAssistant && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        const next = new Set(expandedSources);
                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                        setExpandedSources(next);
                      }}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {expandedSources.has(idx) ? 'Hide sources' : `Sources (${msg.sources.length})`}
                    </button>
                    {expandedSources.has(idx) && (
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, sIdx) => {
                      let name = src.title || '';
                      try { if (!name) name = new URL(src.url).hostname.replace('www.', ''); } catch {}
                      if (name.length > 50) name = name.substring(0, 47) + '...';
                      return (
                        <a
                              key={`srcchip-${sIdx}`}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary hover:text-primary-700 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors inline-flex items-center gap-1 border border-primary/20"
                          title={src.url}
                        >
                          {name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {msg.timestamp && (
                    <div className={`text-xs opacity-60 ${msg.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                      {msg.timestamp}
                  </div>
                )}
                  {isAssistant && msg.error && msg.question && onRetry && (
                    <button
                      onClick={() => onRetry(msg.question!)}
                      className="p-1.5 rounded-md hover:bg-red-100 transition-colors group"
                      title="Retry this question"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-600 group-hover:text-red-700" />
                    </button>
                  )}
                    </div>
            </div>
          );
        })}
        
        {isTyping && (
            <div className="p-3 rounded-xl text-sm bg-muted/30 mr-0 border border-primary/30">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <div className="flex flex-col">
                  <span className="text-muted-foreground font-medium">AI is thinking...</span>
                  {loadingStage && (
                    <span className="text-xs text-muted-foreground/70 mt-0.5">{loadingStage}</span>
                  )}
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default TextArea;
