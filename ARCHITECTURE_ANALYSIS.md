# Architecture Analysis: Heavy Modules

## The Confusion

We have TWO different approaches for heavy modules:

### 1. `heavy-modules.js` (41.46 KB) 
- Built by Vite as separate entry point
- Contains `HeavyModulesImplementation` class
- Imports all heavy modules: AIAdapter, unifiedAPI, ContentExtractor, ContentScorer, URLFilter, enhancedCategorizer, AdaptiveSummarizer, CachingManager, ContextEnhancer
- **NOT USED** anywhere - service worker doesn't load it

### 2. `offscreen.js` (102.89 KB)
- Built by Vite as separate entry point  
- Contains offscreen document implementation
- Imports heavy modules: CredentialManager, ContentScorer, enhancedCategorizer, AdaptiveSummarizer, ContextEnhancer
- **IS USED** - loaded by Chrome Offscreen API
- Has placeholders for handlers but not fully implemented

## The Problem

1. `heavy-modules.js` was created for loading via `fetch()` and `eval()` to avoid service worker size
2. But then we switched to Offscreen API approach
3. Now we have TWO implementations:
   - `heavy-modules.js` - orphaned, not used
   - `offscreen.js` - used but not fully implemented

## Current State

### What Actually Works
- Service worker (33 KB) - minimal, delegates to offscreen
- Offscreen document (103 KB) - loads heavy modules but handlers are placeholders
- Heavy modules.js (41 KB) - ORPHANED, not used

### What's Missing
- Offscreen handlers are placeholders, don't actually call heavy modules
- Service worker doesn't create/communicate with offscreen properly
- Heavy modules integration is incomplete

## The Solution

We need to:
1. **Delete or repurpose `heavy-modules.js`** - it's not being used
2. **Properly implement offscreen handlers** - actually call the loaded modules
3. **Wire up the communication** - service worker → offscreen → heavy modules

## Next Steps

1. Remove `heavy-modules.js` from vite.config and manifest (or repurpose it)
2. Implement actual functionality in offscreen.js handlers
3. Test the offscreen document creation and communication
4. Wire up AdaptiveSummarizer and ContextEnhancer properly

## Recommendation

Use ONLY the offscreen approach. Delete or repurpose heavy-modules.js.

