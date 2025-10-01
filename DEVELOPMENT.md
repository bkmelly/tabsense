# 🚀 TabSense - MVP Development Guide & Hackathon Submission

**Chrome AI Challenge 2025** | **MVP-Focused Development**

---

## 🎯 MVP Scope (Hackathon Focus)

### ✅ Core Features (Must-Have)
- **Text Summarization**: Single tab and cross-tab summaries
- **Cross-Tab Q&A**: Ask questions across multiple open tabs
- **Sidebar UI**: Clean, responsive interface
- **Basic Export**: Markdown and clipboard export
- **Privacy-First**: Local processing with Chrome's built-in AI

### 🟡 Nice-to-Have (If Time Permits)
- **Translation**: Basic text translation
- **Settings Panel**: User preferences
- **Error Handling**: Graceful fallbacks

### ❌ Out of Scope (Post-Hackathon)
- Image analysis and audio transcription
- Enterprise features and team collaboration
- Advanced integrations (Notion, Google Docs)
- Multi-browser support
- API platform and licensing

---

## 🎯 Quick Start for Developers

### Prerequisites
- **Node.js** (LTS version 18+)
- **Chrome Canary/Dev** (for AI flags)
- **Git** for version control
- **VS Code** (recommended) with Chrome extension development extensions
- **Tailwind CSS** for styling

### Installation & Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/tabsense.git
cd tabsense

# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

---

## 🏗️ Project Structure

```
tabsense/
├── 📁 src/                          # Source code
│   ├── 📄 manifest.json             # Extension manifest
│   ├── 📄 background.js             # Service worker
│   ├── 📄 content.js                # Content script
│   ├── 📄 sidebar.html              # Sidebar UI
│   ├── 📄 sidebar.js                 # Sidebar logic
│   ├── 📄 popup.html                 # Popup UI
│   ├── 📄 popup.js                   # Popup logic
│   ├── 📄 tailwind.config.js         # Tailwind CSS config
│   └── 📁 lib/                       # Core libraries
│       ├── 📄 aiAdapter.js           # AI API wrapper
│       ├── 📄 textExtractor.js       # Text extraction
│       └── 📄 chunker.js             # Text chunking
├── 📁 dist/                          # Built extension
├── 📁 icons/                         # Extension icons
├── 📄 package.json                   # Dependencies & scripts
├── 📄 vite.config.js                 # Build configuration
└── 📄 README.md                      # Public documentation
```

---

## 🔧 Core Implementation Files

### 1. manifest.json (Chrome Extension Configuration)
```json
{
  "manifest_version": 3,
  "name": "TabSense",
  "version": "1.0.0",
  "description": "AI-powered research assistant for Chrome tabs",
  "permissions": [
    "tabs",
    "scripting", 
    "storage",
    "activeTab",
    "contextMenus"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "dist/popup.html",
    "default_title": "Open TabSense"
  },
  "sidebar_action": {
    "default_panel": "dist/sidebar.html",
    "default_title": "TabSense Research Assistant"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. background.js (Service Worker)
```javascript
// Core service worker functionality
import { summarizeText, answerQuestion } from './lib/aiAdapter.js';

const SUMMARY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

// Message handling
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  switch (msg.action) {
    case "PAGE_CONTENT":
      await handlePageContent(msg.payload, sender.tab?.id);
      break;
    case "ASK_QUESTION":
      await handleQuestion(msg.question);
      break;
    case "GET_SUMMARIES":
      await sendSummariesToSidebar();
      break;
  }
});

// Handle page content extraction
async function handlePageContent(payload, tabId) {
  const { url, title, text } = payload;
  const cacheKey = `summary_${url}`;
  
  // Check cache
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < SUMMARY_TTL_MS) {
    return; // Already cached
  }
  
  // Generate summary
  const summary = await summarizeText(text);
  
  // Store in cache
  await chrome.storage.local.set({
    [cacheKey]: {
      ts: Date.now(),
      url,
      title,
      summary
    }
  });
  
  // Notify sidebar
  chrome.runtime.sendMessage({
    action: "SUMMARY_READY",
    payload: { url, title, summary, tabId }
  });
}

