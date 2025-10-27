# Offscreen Document Implementation Attempt

## Issue Summary
We attempted to implement Chrome's Offscreen API to handle heavy AI processing (Adaptive Summarizer, AI Adapter) to keep the service worker under 60 KB.

## Problem
The offscreen document is created successfully (verified by `chrome.offscreen.hasDocument()` returning `true`), but:
1. No logs appear from the offscreen document (no "Offscreen document loaded" message)
2. Messages to the offscreen document receive `undefined` response
3. Error: "The message port closed before a response was received"
4. No offscreen document console is accessible in Chrome DevTools

## Attempted Fixes

### 1. Manifest Configuration
- **Issue**: `offscreen` key in manifest is invalid
- **Fix**: Removed from manifest, added "offscreen" permission
- **Result**: Document creation works, but not loading

### 2. URL Configuration
- **Issue**: Used `url: 'offscreen.html'` (relative path)
- **Fix**: Changed to `url: chrome.runtime.getURL('offscreen.html')`
- **Result**: URL is correct (`chrome-extension://.../offscreen.html`), but still not loading

### 3. Reasons Array
- **Issue**: Used invalid reason `'DOM_PARSING'`
- **Fix**: Changed to `'DOM_SCRAPING'` (valid Chrome API reason)
- **Result**: Document creation succeeds without errors

### 4. Message Routing
- **Issue**: Messages broadcast to all contexts (sidebar intercepting)
- **Fix**: Added `target: 'offscreen'` filtering in offscreen message listener
- **Result**: Still no response

### 5. Async Handler Handling
- **Issue**: `sendResponse` not called properly in async context
- **Fix**: Added `.catch()` handlers and `return true` for async handlers
- **Result**: Still no response

### 6. Enhanced Logging
- **Issue**: No visibility into offscreen document execution
- **Fix**: Added extensive logging throughout offscreen.js
- **Result**: No logs appear anywhere

## Root Cause Analysis

The offscreen document is created (`hasDocument: true`) but:
1. The script may not be loading due to ES module issues in offscreen context
2. The HTML file may not be accessible from the offscreen context
3. Chrome may be blocking the script for security/CSP reasons
4. The offscreen document console is not visible in regular DevTools

## Current State

### What Works:
- Service worker is stable (42.59 KB)
- Basic tab processing works
- URL filtering works
- Content extraction works
- Message broadcast to sidebar works

### What Doesn't Work:
- Offscreen document never loads
- AI summarization never happens
- No summaries generated

## Alternative Solution Needed

Since the offscreen document approach is not working, we need to reconsider the architecture:

### Option 1: Direct AI Calls in Service Worker
- Use AIAdapter directly in service worker
- Accept larger service worker size
- No offscreen complications

### Option 2: Content Script AI Processing
- Process AI in content script context
- More accessible, but different context limitations

### Option 3: Popup/Extension Page Processing
- Use extension page context for AI
- Most permissive, but requires user to have extension open

## Recommendations

1. **Abandon offscreen document approach** - It's not working despite correct implementation
2. **Re-implement AI in service worker** - Directly import AIAdapter in service worker
3. **Monitor service worker size** - Keep under 60 KB if possible, accept larger if necessary
4. **Use simpler summarization** - Start with basic fetch to external API, add heavy processing later

## Files Involved

- `src/background/service-worker.js` - Main service worker (creates offscreen, sends messages)
- `src/background/offscreen.js` - Offscreen document (should handle AI processing)
- `src/background/offscreen.html` - Offscreen HTML container
- `src/lib/adaptiveSummarizer.js` - Heavy AI processing module
- `src/lib/aiAdapter.js` - AI provider abstraction

## Next Steps

- Remove offscreen document implementation
- Re-integrate AdaptiveSummarizer directly into service worker
- Add lightweight summarization as fallback
- Test with actual API calls
