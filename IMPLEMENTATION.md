# 🛠️ TabSense - Step-by-Step Implementation Guide

**MVP Development Roadmap** | **Hackathon Submission Focus**

---

## 🎯 Implementation Philosophy

### Core Principle: **Gradual Enhancement**
Start with the simplest possible version that works, then enhance incrementally.

### MVP Scope Lock: **Summarization + Cross-Tab Q&A**
- ✅ **Must Have**: Tab summarization, cross-tab Q&A, basic UI
- 🟡 **Nice to Have**: Translation, settings, advanced export
- ❌ **Out of Scope**: Image analysis, audio, enterprise features

---

## 📋 Pre-Development Checklist

### Environment Setup
- [ ] Node.js (LTS 18+) installed
- [ ] Chrome Canary/Dev installed (for AI flags)
- [ ] VS Code with Chrome extension extensions
- [ ] Git repository initialized
- [ ] Project structure created

### Chrome AI Setup
- [ ] Enable Chrome AI flags: `chrome://flags/#enable-ai-features`
- [ ] Verify `window.ai` APIs are available
- [ ] Test basic AI functionality in console

---

## 🚀 Phase 1: Foundation (Days 1-2)

### Step 1.1: Project Structure
```bash
mkdir tabsense
cd tabsense
npm init -y
npm install --save-dev vite tailwindcss autoprefixer postcss
npm install --save-dev eslint prettier
```

### Step 1.2: Basic Manifest
Create `src/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "TabSense MVP",
  "version": "0.1.0",
  "description": "AI-powered tab summarization",
  "permissions": ["tabs", "scripting", "storage", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "dist/popup.html"
  },
  "sidebar_action": {
    "default_panel": "dist/sidebar.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content.js"],
      "run_at": "document_end"
    }
  ]
}
```

### Step 1.3: Build Configuration
Create `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
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
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

### Step 1.4: Tailwind Configuration
Create `src/tailwind.config.js`:
```javascript
export default {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        'tabsense-blue': '#3B82F6',
        'tabsense-gray': '#6B7280'
      }
    }
  }
}
```

### Step 1.5: Package Scripts
Update `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:watch": "vite build --watch",
    "test": "echo 'No tests yet'",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

**✅ Phase 1 Complete**: Basic project structure and build system

---

## 🧠 Phase 2: Core AI Integration (Days 3-4)

### Step 2.1: AI Adapter Foundation
Create `src/lib/aiAdapter.js`:
```javascript
// Simple AI adapter with fallbacks
export async function summarizeText(text) {
  console.log('Attempting to summarize text...');
  
  // Try Chrome's built-in AI first
  if (typeof window !== 'undefined' && window.ai && window.ai.summarizer) {
    try {
      console.log('Using Chrome built-in AI');
      const summarizer = await window.ai.summarizer.create();
      const result = await summarizer.summarize(text);
      return result?.text || result || 'AI summary failed';
    } catch (error) {
      console.error('Chrome AI failed:', error);
    }
  }
  
  // Fallback: Simple text extraction
  console.log('Using fallback summarization');
  return fallbackSummarize(text);
}

// Basic fallback summarizer
function fallbackSummarize(text, maxSentences = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const selected = sentences.slice(0, maxSentences);
  return selected.join(' ').replace(/\s+/g, ' ').trim();
}

// Test function
export async function testAI() {
  const testText = "This is a test article about artificial intelligence and machine learning.";
  const summary = await summarizeText(testText);
  console.log('Test summary:', summary);
  return summary;
}
```

### Step 2.2: Content Extraction
Create `src/lib/textExtractor.js`:
```javascript
// Extract main content from web pages
export function extractPageContent() {
  console.log('Extracting page content...');
  
  // Try multiple selectors for main content
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
    if (content && content.innerText.length > 100) {
      console.log(`Found content with selector: ${selector}`);
      break;
    }
  }
  
  // Fallback to body if no main content found
  if (!content || content.innerText.length < 100) {
    content = document.body;
    console.log('Using document.body as fallback');
  }
  
  // Clean up the content
  const clone = content.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, form, iframe, .ad, .advertisement').forEach(n => n.remove());
  
  const extractedText = clone.innerText.slice(0, 100000); // Cap at 100k chars
  
  return {
    title: document.title,
    url: location.href,
    text: extractedText,
    timestamp: Date.now(),
    wordCount: extractedText.split(' ').length
  };
}
```