// Handle cross-tab questions
async function handleQuestion(question) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const summaries = [];
  
  for (const tab of tabs) {
    const cacheKey = `summary_${tab.url}`;
    const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
    if (cached) {
      summaries.push({
        title: cached.title,
        url: cached.url,
        summary: cached.summary
      });
    }
  }
  
  const answer = await answerQuestion(question, summaries);
  
  chrome.runtime.sendMessage({
    action: "QUESTION_ANSWER",
    payload: { question, answer }
  });
}
```

### 3. content.js (Content Script)
```javascript
// Extract page content and send to background
(function() {
  function extractPageContent() {
    // Try to find main content
    const article = document.querySelector('article') || 
                   document.querySelector('main') || 
                   document.querySelector('[role="main"]') ||
                   document.body;
    
    // Clean up the content
    const clone = article.cloneNode(true);
    clone.querySelectorAll('script, style, nav, footer, form, iframe, .ad, .advertisement').forEach(n => n.remove());
    
    return {
      title: document.title,
      url: location.href,
      text: clone.innerText.slice(0, 100000), // Cap at 100k chars
      timestamp: Date.now()
    };
  }
  
  // Send content to background
  const content = extractPageContent();
  chrome.runtime.sendMessage({
    action: "PAGE_CONTENT",
    payload: content
  });
})();
```

### 4. lib/aiAdapter.js (AI Integration)
```javascript
// AI adapter with fallbacks
export async function summarizeText(text) {
  // Try Chrome's built-in AI first
  if (typeof window !== 'undefined' && window.ai && window.ai.summarizer) {
    try {
      const summarizer = await window.ai.summarizer.create();
      const result = await summarizer.summarize(text);
      return result?.text || result;
    } catch (err) {
      console.error("Built-in summarizer failed:", err);
    }
  }
  
  // Fallback to simple extraction
  return fallbackSummarize(text);
}

export async function answerQuestion(question, summaries) {
  const prompt = `
    You are a research assistant. Here are summaries from open tabs:
    ${summaries.map((s, i) => `[${i + 1}] ${s.title}\n${s.summary}`).join("\n\n")}
    
    Question: ${question}
    
    Please provide a concise answer and cite which tab numbers you used.
  `;
  
  if (typeof window !== 'undefined' && window.ai && window.ai.prompt) {
    try {
      const session = await window.ai.prompt.create();
      const response = await session.prompt(prompt);
      return response?.text || response;
    } catch (err) {
      console.error("Built-in prompt failed:", err);
    }
  }
  
  return `Unable to access AI. Please enable Chrome's built-in AI features.`;
}

// Simple fallback summarizer
function fallbackSummarize(text, maxSentences = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').replace(/\s+/g, ' ').trim();
}
```

### 5. sidebar.html (Main UI with Tailwind CSS)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TabSense</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'tabsense-blue': '#3B82F6',
            'tabsense-gray': '#6B7280'
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="max-w-md mx-auto p-4 space-y-6">
    <!-- Header -->
    <header class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-tabsense-blue">TabSense</h1>
        <div id="status" class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          Ready
        </div>
      </div>
    </header>
    
    <!-- Consolidated Summary -->
    <section class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Consolidated Summary</h2>
      <div id="consolidatedText" class="text-gray-600 text-sm leading-relaxed">
        No summary yet
      </div>
    </section>
    
    <!-- Tab Summaries -->
    <section class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Tab Summaries</h2>
      <div id="tabsList" class="space-y-3">
        <!-- Tab summaries will be dynamically inserted here -->
      </div>
    </section>
    
    <!-- Q&A Section -->
    <section class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Ask Questions</h2>
      <div class="space-y-3">
        <input 
          type="text" 
          id="questionInput" 
          placeholder="Ask about your open tabs..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tabsense-blue focus:border-transparent"
        >
        <button 
          id="askBtn" 
          class="w-full bg-tabsense-blue text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium"
        >
          Ask
        </button>
        <div id="answerArea" class="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-700 hidden">
          <!-- Answers will appear here -->
        </div>
      </div>
    </section>
  </div>
  
  <script src="sidebar.js"></script>
</body>
</html>
```

---

## 🎨 User Experience Flow

