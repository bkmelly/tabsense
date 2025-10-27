# Offscreen Document Implementation - Debug Attempts

## Date: Current Session

## Overview
This document tracks all attempts to fix the Chrome Offscreen Document implementation for heavy AI processing in the TabSense extension.

## Problem Statement
- Service worker size exceeded 60KB limit, causing registration failures (Status Code 15)
- Heavy modules (AdaptiveSummarizer, AIAdapter, etc.) needed to be isolated
- Offscreen Document API should handle heavy processing
- Offscreen document created but not loading or responding to messages

## Attempts Made

### Attempt 1: Basic Offscreen Implementation
**Date**: Initial attempt
**Changes**:
- Added `offscreen.html` and `offscreen.js` files
- Added `offscreen` permission to manifest
- Added `createOffscreenDocument()` to service worker
- Used ES6 module imports in offscreen.js

**Result**: 
- Build succeeded but offscreen document never loaded
- No logs from offscreen document in console
- Error: "The message port closed before a response was received"

**Root Cause**: Modules failed to load in offscreen document context

### Attempt 2: Fixed Reason Parameter
**Date**: Current session
**Changes**:
- Changed `reasons: ['DOM_PARSING']` to `reasons: ['DOM_SCRAPING']`
- Fixed manifest validation error

**Result**:
- Service worker initialization succeeded
- Offscreen document created successfully
- But still no offscreen logs appeared

### Attempt 3: Improved Logging and Diagnostics
**Date**: Current session
**Changes**:
- Added extensive console logging to offscreen.js
- Added `PING_OFFSCREEN` message handler
- Added diagnostic ping test in service worker
- Added 500ms delay after offscreen creation for initialization

**Code Changes**:
```javascript
// In service-worker.js
async createOffscreenDocument() {
  const hasOffscreen = await chrome.offscreen.hasDocument();
  console.log('[TabSense] Checking offscreen document existence:', hasOffscreen);
  
  if (hasOffscreen) {
    // Send test message
    const response = await chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'PING_OFFSCREEN',
      payload: { message: 'Test from service worker' }
    });
    console.log('[TabSense] Offscreen document is responsive:', response);
    return;
  }
  
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'AI summarization and heavy content processing'
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Send test ping
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'PING_OFFSCREEN',
    payload: { message: 'Test from service worker' }
  });
  console.log('[TabSense] Offscreen document responded to ping:', response);
}
```

```javascript
// In offscreen.js
console.log('[TabSense Offscreen] ═══ Offscreen document loaded ═══');
console.log('[TabSense Offscreen] ✅ Setting up message listener...');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TabSense Offscreen] 📨 Message received!', message);
  
  if (message.target !== 'offscreen') {
    return false;
  }
  
  switch (action) {
    case 'PING_OFFSCREEN':
      console.log('[TabSense Offscreen] 📩 PING_OFFSCREEN received, responding...');
      sendResponse({ success: true, message: 'Offscreen document is alive and responding!' });
      return true;
    // ... other handlers
  }
});
```

### Attempt 4: Improved Error Handling in autoProcessTab
**Date**: Current session  
**Changes**:
- Wrapped offscreen message sending in try-catch
- Added fallback to extractive summarization if offscreen fails
- Better error messages

**Code**:
```javascript
try {
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'ADAPTIVE_SUMMARIZE',
    text: extractedData.content.substring(0, 10000),
    url: tab.url,
    title: extractedData.title,
    metadata: {
      category: extractedData.category,
      wordCount: extractedData.content.split(/\s+/).length
    }
  });
  
  if (response && response.success && response.data?.summary) {
    summary = response.data.summary;
    console.log('[TabSense] ✅ Adaptive summary generated successfully');
  } else {
    // Fallback to extractive summary
    const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    summary = sentences.slice(0, 3).join('. ') + '.';
  }
} catch (offscreenError) {
  console.log('[TabSense] Offscreen not responding:', offscreenError.message);
  // Fallback to basic summarization
  const sentences = extractedData.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  summary = sentences.slice(0, 3).join('. ') + '.';
}
```

## Current Status
- **Service Worker Size**: 43.44 KB (within 60KB limit)
- **Offscreen Document Size**: 190.02 KB (properly isolated)
- **Build**: ✓ Successful
- **Issue**: Offscreen document not loading or responding

## Build Configuration
- Added `offscreen.js` as separate entry point in `vite.config.js`
- Added `copy-offscreen` script to copy `offscreen.html` to dist
- Uses ES6 modules with `type="module"` in HTML

## Files Modified
1. `src/background/service-worker.js` - Added offscreen creation and diagnostics
2. `src/background/offscreen.js` - Heavy module handling and message listeners
3. `src/background/offscreen.html` - Offscreen document HTML
4. `vite.config.js` - Added offscreen.js entry
5. `src/manifest.json` - Added offscreen permission
6. `package.json` - Added copy-offscreen script

## Next Steps
1. Test the new diagnostic logging
2. Check Chrome DevTools for offscreen document logs
3. Investigate why offscreen document might not be loading even though it's being created
4. Consider alternative approaches if offscreen API continues to fail

## Alternative Approaches Considered
1. Use content scripts for heavy processing (not ideal)
2. Split service worker into multiple workers (limited by Chrome)
3. Load modules dynamically at runtime (complexity)
4. Use Web Workers instead of Offscreen Document (current approach)

## Known Issues
- Offscreen document created but module loading fails silently
- No error logs in Chrome DevTools
- Message passing to offscreen document not working
- `chrome.runtime.sendMessage` should broadcast but offscreen not receiving

## Research Needed
- How other extensions handle large service workers
- Best practices for Chrome Offscreen Document
- Alternative patterns for heavy AI processing in Chrome extensions
- Whether dynamic imports work in offscreen context