### Step 2.3: Background Service Worker
Create `src/background.js`:
```javascript
import { summarizeText } from './lib/aiAdapter.js';

console.log('TabSense background script loaded');

// Simple message handling
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  console.log('Background received message:', msg.action);
  
  if (msg.action === "PAGE_CONTENT") {
    await handlePageContent(msg.payload, sender.tab?.id);
  }
  
  if (msg.action === "TEST_AI") {
    const result = await summarizeText("Test text for AI functionality");
    chrome.runtime.sendMessage({
      action: "AI_TEST_RESULT",
      payload: { result }
    });
  }
});

// Handle page content extraction
async function handlePageContent(payload, tabId) {
  console.log('Processing page content for tab:', tabId);
  const { url, title, text } = payload;
  
  // Simple cache key
  const cacheKey = `summary_${url}`;
  
  // Check if we already have a summary
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    console.log('Using cached summary for:', url);
    return;
  }
  
  // Generate summary
  console.log('Generating summary for:', title);
  const summary = await summarizeText(text);
  
  // Store in cache
  await chrome.storage.local.set({
    [cacheKey]: {
      timestamp: Date.now(),
      url,
      title,
      summary,
      wordCount: text.split(' ').length
    }
  });
  
  console.log('Summary generated and cached for:', title);
  
  // Notify sidebar
  chrome.runtime.sendMessage({
    action: "SUMMARY_READY",
    payload: { url, title, summary, tabId }
  });
}
```

### Step 2.4: Content Script
Create `src/content.js`:
```javascript
import { extractPageContent } from './lib/textExtractor.js';

console.log('TabSense content script loaded on:', location.href);

// Extract content and send to background
(async () => {
  try {
    const content = extractPageContent();
    console.log('Extracted content:', content.title, content.wordCount, 'words');
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: "PAGE_CONTENT",
      payload: content
    });
  } catch (error) {
    console.error('Content extraction failed:', error);
  }
})();
```

**✅ Phase 2 Complete**: Basic AI integration and content extraction

---

## 🎨 Phase 3: User Interface (Days 5-6)

### Step 3.1: Sidebar HTML
Create `src/sidebar.html`:
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
  <div class="max-w-md mx-auto p-4 space-y-4">
    <!-- Header -->
    <header class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-tabsense-blue">TabSense MVP</h1>
        <div id="status" class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          Ready
        </div>
      </div>
    </header>
    
    <!-- Tab Summaries -->
    <section class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Tab Summaries</h2>
      <div id="tabsList" class="space-y-3">
        <div class="text-gray-500 text-sm">No summaries yet. Open some tabs to get started.</div>
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
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tabsense-blue focus:border-transparent text-sm"
        >
        <button 
          id="askBtn" 
          class="w-full bg-tabsense-blue text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 font-medium text-sm"
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