### Primary User Journey
1. **Installation**: User installs extension from Chrome Web Store
2. **First Use**: Extension opens sidebar automatically, shows welcome message
3. **Browsing**: User opens multiple tabs with research content
4. **Summarization**: Extension automatically detects and summarizes content
5. **Interaction**: User clicks TabSense icon to open sidebar
6. **Q&A**: User asks questions about their open tabs
7. **Export**: User exports results to clipboard or markdown

### Interface Design
- **Sidebar**: Pinned to Chrome sidebar, 400px wide, scrollable
- **Popup**: Quick access from extension icon, 320px wide
- **Context Menu**: Right-click options for selected text
- **Status Indicators**: Loading states, error messages, success confirmations

### Interaction Patterns
- **Auto-Summarization**: Background processing, no user action required
- **Manual Triggers**: Click extension icon, right-click context menu
- **Progressive Enhancement**: Works without AI, better with AI enabled
- **Responsive Design**: Adapts to different sidebar widths

---

## 🛡️ Edge Case Handling

### Content Extraction Issues
```javascript
// Handle different content types
function extractContent() {
  // Try multiple selectors
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '#content'
  ];
  
  let content = null;
  for (const selector of selectors) {
    content = document.querySelector(selector);
    if (content && content.innerText.length > 100) break;
  }
  
  // Fallback to body if no main content found
  if (!content || content.innerText.length < 100) {
    content = document.body;
  }
  
  return content;
}
```

### Paywalled Content
- **Detection**: Check for common paywall indicators
- **User Notification**: "Content appears to be behind a paywall"
- **Fallback**: Extract visible text, note limitations
- **User Choice**: Allow user to proceed or skip

### Infinite Scroll / Dynamic Content
- **Initial Load**: Extract content on page load
- **Scroll Detection**: Monitor for new content
- **User Trigger**: Manual refresh button
- **Limitations**: Note that dynamic content may not be captured

### Large Documents
- **Size Limits**: Cap at 100,000 characters
- **Chunking**: Split into manageable pieces
- **Progress Indicators**: Show processing status
- **User Notification**: "Large document detected, processing..."

### Performance Issues
- **Memory Management**: Limit concurrent processing
- **Timeout Handling**: 30-second timeout for AI calls
- **Fallback Mode**: Simple text extraction if AI fails
- **User Feedback**: Clear error messages and retry options

---

## 🧪 Development Workflow

### Daily Development
```bash
# Start development
npm run dev

# In another terminal, watch for changes
npm run build:watch

# Test in Chrome
# 1. Load extension
# 2. Open multiple tabs
# 3. Click TabSense icon
# 4. Test summarization and Q&A
```

### Testing Checklist
- [ ] Extension loads without errors
- [ ] Content script extracts text from various sites
- [ ] Summarization works for different content types
- [ ] Cross-tab Q&A functions correctly
- [ ] UI is responsive and accessible
- [ ] Error handling works gracefully

### Debugging Tips
1. **Chrome DevTools**: Use for extension debugging
2. **Console Logs**: Check background script console
3. **Storage Inspector**: Monitor chrome.storage.local
4. **Network Tab**: Check for API calls
5. **Extension Reload**: Use chrome://extensions/ to reload

---

## 🏆 Hackathon Submission Checklist

### Pre-Submission
- [ ] **Working Extension**: All core features functional
- [ ] **Demo Video**: 2-3 minute walkthrough
- [ ] **GitHub Repository**: Clean, documented code
- [ ] **README**: Clear installation instructions
- [ ] **Privacy Policy**: Data handling explanation

### Demo Script (for judges)
1. **Setup**: Open 5-6 tabs with research content
2. **Installation**: Show extension loading process
3. **Core Features**: Demonstrate summarization
4. **Cross-Tab Q&A**: Ask questions across tabs
5. **Export**: Show markdown export
6. **Privacy**: Explain local processing

### Submission Materials
- [ ] **Extension Package**: ZIP file with dist/ folder
- [ ] **Demo Video**: Upload to YouTube/Vimeo
- [ ] **GitHub Link**: Public repository
- [ ] **Written Description**: Problem, solution, impact
- [ ] **Technical Documentation**: APIs used, architecture

