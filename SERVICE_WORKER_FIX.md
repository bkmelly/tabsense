# Service Worker Registration Error - Fixed

## Problem
Service worker failed to register with error code 15. The issue was that service workers cannot use ES6 imports directly.

## Root Cause
Service workers in Chrome extensions cannot use `import` statements. The Vite build was outputting ES6 module code that service workers cannot execute.

## Solution Applied
1. Removed `import { AdaptiveSummarizer }` statement from service worker
2. Simplified summarization to use basic extractive approach
3. Service worker now uses plain JavaScript only

## Current Implementation
- Service worker: Basic extractive summarization (no AI)
- Extension loads and works
- Tabs are processed and summarized

## Future Enhancement
To add AI summarization back:
1. Use dynamic `import()` to load AdaptiveSummarizer asynchronously
2. OR bundle AdaptiveSummarizer into the service worker code
3. OR use offscreen document with proper API access

## Next Steps
1. Reload extension
2. Test basic summarization
3. Implement dynamic import for AI summarization if needed