### Step 3.2: Sidebar JavaScript
Create `src/sidebar.js`:
```javascript
console.log('TabSense sidebar loaded');

// DOM elements
const statusEl = document.getElementById('status');
const tabsListEl = document.getElementById('tabsList');
const questionInputEl = document.getElementById('questionInput');
const askBtnEl = document.getElementById('askBtn');
const answerAreaEl = document.getElementById('answerArea');

// State
let summaries = [];

// Initialize
async function init() {
  console.log('Initializing sidebar...');
  updateStatus('Loading...');
  
  // Load existing summaries
  await loadSummaries();
  
  // Set up event listeners
  askBtnEl.addEventListener('click', handleAskQuestion);
  questionInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAskQuestion();
  });
  
  updateStatus('Ready');
}

// Load summaries from storage
async function loadSummaries() {
  console.log('Loading summaries...');
  const result = await chrome.storage.local.get();
  summaries = Object.values(result).filter(item => item.summary);
  
  console.log(`Found ${summaries.length} summaries`);
  renderSummaries();
}

// Render summaries in UI
function renderSummaries() {
  if (summaries.length === 0) {
    tabsListEl.innerHTML = '<div class="text-gray-500 text-sm">No summaries yet. Open some tabs to get started.</div>';
    return;
  }
  
  tabsListEl.innerHTML = summaries.map((summary, index) => `
    <div class="border border-gray-200 rounded-md p-3">
      <div class="font-medium text-sm text-gray-800 mb-1">${summary.title}</div>
      <div class="text-xs text-gray-600 mb-2">${summary.wordCount} words</div>
      <div class="text-sm text-gray-700">${summary.summary}</div>
    </div>
  `).join('');
}

// Handle question asking
async function handleAskQuestion() {
  const question = questionInputEl.value.trim();
  if (!question) return;
  
  console.log('Asking question:', question);
  updateStatus('Processing...');
  
  // Simple Q&A implementation
  const answer = await answerQuestion(question, summaries);
  
  // Show answer
  answerAreaEl.innerHTML = `<strong>Q:</strong> ${question}<br><strong>A:</strong> ${answer}`;
  answerAreaEl.classList.remove('hidden');
  
  updateStatus('Ready');
}

// Simple Q&A function
async function answerQuestion(question, summaries) {
  if (summaries.length === 0) {
    return "No summaries available. Please open some tabs first.";
  }
  
  // Try Chrome AI if available
  if (typeof window !== 'undefined' && window.ai && window.ai.prompt) {
    try {
      const prompt = `Based on these tab summaries: ${summaries.map(s => s.title + ': ' + s.summary).join('\n\n')}\n\nQuestion: ${question}`;
      const session = await window.ai.prompt.create();
      const response = await session.prompt(prompt);
      return response?.text || response || 'AI response failed';
    } catch (error) {
      console.error('AI Q&A failed:', error);
    }
  }
  
  // Fallback: Simple keyword matching
  const keywords = question.toLowerCase().split(' ');
  const relevantSummaries = summaries.filter(s => 
    keywords.some(keyword => 
      s.title.toLowerCase().includes(keyword) || 
      s.summary.toLowerCase().includes(keyword)
    )
  );
  
  if (relevantSummaries.length === 0) {
    return "I couldn't find relevant information in your open tabs.";
  }
  
  return `Based on ${relevantSummaries.length} relevant tab(s): ${relevantSummaries.map(s => s.title).join(', ')}`;
}

// Update status indicator
function updateStatus(status) {
  statusEl.textContent = status;
  statusEl.className = status === 'Ready' ? 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full' : 'px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full';
}

// Listen for new summaries
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "SUMMARY_READY") {
    console.log('New summary received:', msg.payload.title);
    loadSummaries(); // Reload summaries
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
```

### Step 3.3: Popup HTML
Create `src/popup.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TabSense</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="w-80 p-4 bg-gray-50">
  <div class="space-y-4">
    <div class="text-center">
      <h1 class="text-lg font-bold text-blue-600">TabSense MVP</h1>
      <p class="text-sm text-gray-600">AI-powered tab summarization</p>
    </div>
    
    <div class="space-y-2">
      <button id="openSidebar" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
        Open Sidebar
      </button>
      
      <button id="testAI" class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
        Test AI
      </button>
    </div>
    
    <div id="status" class="text-xs text-gray-500 text-center">
      Ready
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Step 3.4: Popup JavaScript
Create `src/popup.js`:
```javascript
console.log('TabSense popup loaded');

document.getElementById('openSidebar').addEventListener('click', () => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

document.getElementById('testAI').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Testing AI...';
  
  chrome.runtime.sendMessage({ action: "TEST_AI" });
  
  // Listen for response
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "AI_TEST_RESULT") {
      statusEl.textContent = `AI Test: ${msg.payload.result}`;
    }
  });
});
```

**✅ Phase 3 Complete**: Basic UI with sidebar and popup

---

## 🔧 Phase 4: Integration & Testing (Days 7-8)

### Step 4.1: Build and Test
```bash
npm run build
```

### Step 4.2: Load Extension in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Step 4.3: Test Core Functionality
1. **Open multiple tabs** with different content
2. **Check console logs** for extraction and summarization
3. **Open sidebar** and verify summaries appear
4. **Test Q&A** with questions about open tabs
5. **Verify caching** by refreshing tabs

### Step 4.4: Error Handling
Add to `src/lib/aiAdapter.js`:
```javascript
export async function summarizeText(text) {
  try {
    console.log('Attempting to summarize text...');
    
    if (typeof window !== 'undefined' && window.ai && window.ai.summarizer) {
      try {
        console.log('Using Chrome built-in AI');
        const summarizer = await window.ai.summarizer.create();
        const result = await summarizer.summarize(text);
        return result?.text || result || 'AI summary failed';
      } catch (error) {
        console.error('Chrome AI failed:', error);
        throw error;
      }
    }
    
    // Fallback: Simple text extraction
    console.log('Using fallback summarization');
    return fallbackSummarize(text);
    
  } catch (error) {
    console.error('Summarization failed:', error);
    return `Error: Could not summarize content from ${document.title}`;
  }
}
```

**✅ Phase 4 Complete**: Working extension with error handling

---

## 🚀 Phase 5: Polish & Submission (Days 9-10)

### Step 5.1: Add Icons
Create basic icons in `icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)  
- `icon128.png` (128x128)

