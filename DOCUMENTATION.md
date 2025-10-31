# TabSense Extension - Complete Documentation

## Overview

TabSense is an AI-powered research assistant Chrome extension that automatically summarizes tabs, enables intelligent Q&A, and provides export capabilities. The extension uses Chrome's built-in AI models and external AI providers (Gemini, Claude, OpenAI) to deliver comprehensive content analysis and question-answering capabilities.

## Table of Contents

- [Architecture](#architecture)
- [Core Features](#core-features)
- [AI Integration](#ai-integration)
- [Content Processing](#content-processing)
- [Q&A System](#qa-system)
- [Export Features](#export-features)
- [UI Components](#ui-components)
- [Data Management](#data-management)
- [Recent Improvements](#recent-improvements)

---

## Architecture

### Service Worker (`service-worker.js`)
The central background process handling:
- Tab auto-processing and content extraction
- AI summarization and categorization
- Q&A generation with external context
- Export handlers (Excel, Markdown, Google Sheets/Docs)
- Message routing and state management
- YouTube API integration with caching

### Content Script (`content.js`)
Injected into web pages to:
- Extract text content, titles, and metadata
- Prepare structured data for summarization

### UI Components (React/TypeScript)
- **TabSenseSidebar.tsx**: Main sidebar interface
- **QASection.tsx**: Question-answering interface
- **TextArea.tsx**: Message rendering with markdown parsing
- **APIKeysSettings.tsx**: API key management
- **ArchiveSection.tsx**: Conversation history
- **SettingsPage.tsx**: Settings navigation

---

## Core Features

### 1. Automatic Tab Processing
- **Smart Categorization**: AI-based classification into `news`, `blog`, `reference`, `youtube`, or `generic`
  - Content-based analysis (not just URL matching)
  - Heuristic pre-filtering before AI analysis
  - URL-based fallback categorization
- **Debouncing**: YouTube tabs use 1.2s debounce to handle rapid navigation
- **Deduplication**: Prevents reprocessing same URLs/tabs within 5 minutes
- **Processing Lock**: Per-tab locks prevent concurrent processing

### 2. Content Extraction
- **Generic Pages**: Extracts title, body text, metadata
- **YouTube Videos**: 
  - Uses YouTube Data API v3 for video metadata, channel info, comments
  - Falls back to DOM extraction if API key unavailable
  - Caches API responses for efficiency
  - Extracts 100-200 comments with sentiment analysis
  - Canonicalizes URLs to prevent duplicate processing

### 3. Adaptive Summarization
- **Category-Specific Templates**:
  - **YouTube**: Comprehensive template with Key Takeaways, Host's Viewpoint, Sentiment Breakdown, Comment Themes, Representative Comments
  - **News/Blog/Reference**: Tailored summaries based on content type
- **Formatter Instructions**: AI receives structured formatting requirements
- **Post-Processing**: Markdown cleaning, emoji handling, citation integration

---

## AI Integration

### Supported Providers
1. **Chrome Built-in AI** (Default, Free)
   - Summarizer API
   - Prompt API (multimodal)
   - Language Detector
   - Translator
   - Proofreader

2. **Google Gemini** (API Key Required)
   - Models: `gemini-2.0-flash`, `gemini-2.0-flash-exp`
   - Cost: Very Low ($0.002/1K tokens)

3. **Anthropic Claude** (API Key Required)
   - Models: Claude 3 Haiku, Sonnet, Opus
   - Cost: Low ($0.0015/1K tokens)

4. **OpenAI** (API Key Required)
   - Models: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
   - Cost: Medium ($0.0035/1K tokens)

5. **xAI Grok** (API Key Required)
   - Models: Grok Beta
   - Cost: Medium ($0.0027/1K tokens)

### AI Provider Manager
- Automatic fallback between providers
- Rate limit handling (429 errors)
- Provider rotation for reliability
- Cost tracking and usage monitoring

---

## Content Processing

### YouTube-Specific Processing

**Data Structure:**
```javascript
{
  youtubeData: {
    video: {
      title, channel, views, likes, publishedAt, description
    },
    comments: [
      { author, text, likeCount, replyCount, publishedAt, _score }
    ]
  }
}
```

**Sentiment Analysis:**
- Heuristic keyword-based analysis
- Scores: >1 = positive, <-1 = negative, else neutral
- Generates sentiment breakdown percentages

**Comment Themes:**
- Extracts common topics and discussion themes
- Identifies representative comments per sentiment

**Caching:**
- API responses cached by video ID (`yt-<videoId>`)
- Reduces API quota usage
- Enables faster QA responses

### Content Categorization

**AI-Based Classification:**
- Analyzes actual content (title + summary + content preview)
- Heuristic pre-filtering for common patterns
- Content-aware rules:
  - News sites with recipes → categorized as "blog"
  - Opinion pieces → "blog" not "news"
  - Documentation → "reference"

**URL-Based Fallback:**
- Patterns for Wikipedia, docs sites, blog platforms
- News domains with lower confidence (content may vary)

---

## Q&A System

### Category-Wide Q&A
- **Scope**: Queries all tabs within selected category
- **Context Building**: Combines summaries from multiple tabs
- **Title Generation**: Creates meaningful conversation titles incorporating category + question + multiple tab titles

### Single Tab Q&A
- **Context**: Focused on specific tab's summary and content
- **External Context**: Forced for news/reference categories or factual questions
- **Suggested Questions**: Category-aware, diverse questions covering different angles

### QA Pipeline

**1. Intent Detection:**
- Command recognition (export comments, download report)
- Natural language query handling

**2. Context Enhancement:**
- External search (Serper.dev, NewsAPI, Wikipedia)
- Contextual query building (combines question + title + keywords + host)
- Forced external search for factual queries

**3. Category-Specific Prompts:**
- **YouTube**: Includes comment themes, sentiment insights
- **News**: Emphasizes fact-checking, current events
- **Blog**: Focuses on author viewpoint, arguments
- **Reference**: Highlights definitions, technical details

**4. Post-Processing:**
- `cleanMarkdown()`: Removes metadata tokens, fixes broken lines, normalizes bullets, handles citations
- `polishMarkdown()`: Unicode normalization, emoji cleanup, tone moderation, ensures Insight section
- `normalizeAnswer()`: Merges stray sources, drops empty bullets

**5. Formatting Requirements:**
- Direct answer at start
- Emoji-labeled sections (🧾 Evidence & Reasoning, 🧩 Comment Themes, etc.)
- Inline citations: `{Source Name}` format
- No suggested questions unless explicitly requested
- Structured bullets (3-7 complete points)

### Suggested Questions Generation
- Category-wide context (up to 8 tabs)
- Structured format: Title, Category, Summary excerpt per tab
- Diverse angles: facts, implications, comparisons, critics, what-if, evidence
- Avoids duplicates and single-source focus

---

## Export Features

### 1. Excel Export (YouTube Comments)
- **Format**: Excel XML (SpreadsheetML) - `.xls`
- **Structure**:
  - **Comments Sheet**: Sentiment, Author, Likes, Replies, Published, Comment Text
  - **Summary Sheet**: Total, Positive/Negative/Neutral counts and percentages
- **Styling**: 
  - Colored headers (blue background)
  - Sentiment-based row coloring (green=positive, red=negative)
  - Removed repetitive columns (videoTitle, url)

### 2. Markdown Report Export
- **Content**: Overview, Key Takeaways, Host's Viewpoint (YouTube), Sentiment Breakdown, Comment Themes, Sources, Insight
- **Format**: `.md` file
- **AI-Enhanced**: Optionally uses AI to compose professional report
- **Fallback**: Template-based if AI generation fails

### 3. Google Sheets Export
- **OAuth2 Authentication**: Via Chrome Identity API
- **Setup Required**: Google Client ID from Google Cloud Console
- **Redirect URI**: Auto-generated by Chrome (`chrome.identity.getRedirectURL()`)
- **Features**:
  - Creates new spreadsheet with two worksheets (Comments + Summary)
  - Automatic data population
  - Returns Google Sheets URL for immediate access
- **No Server Needed**: Chrome handles OAuth flow automatically

### 4. Google Docs Export
- **OAuth2 Authentication**: Same setup as Google Sheets
- **Features**:
  - Creates new Google Doc with report content
  - AI-composed or template-based reports
  - Returns Google Docs URL
- **Use Case**: Reports for any tab category

---

## UI Components

### TabSenseSidebar.tsx
**Main Interface:**
- Tab list with category filtering
- Category-wide Q&A section
- Archive/Conversation history
- Settings access
- Real-time tab processing updates

**State Management:**
- Tab collection with auto-updates
- Conversation state (main QA + summary QA)
- Service worker status tracking
- Export prompt management

### QASection.tsx
**Features:**
- Chat-style interface with bottom-anchored messages
- Input area with Send button + Export icon
- Suggested questions floating panel
- Collapse chevron for conversation control
- Loading stages for AI operations
- Retry mechanism for failed queries

**Scroll Behavior:**
- Opens at bottom (latest messages)
- Normal scroll functionality (no forced auto-scroll)
- Bottom-up message layout using flex justify-end

### TextArea.tsx
**Markdown Rendering:**
- **Headers**: With/without emojis (e.g., `🎯 **Main Topic:**`)
- **Bullet Points**: •, -, * formats
- **Inline Bold**: `**text**` rendering
- **Inline Citations**: `{Source Name}` → rendered as pill buttons
- **Sources**: Collapsible inline pills (no modal)

**Export Prompts:**
- Inline dialog in conversation
- YouTube: Shows Excel + Google Sheets options (when enabled)
- Reports: Shows Markdown download + Google Docs (when enabled)
- Yes/No/Later buttons

### APIKeysSettings.tsx
**AI Model Configuration:**
- Provider selection dropdown
- API key input with show/hide toggle
- Enable/disable toggles per provider
- Cost information display
- Chrome AI compatibility checking

**Other APIs:**
- YouTube Data API
- Reddit, News, Twitter, GitHub APIs
- Serper.dev (web search)
- **Google Sheets API** (OAuth2)
- **Google Docs API** (OAuth2)

**Google API Setup:**
- Client ID input field
- Redirect URI display with copy button
- Step-by-step setup instructions
- "Authenticate with Google" button

---

## Data Management

### Storage Structure
```javascript
{
  multi_tab_collection: [{
    id: string,
    tabId: number,
    title: string,
    url: string,
    content: string,
    summary: string,
    category: 'news' | 'blog' | 'reference' | 'youtube' | 'generic',
    categoryConfidence: number,
    youtubeData?: { ... },
    processed: boolean,
    timestamp: number
  }],
  archive_conversations: [{
    id: string,
    title: string,
    messages: [...],
    tabId: string,
    tabSummary?: string,
    tabCategory?: string,
    suggestedQuestions?: string[],
    timestamp: number
  }],
  ai_api_keys: { ... },
  other_api_keys: { ... },
  google_sheets_token: string,
  google_docs_token: string,
  google_client_id: string
}
```

### Caching
- **YouTube API Responses**: Cached by video ID
- **QA External Searches**: Cached to reduce API calls
- **Summaries**: Optional caching for frequently accessed tabs

---

## Recent Improvements

### Q&A Enhancements (Latest)
1. **Category-Wide Suggested Questions**
   - Structured context from multiple tabs (not just first tab)
   - Diverse, non-duplicate questions
   - Category-specific question styles

2. **Conversation Title Fix**
   - Prevents overwriting existing meaningful titles
   - Multi-tab title context for main QA
   - Better title extraction from AI summaries

3. **Scroll Behavior**
   - Bottom-anchored messages (flex justify-end)
   - Normal scroll (no forced auto-scroll)
   - Opens at latest message automatically

### Export Enhancements
1. **Excel Format**
   - Proper Excel XML (SpreadsheetML) format
   - Two worksheets (Comments + Summary)
   - Sentiment-based row coloring
   - Removed redundant columns

2. **Google Integration**
   - OAuth2 authentication flow
   - Direct export to Google Sheets/Docs
   - No server required (Chrome Identity API)
   - UI shows redirect URI automatically

3. **Export UI**
   - Inline export prompts in conversation
   - Conditional buttons (Google options appear when enabled)
   - Clear format labels (Excel, Google Sheets, etc.)

### Categorization Improvements
1. **Enhanced Heuristics**
   - News signals: "breaking", "reported", "journalist", timestamps
   - Blog signals: "how to", "opinion", "thoughts", "guide"
   - Reference signals: "definition", "documentation", "API reference"
   - Minimum 3 signal hits for confident categorization

2. **URL Pattern Expansion**
   - Docs sites: `docs.*`, `developer.*`, academic sites
   - Blog platforms: Medium, WordPress, Substack, Ghost
   - News domains with content-aware confidence

### YouTube Processing
1. **Deduplication**
   - Canonical URL normalization (strips query params)
   - Stable IDs (`yt-<videoId>`)
   - Processing locks per tab
   - 10-second cooldown for same video on same tab

2. **Comment Analysis**
   - Sentiment scoring with thresholds
   - Theme extraction from comment text
   - Representative comments per sentiment
   - Cached in tab data structure

---

## API Endpoints Used

### External APIs
1. **YouTube Data API v3**
   - Endpoint: `https://www.googleapis.com/youtube/v3`
   - Methods: videos.list, commentThreads.list
   - Cached responses

2. **Serper.dev**
   - Web search for QA external context
   - Optimized for LLM consumption

3. **NewsAPI**
   - News article search
   - Fact-checking support

4. **Wikipedia API**
   - Reference information
   - QA context enhancement

5. **Google Sheets API v4**
   - Create spreadsheets
   - Write values
   - OAuth2 required

6. **Google Docs API v1**
   - Create documents
   - Insert text
   - OAuth2 required

---

## Configuration

### Required Setup
1. **Google OAuth2** (for Sheets/Docs export):
   - Create project in Google Cloud Console
   - Enable Sheets API and Docs API
   - Create OAuth 2.0 Client ID (Web application)
   - Add redirect URI: `chrome.identity.getRedirectURL()` (shown in settings)
   - Copy Client ID to extension settings

2. **YouTube Data API** (optional, for YouTube features):
   - Enable YouTube Data API v3
   - Create API key
   - Add to extension settings

3. **External AI Providers** (optional):
   - Get API keys from respective providers
   - Add to extension settings
   - Enable desired providers

---

## File Structure

```
tabsense/
├── src/
│   ├── background/
│   │   └── service-worker.js      # Main background logic
│   ├── content/
│   │   └── content-script.js      # Content extraction
│   ├── ui/
│   │   ├── sidebar/
│   │   │   ├── TabSenseSidebar.tsx
│   │   │   └── sidebar.html
│   │   ├── components/
│   │   │   ├── QASection.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── APIKeysSettings.tsx
│   │   │   ├── ArchiveSection.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── styles/
│   ├── lib/
│   │   ├── aiAdapter.js
│   │   ├── adaptiveSummarizer.js
│   │   └── api/
│   └── manifest.json
└── dist/                          # Built extension
```

---

## Key Technical Decisions

### Why Excel XML over CSV?
- Better formatting control (colors, styles)
- Two worksheets support
- Native Excel opening

### Why OAuth2 for Google APIs?
- Secure token management via Chrome Identity
- No server required
- Standard Google API authentication pattern

### Why Content-Based Categorization?
- News sites can host non-news content
- More accurate categorization improves QA relevance
- Better user experience with correct category labels

### Why Bottom-Anchored Messages?
- Natural chat behavior (latest at bottom)
- No forced scrolling (users control scroll)
- Opens directly at conversation end

---

## Known Limitations

1. **Google OAuth2**: Requires user to configure Client ID in Google Cloud Console
2. **YouTube API**: Requires API key for full features (comments, metadata)
3. **External AI Providers**: Rate limits apply per provider
4. **Content Extraction**: May fail on heavily JavaScript-rendered pages
5. **Google Sheets Export**: Creates new spreadsheet each time (no append to existing)

---

## Future Enhancements (Roadmap)

1. **Append to Existing Sheets**: Add option to append to existing Google Sheets
2. **Batch Exports**: Export multiple tabs at once
3. **Custom Templates**: User-defined export formats
4. **Advanced Sentiment**: ML-based sentiment analysis
5. **Multi-Language Support**: Summarization in multiple languages
6. **Offline Mode**: Cache summaries for offline access
7. **Collaborative Features**: Share summaries/conversations

---

## Build & Development

### Build Process
```bash
npm run build
```

### Development
- Vite for bundling
- React + TypeScript for UI
- Tailwind CSS for styling
- Chrome Extension Manifest V3

### Distribution
- Built files in `dist/` directory
- Load unpacked extension from `dist/`
- Or publish to Chrome Web Store

---

## Testing Checklist

- [x] Tab auto-processing works
- [x] YouTube comments extraction
- [x] Category-based categorization
- [x] Category-wide Q&A
- [x] Excel export functionality
- [x] Markdown report export
- [x] Google Sheets export (with OAuth)
- [x] Google Docs export (with OAuth)
- [x] Conversation title preservation
- [x] Suggested questions generation
- [x] Retry mechanism for failed queries
- [x] Export prompt UI
- [x] Scroll behavior
- [x] Source rendering (inline citations)

---

## Version History

### Current: v0.1.1

**Recent Changes:**
- Added Google Sheets/Docs API integration
- Improved Excel export format
- Fixed conversation title overwrite bug
- Enhanced category-wide suggested questions
- Improved scroll behavior (bottom-anchored)
- Removed redundant export columns
- Added OAuth2 authentication flow
- Enhanced content-based categorization

**Previous Milestones:**
- Phase 1: Basic summarization
- Phase 2: Q&A system with external context
- YouTube API integration
- Export features implementation

---

## Support & Troubleshooting

### Common Issues

**Export not working:**
- Check `downloads` permission in manifest
- Verify file format (Excel uses data URLs)

**Google OAuth failing:**
- Verify Client ID is correct
- Check redirect URI matches Google Cloud Console
- Ensure Sheets/Docs APIs are enabled in Google Cloud

**YouTube comments not extracted:**
- Verify YouTube API key is set
- Check API quota in Google Cloud Console
- Review console logs for errors

**QA answers shallow:**
- Check external search is enabled
- Verify API keys for Serper.dev/NewsAPI
- Review post-processing logs

---

## License & Credits

See LICENSE file for details.

Built with:
- Chrome Extension APIs
- React + TypeScript
- Vite
- Tailwind CSS
- Various AI Provider APIs
- Google Workspace APIs

---

**Last Updated:** Current session
**Maintainer:** TabSense Development Team

