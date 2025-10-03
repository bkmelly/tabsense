# 🌐 Chrome AI Setup Guide

## Enable Chrome AI APIs

To test the Chrome Translator API for summarization, you need to enable Chrome AI flags:

### 1. Open Chrome Flags
- Go to: `chrome://flags/`
- Search for: `chrome-ai`

### 2. Enable Required Flags
Enable these flags (set to "Enabled"):
- `#chrome-ai-translator`
- `#chrome-ai-summarizer` 
- `#chrome-ai-prompt`
- `#chrome-ai-language-detector`

### 3. Restart Chrome
- Click "Relaunch" button
- Wait for Chrome to restart

### 4. Verify APIs are Available
- Open Developer Tools (F12)
- Go to Console tab
- Type: `typeof Translator`
- Should return: `"object"` (not `"undefined"`)

### 5. Test APIs
- Open the test page: `test-translator-summarization.html`
- Run the "Check Chrome AI APIs" test
- Look for ✅ green checkmarks

## Expected Results

If Chrome AI is properly enabled:
- ✅ Translator: available
- ✅ Summarizer: available (or downloadable)
- ✅ Prompt: available (or downloadable)
- ✅ Language Detector: available

## Troubleshooting

### APIs Show as "unavailable"
- Make sure you're on Chrome 140+ (latest version)
- Check that flags are enabled and Chrome restarted
- Try incognito mode (sometimes helps)

### APIs Show as "downloadable"
- Click "Download" when prompted
- Wait for download to complete
- Try again

### APIs Show as "downloading"
- Wait for download to complete
- Refresh the page

## Alternative Testing

If Chrome AI APIs are not available:
1. Test with external APIs (Claude Haiku, Gemini Pro)
2. Use local fallback summarization
3. Focus on extension architecture and UI

## Next Steps

Once Chrome AI is working:
1. Test summarization via Translator API
2. Test Q&A via Prompt API
3. Verify multi-tab functionality
4. Get external API keys for fallback