### Step 5.2: Final Testing Checklist
- [ ] Extension loads without errors
- [ ] Content extraction works on various sites
- [ ] Summarization functions (AI or fallback)
- [ ] Cross-tab Q&A works
- [ ] UI is responsive and clean
- [ ] Error handling is graceful
- [ ] Performance is acceptable

### Step 5.3: Demo Script
1. **Setup**: Open 4-5 tabs with different content (news, blog, docs)
2. **Install**: Show extension loading process
3. **Core Features**: Demonstrate summarization and Q&A
4. **Error Handling**: Show fallback behavior
5. **Performance**: Show speed and responsiveness

### Step 5.4: Submission Package
```bash
# Create submission zip
zip -r tabsense-submission.zip dist/ icons/ README.md DEVELOPMENT.md
```

**✅ Phase 5 Complete**: Ready for hackathon submission

---

## 📊 Success Criteria

### MVP Must-Have Features
- [ ] **Text Summarization**: Works on most web pages
- [ ] **Cross-Tab Q&A**: Can answer questions across tabs
- [ ] **Clean UI**: Professional sidebar and popup
- [ ] **Error Handling**: Graceful fallbacks
- [ ] **Performance**: < 5 seconds per summary

### Nice-to-Have Features
- [ ] **Translation**: Basic text translation
- [ ] **Settings**: User preferences
- [ ] **Export**: Markdown or clipboard export
- [ ] **Advanced Q&A**: Better AI integration

### Out of Scope (Post-Hackathon)
- [ ] Image analysis
- [ ] Audio transcription
- [ ] Enterprise features
- [ ] Multi-browser support
- [ ] Advanced integrations

---

## 🎯 Daily Development Schedule

### Day 1-2: Foundation
- Project setup and build system
- Basic manifest and permissions
- Tailwind CSS integration

### Day 3-4: Core AI
- AI adapter with fallbacks
- Content extraction
- Background service worker
- Content script

### Day 5-6: User Interface
- Sidebar HTML and CSS
- Sidebar JavaScript functionality
- Popup interface
- Event handling

### Day 7-8: Integration
- Build and test
- Error handling
- Performance optimization
- Cross-tab functionality

### Day 9-10: Polish
- Icons and branding
- Final testing
- Demo preparation
- Submission package

---

## 🚨 Common Pitfalls to Avoid

### Scope Creep
- ❌ Don't add image analysis "just because"
- ❌ Don't implement enterprise features
- ❌ Don't build multi-browser support
- ✅ Focus on core summarization + Q&A

### Technical Over-Engineering
- ❌ Don't build complex caching systems
- ❌ Don't implement advanced AI models
- ❌ Don't create elaborate error handling
- ✅ Keep it simple and working

### UI Complexity
- ❌ Don't build elaborate dashboards
- ❌ Don't add too many settings
- ❌ Don't create complex animations
- ✅ Clean, simple, functional

---

## 📝 Development Notes

### Chrome AI API Notes
- APIs are experimental and may change
- Always provide fallbacks
- Test on Chrome Canary/Dev first
- Document any API limitations

### Performance Considerations
- Limit concurrent AI calls
- Implement basic caching
- Monitor memory usage
- Provide loading indicators

### User Experience
- Show clear status indicators
- Provide helpful error messages
- Make interactions intuitive
- Test on different screen sizes

---

*This implementation guide ensures you build a working MVP that demonstrates core value while staying within hackathon scope. Focus on getting the basics right before adding any enhancements.*
