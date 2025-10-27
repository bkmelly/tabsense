# TODO for Next Session - Offscreen Document Issue

## Current Status
- ✅ Service worker fixed (43.44 KB, within 60KB limit)
- ✅ Offscreen document files created and built
- ✅ Diagnostic logging added
- ✅ Fallback to extractive summarization implemented
- ❌ **ISSUE**: Offscreen document not loading or responding to messages

## What We Know
1. Offscreen document is being **created successfully** (`chrome.offscreen.createDocument()` succeeds)
2. **No logs** from offscreen document appear in console
3. Service worker logs show offscreen created but no response
4. Build succeeds with offscreen.js at 190.02 KB

## What Needs Investigation Tomorrow

### Priority 1: Test and Debug
1. **Test the extension** and capture ALL console logs (service worker + offscreen if any appear)
2. **Check Chrome DevTools** > Extensions > TabSense > "Service workers" > Look for offscreen document section
3. Look for any offscreen logs starting with `[TabSense Offscreen]`

### Priority 2: Diagnose Why Offscreen Not Loading
**Possible causes to investigate:**
1. **Module imports failing** - ES6 imports might not work in offscreen context
   - Check if `import` statements work at all in offscreen
   - May need to use different module loading strategy

2. **HTML not loading** - Offscreen HTML might not be accessible
   - Verify `offscreen.html` is properly copied to dist
   - Check if HTML file path is correct

3. **Script path issue** - `offscreen.js` might not be in correct location
   - Currently loading as `<script type="module" src="offscreen.js">`
   - May need absolute path or different loading method

4. **Context issue** - Offscreen document might have different API access
   - ES6 modules might not be supported
   - May need UMD or IIFE format instead

### Priority 3: Alternative Solutions
If offscreen continues to fail, consider:

1. **Incorporate heavy modules directly into service worker** - This might push it over 60KB again
2. **Use content scripts for processing** - Move heavy work to page context
3. **Split functionality** - Load different modules on-demand only when needed
4. **Research successful implementations** - Look at how large Chrome extensions (with 300KB+ service workers) handle this

## Quick Start Commands
```bash
# Build the extension
npm run build

# Check what was built
ls dist/
ls dist/offscreen.html
ls dist/offscreen.js

# Load extension in Chrome and check console for:
# - Service worker logs
# - Any offscreen document logs
# - Errors
```

## Key Files to Review
1. `tabsense/src/background/service-worker.js` - Lines 195-243 (createOffscreenDocument)
2. `tabsense/src/background/offscreen.js` - Lines 6-135 (message listeners)
3. `tabsense/src/background/offscreen.html` - Script loading
4. `tabsense/vite.config.js` - Build configuration
5. `tabsense/OFFSCREEN_DEBUG_ATTEMPTS.md` - All debug history

## Expected Behavior When Working
1. Service worker starts, creates offscreen document
2. **NEW**: Should see "[TabSense Offscreen] ═══ Offscreen document loaded ═══"
3. **NEW**: Should see "[TabSense Offscreen] ✅ Setting up message listener..."
4. **NEW**: Ping test should succeed with "Offscreen document responded to ping"
5. When processing tab, offscreen should generate adaptive summary

## Current Workaround
Extension works with extractive summarization fallback - not ideal but functional. Users get basic summaries but not AI-powered ones.

## Git Status
- All changes committed to `main` branch
- Latest commit: `a823420` - "Fix offscreen document implementation with diagnostics and error handling"