---

## 🔧 Build Configuration

### package.json
```json
{
  "name": "tabsense",
  "version": "1.0.0",
  "description": "AI-powered research assistant for Chrome",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:watch": "vite build --watch",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "esbuild": "^0.17.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### vite.config.js
```javascript
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: 'src/background.js',
        content: 'src/content.js',
        sidebar: 'src/sidebar.html',
        popup: 'src/popup.html'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tabsense-blue': '#3B82F6',
        'tabsense-gray': '#6B7280',
        'tabsense-green': '#10B981',
        'tabsense-red': '#EF4444',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}
```

---

## 🚀 Performance Benchmarks & Optimization

### Performance Targets (MVP)
- **Load Time**: < 2 seconds for extension startup
- **Memory Usage**: < 100MB total extension memory
- **Summary Generation**: < 5 seconds per tab
- **UI Responsiveness**: < 100ms for user interactions
- **Cache Hit Rate**: > 80% for repeated content

### Memory Management
```javascript
// Cache configuration
const CACHE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB max cache
  maxEntries: 1000, // Max 1000 cached summaries
  ttl: 24 * 60 * 60 * 1000, // 24 hours TTL
  cleanupInterval: 60 * 60 * 1000 // Cleanup every hour
};

// Memory monitoring
function monitorMemory() {
  const memoryInfo = chrome.runtime.getBackgroundPage();
  if (memoryInfo.memoryUsage > CACHE_CONFIG.maxSize) {
    cleanupOldCache();
  }
}
```

### Fallback Strategies
```javascript
// AI Fallback Chain
async function summarizeWithFallback(text) {
  try {
    // 1. Try Chrome's built-in AI
    if (window.ai && window.ai.summarizer) {
      return await window.ai.summarizer.create().summarize(text);
    }
  } catch (error) {
    console.log('Chrome AI failed, trying fallback');
  }
  
  try {
    // 2. Try simple extraction
    return extractKeySentences(text);
  } catch (error) {
    console.log('Extraction failed, using basic fallback');
  }
  
  // 3. Basic fallback
  return `Content from: ${document.title}`;
}
```

### Offline Mode Handling
- **AI Unavailable**: Show "AI features disabled" message
- **Network Issues**: Cache previous results, show offline indicator
- **Chrome Version**: Check for AI API availability
- **User Notification**: Clear messaging about feature availability

### User Experience
- **Loading States**: Skeleton screens, progress bars
- **Error Handling**: User-friendly error messages with retry options
- **Responsive Design**: Works on different screen sizes (300px-800px sidebar)
- **Accessibility**: Keyboard navigation, ARIA labels, screen reader support

---

## 🐛 Common Issues & Solutions

### Issue: Extension won't load
**Solution**: Check manifest.json syntax, ensure all files exist

### Issue: AI APIs not working
**Solution**: Enable Chrome AI flags, check window.ai availability

### Issue: Content extraction fails
**Solution**: Add fallbacks, handle different page structures

### Issue: Performance problems
**Solution**: Implement chunking, add caching, optimize queries

---

## 📊 Success Metrics

### Technical Metrics
- **Load Time**: < 2 seconds
- **Memory Usage**: < 100MB
- **Error Rate**: < 5%
- **Cache Hit Rate**: > 80%

### User Metrics
- **Installation Success**: > 95%
- **Feature Usage**: > 70% use core features
- **Retention**: > 50% use again within 7 days

---

## 🤝 Contributing

### Code Style
- **ESLint**: Follow JavaScript best practices
- **Prettier**: Consistent code formatting
- **Comments**: Document complex logic
- **Tests**: Write unit tests for core functions

### Pull Request Process
1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with tests
4. **Submit** pull request with description
5. **Review** and iterate

---

## 📞 Support

### Development Support
- **Issues**: GitHub Issues for bugs
- **Discussions**: GitHub Discussions for questions
- **Discord**: Real-time chat for developers

### Hackathon Support
- **Documentation**: This file + project.readme.md
- **Examples**: Code snippets and patterns
- **Troubleshooting**: Common issues and solutions

---

*Happy coding! 🚀 Let's build the future of intelligent browsing together.*
