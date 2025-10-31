# Google OAuth Setup Guide - Troubleshooting

## Common Issue: `redirect_uri_mismatch` Error

### Error Message
```
Access blocked: tabsense's request is invalid
Error 400: redirect_uri_mismatch
```

### What Causes This?

The `redirect_uri_mismatch` error occurs when the redirect URI configured in Google Cloud Console doesn't exactly match what Chrome is sending during authentication.

### The Redirect URI Format

Chrome extensions automatically generate a redirect URI using:
```
https://<extension-id>.chromiumapp.org/
```

Where `<extension-id>` is a 32-character hexadecimal string that uniquely identifies your extension.

**Important Notes:**
- The extension ID changes when you load an unpacked extension in development
- The extension ID is stable once published to Chrome Web Store
- The redirect URI **must match exactly** including the trailing slash `/`

### How to Fix

#### Step 1: Find Your Extension ID

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right)
3. Find your TabSense extension
4. Copy the extension ID (shown below the extension name)
5. Or use the extension settings UI - the redirect URI is shown with a copy button

#### Step 2: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**

#### Step 3: Enable Required APIs

Before creating OAuth credentials, enable these APIs:
- **Google Sheets API** (required for Sheets export)
- **Google Docs API** (required for Docs export)

To enable:
1. Go to **APIs & Services** → **Library**
2. Search for "Google Sheets API" and click **Enable**
3. Search for "Google Docs API" and click **Enable**

#### Step 4: Create OAuth 2.0 Client ID

1. In **Credentials**, click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
2. If prompted, configure OAuth consent screen first:
   - User Type: **External** (for personal/testing) or **Internal** (for Google Workspace)
   - App name: TabSense (or any name)
   - Support email: Your email
   - Click **Save and Continue** through the steps
3. Back in Credentials, create OAuth 2.0 Client ID:
   - **Application type**: **Web application** (NOT Chrome Extension)
   - **Name**: TabSense (or any name)

#### Step 5: Add Redirect URI

1. In the **Authorized redirect URIs** section, click **+ ADD URI**
2. Copy the exact redirect URI from TabSense settings:
   - Go to TabSense → Settings → API Keys → Google Sheets/Docs
   - Copy the full redirect URI (shown with a copy button)
   - Format: `https://<your-32-char-extension-id>.chromiumapp.org/`
3. Paste it into Google Cloud Console
4. **CRITICAL**: The URI must match exactly, including:
   - The `https://` prefix
   - The full extension ID (32 lowercase hex characters)
   - The `.chromiumapp.org` domain
   - The trailing slash `/` at the end

#### Step 6: Copy Client ID

1. After saving, you'll see your OAuth 2.0 Client ID
2. Copy the **Client ID** (NOT the Client Secret - you don't need it)
3. Paste it into TabSense settings:
   - Settings → API Keys → Google Sheets/Docs
   - Paste in the "Google Client ID" field

#### Step 7: Test Authentication

1. In TabSense settings, click **Authenticate with Google**
2. You should be redirected to Google sign-in
3. After signing in and granting permissions, you'll be redirected back
4. If successful, you'll see a success message

### Common Mistakes

#### ❌ Wrong Application Type
- **Don't select**: "Chrome Extension" application type
- **Do select**: "Web application" application type

#### ❌ Missing Trailing Slash
- **Wrong**: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org`
- **Correct**: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

#### ❌ Case Sensitivity
- Extension IDs are lowercase hex - make sure there are no uppercase letters

#### ❌ Wrong Extension ID
- If you reload the extension, the extension ID might change (in development)
- Always check the current extension ID before configuring

#### ❌ APIs Not Enabled
- Make sure both Google Sheets API and Google Docs API are enabled
- Go to APIs & Services → Library to enable them

### Development vs Production

#### Development (Unpacked Extension)
- Extension ID changes when you reload the extension
- You'll need to update the redirect URI in Google Cloud Console each time the ID changes
- The extension ID is shown in `chrome://extensions`

#### Production (Published Extension)
- Extension ID is permanent once published
- Set the redirect URI once in Google Cloud Console
- No need to update it again

### Debugging Tips

#### Check Console Logs
When authentication fails, check the browser console. You'll see:
```
[TabSense] Google OAuth - Using redirect URI: https://...
[TabSense] Expected redirect URI: https://...
[TabSense] Make sure this EXACT URI is added in Google Cloud Console
```

#### Verify Redirect URI
1. In TabSense settings, the redirect URI is displayed with a copy button
2. In Google Cloud Console, go to your OAuth Client ID
3. Check the "Authorized redirect URIs" list
4. They must match character-for-character

#### Test with Different Account
Sometimes OAuth consent screen restrictions can cause issues:
- Make sure you're using a test user account (if using external app type)
- Or use an account within your Google Workspace (if using internal app type)

### Quick Checklist

Before attempting authentication, verify:
- [ ] Google Sheets API is enabled
- [ ] Google Docs API is enabled
- [ ] OAuth 2.0 Client ID created (Web application type)
- [ ] Redirect URI added exactly as shown in TabSense settings
- [ ] Redirect URI includes trailing slash `/`
- [ ] Client ID copied (not Client Secret)
- [ ] Client ID pasted into TabSense settings

### Still Having Issues?

1. **Check the exact error message** - it often contains helpful details
2. **Verify APIs are enabled** - go to APIs & Services → Library
3. **Check OAuth consent screen** - ensure it's configured correctly
4. **Try a different Google account** - to rule out account-specific issues
5. **Clear browser cache** - sometimes cached credentials cause issues
6. **Check extension ID hasn't changed** - in development, it changes on reload

### Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Identity API Documentation](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Google Cloud Console](https://console.cloud.google.com/)

### Service Worker Logs

The service worker provides detailed logging. Check the console for:
- The redirect URI being used
- Client ID (first 20 chars)
- Any error messages with exact redirect URI needed

Example log output:
```
[TabSense] Google OAuth - Using redirect URI: https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
[TabSense] Google OAuth - Client ID: 12345678901234567890...
```

If you see a redirect_uri_mismatch error, the log will show the exact URI that needs to be added.

---

**Last Updated**: Current session  
**Extension Version**: 0.1.1

