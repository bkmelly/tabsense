// TabSense Popup Script
const SAMPLE_TEXT = "Artificial intelligence has become one of the most transformative technologies of our time, revolutionizing industries from healthcare and finance to transportation and entertainment. Machine learning algorithms can now process vast amounts of data to identify patterns, make predictions, and automate complex decision-making processes. Natural language processing enables computers to understand and generate human language, powering chatbots, translation services, and content creation tools. Computer vision allows machines to interpret and analyze visual information, enabling applications like facial recognition, autonomous vehicles, and medical image analysis. As AI continues to advance, it presents both incredible opportunities and significant challenges, including questions about ethics, privacy, job displacement, and the need for responsible development and deployment of these powerful technologies.";

// Event listeners
document.getElementById('statusBtn').addEventListener('click', checkExtensionStatus);
document.getElementById('refreshTabsBtn').addEventListener('click', refreshTabSummaries);
document.getElementById('qaBtn').addEventListener('click', testQA);
document.getElementById('combinedSummaryBtn').addEventListener('click', generateCombinedSummary);
document.getElementById('debugBtn').addEventListener('click', showDebugInfo);
document.getElementById('saveKeysBtn').addEventListener('click', saveAPIKeys);
document.getElementById('testKeysBtn').addEventListener('click', testAIModels);

// Auto-fill sample question
document.getElementById('questionInput').addEventListener('focus', function() {
  if (!this.value) {
    this.value = 'What are the main applications of AI?';
  }
});

function showResult(elementId, content, isError = false) {
  const element = document.getElementById(elementId);
  element.textContent = content;
  element.className = isError ? 'result error' : 'result success';
  element.classList.remove('hidden');
}

async function checkExtensionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    if (response.success) {
      showResult('statusResult', `✅ Extension Status: Initialized: ${response.data.initialized}`);
    } else {
      showResult('statusResult', `❌ Error: ${response.error}`, true);
    }
  } catch (error) {
    showResult('statusResult', `❌ Error: ${error.message}`, true);
  }
}

async function testSummarization() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ADAPTIVE_SUMMARIZE',
      payload: {
        tabData: {
          title: 'Test Page',
          url: 'https://example.com/test',
          content: SAMPLE_TEXT
        },
        length: document.getElementById('summaryLength')?.value || 'short',
        metadata: {}
      }
    });
    
    // Debug: log the full response
    console.log('Full response:', response);
    console.log('Response data:', response.data);
    console.log('Summary:', response.data?.summary);
    
    if (response.success) {
      const summary = response.data?.summary || 'No summary returned';
      const originalLength = response.data?.originalLength || 'Unknown';
      const summaryLength = response.data?.summaryLength || 'Unknown';
      
      showResult('summarizeResult', `✅ Summary: ${summary}\n\nOriginal: ${originalLength} chars\nSummary: ${summaryLength} chars`);
    } else {
      showResult('summarizeResult', `❌ Error: ${response.error}`, true);
    }
  } catch (error) {
    showResult('summarizeResult', `❌ Error: ${error.message}`, true);
  }
}

async function testQA() {
  const question = document.getElementById('questionInput').value.trim();
  if (!question) {
    alert('Please enter a question');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ANSWER_QUESTION',
      payload: { question: question, context: [{ title: 'AI Overview', summary: SAMPLE_TEXT }] }
    });
    if (response.success) {
      showResult('qaResult', `✅ Answer: ${response.data.answer}`);
    } else {
      showResult('qaResult', `❌ Error: ${response.error}`, true);
    }
  } catch (error) {
    showResult('qaResult', `❌ Error: ${error.message}`, true);
  }
}

async function refreshTabSummaries() {
  try {
    const container = document.getElementById('tabsContainer');
    console.log('Container found:', container);
    console.log('Container tagName:', container.tagName);
    console.log('Container className:', container.className);
    console.log('Container id:', container.id);
    
    // Don't clear existing summaries - just add loading indicator for new tabs
    const existingSummaries = container.querySelectorAll('.tab-list-item');
    if (existingSummaries.length > 0) {
      // Add loading indicator above existing summaries
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-new-tabs';
      loadingDiv.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 8px; margin: 5px; border-radius: 4px; font-size: 12px;';
      loadingDiv.textContent = '🔄 Checking for new tabs...';
      container.insertBefore(loadingDiv, container.firstChild);
    } else {
      // No existing summaries, show full loading
      container.innerHTML = '<div class="loading-tabs">🔄 Checking for new tabs...</div>';
    }
    
    // Test service worker connection first
    console.log('Testing service worker connection...');
    
    try {
      // Add timeout to PING test
      const pingPromise = chrome.runtime.sendMessage({ action: 'PING' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PING timeout after 5 seconds')), 5000)
      );
      
      const pingResponse = await Promise.race([pingPromise, timeoutPromise]);
      console.log('Ping response:', pingResponse);
      
      if (!pingResponse) {
        throw new Error('Service worker not responding to PING');
      }
      
      if (!pingResponse.pong) {
        throw new Error(`Service worker not initialized: ${JSON.stringify(pingResponse)}`);
      }
      
    } catch (error) {
      console.error('PING failed:', error);
      throw new Error(`Service worker connection failed: ${error.message}`);
    }
    
    // First, extract current page data
    console.log('Extracting page data...');
    const extractResponse = await chrome.runtime.sendMessage({ action: 'EXTRACT_PAGE_DATA' });
    console.log('Extract response:', extractResponse);
    
    // Handle extraction result
    if (!extractResponse.success) {
      console.log('Page extraction failed, trying existing collection:', extractResponse.error);
      
      // Check if it's a chrome:// URL issue
      if (extractResponse.error && extractResponse.error.includes('chrome://')) {
        container.innerHTML = `
          <div class="result warning" style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 6px; margin: 8px 0;">
            ⚠️ Cannot extract from Chrome pages. Please navigate to a regular website (like news, Wikipedia, etc.) and try again.
          </div>
        `;
      }
    }
    
    // Always try to get existing collection (whether extraction succeeded or failed)
    const response = await chrome.runtime.sendMessage({ action: 'GET_MULTI_TAB_COLLECTION' });
    
    // Debug logging
    console.log('Multi-tab collection response:', response);
    console.log('Response data:', response?.data);
    console.log('Response.data keys:', response?.data ? Object.keys(response.data) : 'No data');
    console.log('Tabs array:', response?.data?.tabs);
      
      // Handle nested response structure
      const actualData = response.data.data || response.data;
      
      if (response.success && actualData.tabs) {
        const tabs = actualData.tabs;
        container.innerHTML = '';
        
        // Add info about tab filtering (will be updated after filtering)
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'background: #e3f2fd; color: #1565c0; padding: 8px; margin: 5px; border: 1px solid #90caf9; border-radius: 4px; font-size: 12px;';
        infoDiv.textContent = '📊 Processing tabs...';
        container.appendChild(infoDiv);
        console.log('Tab info placeholder added');
        
        // Debug the container itself
        console.log('Container offsetHeight:', container.offsetHeight);
        console.log('Container clientHeight:', container.clientHeight);
        console.log('Container scrollHeight:', container.scrollHeight);
        console.log('Container computed style:', window.getComputedStyle(container).display);
        console.log('Container computed height:', window.getComputedStyle(container).height);
        console.log('Container computed maxHeight:', window.getComputedStyle(container).maxHeight);
        
        // Debug parent elements
        console.log('Container parent:', container.parentElement);
        console.log('Container parent offsetHeight:', container.parentElement?.offsetHeight);
        console.log('Container parent computed style:', container.parentElement ? window.getComputedStyle(container.parentElement).display : 'no parent');
        
        // Force parent to not constrain height
        if (container.parentElement) {
          container.parentElement.style.height = 'auto';
          container.parentElement.style.maxHeight = 'none';
          container.parentElement.style.overflow = 'visible';
          console.log('Removed parent height constraints');
        }
        
        // Force container to be scrollable with no height limit
        container.style.height = 'auto';
        container.style.minHeight = '400px';
        container.style.maxHeight = 'none';
        container.style.overflow = 'visible';
        container.style.overflowY = 'auto';
        console.log('Made container auto-height with scroll');
        
        // Force browser reflow to fix rendering
        container.style.display = 'none';
        container.offsetHeight; // Trigger reflow
        container.style.display = 'block';
        console.log('Forced browser reflow');
        
        // Smart tab filtering and limiting
        // Filter out problematic tabs and limit to prevent rendering issues
        const filteredTabs = tabs.filter(tab => {
          // Skip tabs with insufficient content
          if (!tab.content || tab.content.length < 100) return false;
          
          // Skip Chrome internal pages
          const skipPatterns = ['chrome://', 'chrome-extension://', 'edge://', 'about:'];
          if (skipPatterns.some(pattern => tab.url.includes(pattern))) return false;
          
          return true;
        });
        
        // Get existing tab URLs to avoid duplicates
        const existingTabUrls = new Set();
        const existingTabElements = container.querySelectorAll('.tab-list-item');
        existingTabElements.forEach(element => {
          const urlElement = element.querySelector('div[style*="font-size: 10px"]');
          if (urlElement) {
            existingTabUrls.add(urlElement.textContent.trim());
          }
        });
        
        // Check which tabs already have cached summaries (more reliable than DOM elements)
        const tabsWithCachedSummaries = new Set();
        
        // Get cached summary status for all tabs in one call
        const cacheCheckResponse = await chrome.runtime.sendMessage({
          action: 'CHECK_CACHED_SUMMARIES',
          payload: {
            tabs: filteredTabs.map(tab => ({
              title: tab.title || '',
              url: tab.url || '',
              content: tab.content || ''
            })),
            length: document.getElementById('summaryLength')?.value || 'short'
          }
        });
        
        if (cacheCheckResponse && cacheCheckResponse.success) {
          cacheCheckResponse.data.cachedTabs.forEach(cachedTab => {
            tabsWithCachedSummaries.add(cachedTab.url);
            console.log(`Tab ${cachedTab.title} has cached summary`);
          });
        }
        
        // Filter out tabs that already have summaries (either in DOM or cached)
        const newTabs = filteredTabs.filter(tab => 
          !existingTabUrls.has(tab.url) && !tabsWithCachedSummaries.has(tab.url)
        );
        
        console.log(`Found ${filteredTabs.length} total tabs, ${newTabs.length} new tabs to process`);
        
        // Process only NEW tabs to generate summaries
        console.log(`Processing ${newTabs.length} new tabs`);
        
        // Update the info div with new tabs info
        infoDiv.innerHTML = `
          📊 Found ${newTabs.length} new tabs to process (${filteredTabs.length} total)<br>
          <small>🔄 Processing new tabs only...</small>
        `;
        
        // Process only NEW tabs to generate summaries
        const newSummaries = [];
        
        for (const tab of newTabs) {
          try {
            // Ensure tab has required properties
            if (!tab.title || !tab.url) {
              console.warn('Skipping tab with missing properties:', tab);
              continue;
            }
            
            // Tabs are already filtered, just ensure basic properties exist
            
            // Try summarization with proper error handling
            let summary = 'Failed to summarize';
            
            try {
              console.log('Attempting summarization for:', tab.title);
              
              const summaryResponse = await chrome.runtime.sendMessage({
                action: 'ADAPTIVE_SUMMARIZE',
                payload: {
                  tabData: {
                    title: tab.title || '',
                    url: tab.url || '',
                    content: tab.content || ''
                  },
                  length: document.getElementById('summaryLength')?.value || 'short',
                  metadata: {
                    description: tab.metadata?.description || '',
                    author: tab.metadata?.author || ''
                  }
                }
              });
              
              console.log('Summary response received:', summaryResponse);
              
              if (summaryResponse && summaryResponse.success && summaryResponse.data && summaryResponse.data.summary) {
                summary = summaryResponse.data.summary;
                console.log('Summary extracted successfully, length:', summary.length);
              } else {
                console.warn('Invalid summary response:', summaryResponse);
                summary = 'Summary generation failed';
              }
              
            } catch (summaryError) {
              console.error('Summarization error for', tab.title, ':', summaryError);
              summary = `Error: ${summaryError.message}`;
            }
            
            // Create tab summary element using CSS classes
            const tabDiv = document.createElement('div');
            tabDiv.className = 'tab-summary';
            // Force visibility to debug the issue
            tabDiv.style.display = 'block';
            tabDiv.style.visibility = 'visible';
            tabDiv.style.opacity = '1';
            
            // Safe string handling
            const safeTitle = (tab.title || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const safeSummary = (summary || 'No summary available').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            let domain = 'unknown';
            try {
              if (tab.url) {
                domain = new URL(tab.url).hostname;
              }
            } catch (urlError) {
              domain = 'invalid-url';
            }
            
            let timestamp = 'unknown';
            try {
              if (tab.timestamp) {
                timestamp = new Date(tab.timestamp).toLocaleTimeString();
              }
            } catch (timeError) {
              timestamp = 'invalid-time';
            }
            
            // Simple test content first
            tabDiv.innerHTML = `
              <div style="background: yellow; padding: 10px; border: 2px solid red;">
                <h3 style="color: black; margin: 0;">${safeTitle}</h3>
                <p style="color: black; margin: 5px 0;">${safeSummary}</p>
                <button class="open-tab-btn" data-url="${tab.url}" style="background: blue; color: white; padding: 5px;">Open</button>
              </div>
            `;
            
            // Add event listener for the Open button (CSP-safe)
            const openBtn = tabDiv.querySelector('.open-tab-btn');
            if (openBtn) {
              openBtn.addEventListener('click', () => {
                window.open(tab.url, '_blank');
              });
            }
            
            // Store the summary data
            const summaryData = {
              tab: tab,
              summary: summary
            };
            newSummaries.push(summaryData);
            
            console.log('Summary generated for:', tab.title);
            
          } catch (error) {
            console.error('Error processing tab:', tab, error);
            
            // Create simple error element
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
              border: 1px solid #dc3545;
              margin: 8px;
              padding: 12px;
              background: #f8d7da;
              border-radius: 6px;
              color: #721c24;
            `;
            errorDiv.textContent = `Error processing ${tab.title || 'Unknown'}: ${error.message}`;
            container.appendChild(errorDiv);
          }
        }
        
        console.log('New tabs processed, adding to existing summaries...');
        
        // Add new summaries to existing ones
        if (newSummaries.length > 0) {
          // Get existing summaries from the container
          const existingSummaries = [];
          const existingTabElements = container.querySelectorAll('.tab-list-item');
          existingTabElements.forEach(element => {
            // Extract tab data from existing elements (simplified)
            const titleElement = element.querySelector('div[style*="font-weight: bold"]');
            const urlElement = element.querySelector('div[style*="font-size: 10px"]');
            if (titleElement && urlElement) {
              existingSummaries.push({
                tab: { title: titleElement.textContent, url: urlElement.textContent },
                summary: 'Cached summary' // We don't need the actual summary for display
              });
            }
          });
          
          // Combine existing and new summaries
          const allSummaries = [...existingSummaries, ...newSummaries];
          
          // Use simple tab display
          displaySimpleTabs(allSummaries, container);
        } else {
          // No new tabs, just remove loading indicator
          const loadingDiv = container.querySelector('.loading-new-tabs');
          if (loadingDiv) {
            loadingDiv.remove();
          }
        }
        
        // Show success message
        try {
          const successMsg = document.createElement('div');
          successMsg.className = 'result success';
          successMsg.style.cssText = 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 6px; margin: 8px 0;';
          successMsg.textContent = `✅ Processed ${newSummaries.length} new tabs`;
          container.appendChild(successMsg);
          console.log('Success message added');
        } catch (successError) {
          console.error('Error adding success message:', successError);
        }
        
        // No new tabs to process
        console.log('No new tabs to process');
        
      } else {
        console.log('No tabs in collection, showing appropriate message...');
        
        // No tabs in collection - show appropriate message
        if (!extractResponse.success && extractResponse.error && extractResponse.error.includes('chrome://')) {
          // Warning already shown above, just add additional info
          const infoDiv = document.createElement('div');
          infoDiv.className = 'result info';
          infoDiv.style.cssText = 'background: #e3f2fd; border: 1px solid #90caf9; color: #1565c0; padding: 12px; border-radius: 6px; margin: 8px 0;';
          infoDiv.textContent = 'ℹ️ No previous tab data available. Navigate to a regular webpage to start collecting summaries.';
          container.appendChild(infoDiv);
        } else {
          container.innerHTML = '<div class="result error">❌ No tab data available. Try opening some tabs and refreshing.</div>';
        }
      }
    
  } catch (error) {
    console.error('Error in refreshTabSummaries:', error);
    const container = document.getElementById('tabsContainer');
    container.innerHTML = `<div class="result error">❌ Error: ${error.message}</div>`;
  }
  
  console.log('refreshTabSummaries function completed');
}

function createTabSummaryElement(tab, summary) {
  try {
    console.log('createTabSummaryElement called with:', { tab: tab?.title, summaryLength: summary?.length });
    
    const div = document.createElement('div');
    div.className = 'tab-summary';
    
    // Safe string handling with extra validation
    const safeTitle = (tab?.title || 'Untitled').toString().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const safeSummary = (summary || 'No summary available').toString().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    let domain = 'unknown';
    try {
      if (tab?.url) {
        domain = new URL(tab.url).hostname;
      }
    } catch (urlError) {
      console.warn('Invalid URL for domain extraction:', tab?.url);
      domain = 'invalid-url';
    }
    
    let timestamp = 'unknown';
    try {
      if (tab?.timestamp) {
        timestamp = new Date(tab.timestamp).toLocaleTimeString();
      }
    } catch (timeError) {
      console.warn('Invalid timestamp:', tab?.timestamp);
      timestamp = 'invalid-time';
    }
  
    div.innerHTML = `
      <div class="tab-header">
        <div class="tab-title" title="${safeTitle}">${safeTitle}</div>
        <div class="tab-domain">${domain}</div>
      </div>
      <div class="tab-summary-text">${safeSummary}</div>
      <div class="tab-meta">
        <span>${tab?.content ? tab.content.length : 0} chars</span>
        <span>${timestamp}</span>
      </div>
      <div class="tab-actions">
        <button class="tab-action-btn open-btn">Open</button>
        <button class="tab-action-btn copy-btn">Copy</button>
      </div>
    `;
    
    console.log('HTML set successfully, adding event listeners...');
    
    // Add event listeners safely
    try {
      const openBtn = div.querySelector('.open-btn');
      const copyBtn = div.querySelector('.copy-btn');
      
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          try {
            if (tab?.url) {
              chrome.tabs.create({ url: tab.url });
            }
          } catch (openError) {
            console.error('Error opening tab:', openError);
          }
        });
      }
      
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          try {
            navigator.clipboard.writeText(summary).then(() => {
              copyBtn.textContent = 'Copied!';
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
              }, 2000);
            }).catch(() => {
              copyBtn.textContent = 'Failed';
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
              }, 2000);
            });
          } catch (copyError) {
            console.error('Error copying text:', copyError);
          }
        });
      }
      
      console.log('Event listeners added successfully');
    } catch (listenerError) {
      console.error('Error adding event listeners:', listenerError);
    }
    
    return div;
    
  } catch (error) {
    console.error('Error in createTabSummaryElement:', error);
    
    // Return a very simple fallback element
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.cssText = 'border: 1px solid red; padding: 10px; margin: 5px; background: #ffe6e6;';
    fallbackDiv.textContent = `Error creating element for ${tab?.title || 'Unknown'}: ${error.message}`;
    return fallbackDiv;
  }
}

async function generateCombinedSummary() {
  try {
    showResult('combinedSummaryResult', '🔄 Generating combined summary from all tabs...', false);
    
    const response = await chrome.runtime.sendMessage({ action: 'SUMMARIZE_MULTI_TAB' });
    
    if (response && response.success) {
      const actualData = response.data.data || response.data;
      const summary = actualData.summary || 'No summary generated';
      const tabCount = actualData.tabCount || 'Unknown';
      
      showResult('combinedSummaryResult', `✅ Combined Summary (${tabCount} tabs):\n\n${summary}`);
    } else {
      showResult('combinedSummaryResult', `❌ Error: ${response?.error || 'Failed to generate combined summary'}`, true);
    }
    
  } catch (error) {
    showResult('combinedSummaryResult', `❌ Error: ${error.message}`, true);
  }
}

// Helper functions for tab actions
function openTab(url) {
  chrome.tabs.create({ url: url });
}

function copySummary(summary) {
  navigator.clipboard.writeText(summary).then(() => {
    // Could add a toast notification here
    console.log('Summary copied to clipboard');
  });
}

async function showDebugInfo() {
  try {
    let debugInfo = `Chrome Runtime: ${typeof chrome !== 'undefined' && chrome.runtime ? 'Yes' : 'No'}\n`;
    debugInfo += `Extension ID: ${chrome.runtime ? chrome.runtime.id : 'N/A'}\n`;
    
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    debugInfo += `Extension Response: ${JSON.stringify(response, null, 2)}`;
    
    showResult('debugResult', debugInfo);
  } catch (error) {
    showResult('debugResult', `❌ Debug Error: ${error.message}`, true);
  }
}

// Auto-run status check
// API Key Management Functions
async function saveAPIKeys() {
  try {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const anthropicKey = document.getElementById('anthropicKey').value.trim();
    const googleKey = document.getElementById('googleKey').value.trim();
    
    if (!openaiKey && !anthropicKey && !googleKey) {
      showResult('keysResult', '❌ Please enter at least one API key', true);
      return;
    }
    
    // Save keys to Chrome storage (sync for cross-device)
    const keys = {};
    if (openaiKey) keys.openai_api_key = openaiKey;
    if (anthropicKey) keys.anthropic_api_key = anthropicKey;
    if (googleKey) {
      keys.google_api_key = googleKey;
      keys.gemini_api_key = googleKey; // Also save as gemini_api_key for compatibility
    }
    
    await chrome.storage.sync.set(keys);
    
    showResult('keysResult', '✅ API keys saved successfully! Reload extension to use them.');
    
    // Clear the input fields
    document.getElementById('openaiKey').value = '';
    document.getElementById('anthropicKey').value = '';
    document.getElementById('googleKey').value = '';
    
  } catch (error) {
    showResult('keysResult', `❌ Error saving API keys: ${error.message}`, true);
  }
}

async function testAIModels() {
  try {
    showResult('keysResult', '🔄 Testing AI models...', false);
    
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    
    if (response.success) {
      const status = response.data;
      let result = '🤖 AI Model Status:\n\n';
      
      // Check which models are available
      if (status.credentials) {
        result += '✅ Credential manager ready\n';
      }
      
      // Test summarization with real AI
      const testResponse = await chrome.runtime.sendMessage({
        action: 'ADAPTIVE_SUMMARIZE',
        payload: {
          tabData: {
            title: 'AI Test Page',
            url: 'https://example.com/ai-test',
            content: 'This is a test of the AI summarization capabilities. The system should be able to process this text and provide a meaningful summary.'
          },
          length: 'short',
          metadata: {}
        }
      });
      
      if (testResponse.success) {
        result += `✅ Summarization working: ${testResponse.data.summary.substring(0, 100)}...\n`;
      } else {
        result += `❌ Summarization failed: ${testResponse.error}\n`;
      }
      
      showResult('keysResult', result);
    } else {
      showResult('keysResult', `❌ Error getting status: ${response.error}`, true);
    }
    
  } catch (error) {
    showResult('keysResult', `❌ Error testing AI models: ${error.message}`, true);
  }
}

// Auto-load existing summaries when popup opens
async function loadExistingSummaries() {
  try {
    const container = document.getElementById('tabsContainer');
    container.innerHTML = '<div class="loading-tabs">🔄 Loading existing summaries...</div>';
    
    // Get existing tab collection
    const response = await chrome.runtime.sendMessage({ action: 'GET_MULTI_TAB_COLLECTION' });
    
    if (response.success && response.data?.tabs) {
      const tabs = response.data.tabs;
      
      // Filter tabs with sufficient content
      const filteredTabs = tabs.filter(tab => {
        if (!tab.content || tab.content.length < 100) return false;
        const skipPatterns = ['chrome://', 'chrome-extension://', 'edge://', 'about:'];
        if (skipPatterns.some(pattern => tab.url.includes(pattern))) return false;
        return true;
      });
      
      if (filteredTabs.length > 0) {
        // Load existing summaries from cache
        await loadCachedSummaries(filteredTabs, container);
      } else {
        container.innerHTML = '<div class="result info">ℹ️ No tabs with summaries found. Click "Refresh Summaries" to generate new ones.</div>';
      }
    } else {
      container.innerHTML = '<div class="result info">ℹ️ No existing summaries found. Click "Refresh Summaries" to generate new ones.</div>';
    }
    
  } catch (error) {
    console.error('Error loading existing summaries:', error);
    const container = document.getElementById('tabsContainer');
    container.innerHTML = `<div class="result error">❌ Error loading summaries: ${error.message}</div>`;
  }
}

// Load cached summaries for existing tabs
async function loadCachedSummaries(tabs, container) {
  try {
    const allSummaries = [];
    
    // Process tabs to get cached summaries
    for (const tab of tabs) {
      try {
        // Try to get cached summary - use URL as primary identifier
        const summaryResponse = await chrome.runtime.sendMessage({
          action: 'GET_CACHED_SUMMARY_BY_URL',
          payload: {
            url: tab.url || '',
            title: tab.title || '',
            length: document.getElementById('summaryLength')?.value || 'short'
          }
        });
        
        let summary = 'No summary available';
        if (summaryResponse && summaryResponse.success && summaryResponse.data && summaryResponse.data.summary) {
          summary = summaryResponse.data.summary;
        }
        
        allSummaries.push({
          tab: tab,
          summary: summary
        });
        
      } catch (error) {
        console.warn('Error processing tab:', tab.title, error);
        allSummaries.push({
          tab: tab,
          summary: 'Error loading summary'
        });
      }
    }
    
    // Display the summaries using simple display
    if (allSummaries.length > 0) {
      displaySimpleTabs(allSummaries, container);
    } else {
      container.innerHTML = '<div class="result info">ℹ️ No summaries found. Click "Refresh Summaries" to generate new ones.</div>';
    }
    
  } catch (error) {
    console.error('Error loading cached summaries:', error);
    container.innerHTML = `<div class="result error">❌ Error loading cached summaries: ${error.message}</div>`;
  }
}

// Toggle summary inline
function toggleSummary(summaryData, tabDiv) {
  const summary = summaryData.summary;
  
  // Check if summary is already expanded
  const existingSummary = tabDiv.querySelector('.inline-summary');
  
  if (existingSummary) {
    // Collapse - remove the summary
    existingSummary.remove();
    tabDiv.classList.remove('expanded');
  } else {
    // Expand - add the summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'inline-summary';
    summaryDiv.style.cssText = `
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #007bff;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    summaryDiv.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>Summary:</strong>
      </div>
      <div style="white-space: pre-wrap;">${(summary || 'No summary available').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</div>
      <div style="margin-top: 8px; text-align: right;">
        <button class="copy-summary-btn" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 10px;">Copy</button>
        <button class="open-tab-btn" style="background: #007bff; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 10px; margin-left: 4px;">Open Tab</button>
      </div>
    `;
    
    // Add event listeners for buttons
    const copyBtn = summaryDiv.querySelector('.copy-summary-btn');
    const openBtn = summaryDiv.querySelector('.open-tab-btn');
    
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(summary || '');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 2000);
    });
    
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(summaryData.tab.url, '_blank');
    });
    
    tabDiv.appendChild(summaryDiv);
    tabDiv.classList.add('expanded');
  }
}

// Show summary in modal (kept for compatibility)
async function showSummary(summaryData) {
  // Remove any existing summary modal
  const existingSummary = document.querySelector('.tab-summary-viewer');
  if (existingSummary) {
    existingSummary.remove();
  }
  
  const tab = summaryData.tab;
  const summary = summaryData.summary;
  
  // Create modal overlay
  const summaryViewer = document.createElement('div');
  summaryViewer.className = 'tab-summary-viewer';
  summaryViewer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  const summaryContent = document.createElement('div');
  summaryContent.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 90%;
    max-height: 90%;
    overflow-y: auto;
    position: relative;
  `;
  
  summaryContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; color: #333;">${(tab.title || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</h3>
      <button class="closeBtn" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;">✕</button>
    </div>
    <div style="margin-bottom: 15px;">
      <a href="${tab.url}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">${tab.url}</a>
    </div>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
      <h4 style="margin: 0 0 10px 0; color: #495057;">Summary:</h4>
      <p style="margin: 0; line-height: 1.5; color: #333;">${(summary || 'No summary available').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</p>
    </div>
    <div style="margin-top: 15px; text-align: center;">
      <button class="openTabBtn" style="background: #007bff; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; margin-right: 10px;">Open Tab</button>
      <button class="copySummaryBtn" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer;">Copy Summary</button>
    </div>
  `;
  
  // Add event listeners
  const closeBtn = summaryContent.querySelector('.closeBtn');
  const openTabBtn = summaryContent.querySelector('.openTabBtn');
  const copySummaryBtn = summaryContent.querySelector('.copySummaryBtn');
  
  closeBtn.addEventListener('click', () => {
    summaryViewer.remove();
  });
  
  openTabBtn.addEventListener('click', () => {
    window.open(tab.url, '_blank');
  });
  
  copySummaryBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(summary || '');
    copySummaryBtn.textContent = '✓ Copied!';
    setTimeout(() => {
      copySummaryBtn.textContent = 'Copy Summary';
    }, 2000);
  });
  
  summaryViewer.appendChild(summaryContent);
  document.body.appendChild(summaryViewer);
  
  // Close on background click
  summaryViewer.addEventListener('click', (e) => {
    if (e.target === summaryViewer) {
      summaryViewer.remove();
    }
  });
  
  console.log('Summary modal opened for:', tab.title);
}

// Simple tab display - no virtual scrolling
function displaySimpleTabs(allSummaries, container) {
  // Clear container first
  container.innerHTML = '';
  
  // Add info about loaded summaries
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'background: #e3f2fd; color: #1565c0; padding: 8px; margin: 5px; border: 1px solid #90caf9; border-radius: 4px; font-size: 12px;';
  infoDiv.textContent = `📊 ${allSummaries.length} summaries`;
  container.appendChild(infoDiv);
  
  // Create simple tab list
  allSummaries.forEach((summaryData, index) => {
    const tab = summaryData.tab;
    const summary = summaryData.summary;
    
    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab-list-item';
    tabDiv.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px;
      margin: 4px 0;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #f9f9f9;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    // Get favicon
    let faviconUrl = '';
    try {
      const url = new URL(tab.url);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch (e) {
      faviconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    }
    
    tabDiv.innerHTML = `
      <img src="${faviconUrl}" style="width: 16px; height: 16px; margin-right: 8px; border-radius: 2px;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: bold; font-size: 12px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(tab.title || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</div>
        <div style="font-size: 10px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tab.url}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 10px; color: #999;">📄</span>
        <button class="refresh-tab-btn" style="background: none; border: none; padding: 4px; cursor: pointer; color: #666;" title="Refresh this tab">🔄</button>
      </div>
    `;
    
    // Add error handler for favicon
    const faviconImg = tabDiv.querySelector('img');
    faviconImg.addEventListener('error', () => {
      faviconImg.style.display = 'none';
    });
    
    // Click handler to expand/collapse summary inline
    tabDiv.addEventListener('click', (e) => {
      if (!e.target.classList.contains('refresh-tab-btn')) {
        toggleSummary(summaryData, tabDiv);
      }
    });
    
    // Refresh button handler
    const refreshBtn = tabDiv.querySelector('.refresh-tab-btn');
    refreshBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      refreshBtn.textContent = '⏳';
      refreshBtn.disabled = true;
      
      try {
        // Refresh this specific tab
        const summaryResponse = await chrome.runtime.sendMessage({
          action: 'ADAPTIVE_SUMMARIZE',
          payload: {
            tabData: {
              title: tab.title || '',
              url: tab.url || '',
              content: tab.content || ''
            },
            length: document.getElementById('summaryLength')?.value || 'short',
            metadata: {
              description: tab.metadata?.description || '',
              author: tab.metadata?.author || ''
            }
          }
        });
        
        if (summaryResponse && summaryResponse.success && summaryResponse.data && summaryResponse.data.summary) {
          // Update the summary data
          summaryData.summary = summaryResponse.data.summary;
          console.log('Tab refreshed:', tab.title);
        }
        
      } catch (error) {
        console.error('Error refreshing tab:', error);
      } finally {
        refreshBtn.textContent = '🔄';
        refreshBtn.disabled = false;
      }
    });
    
    // Hover effect
    tabDiv.addEventListener('mouseenter', () => {
      tabDiv.style.backgroundColor = '#e9ecef';
    });
    tabDiv.addEventListener('mouseleave', () => {
      tabDiv.style.backgroundColor = '#f9f9f9';
    });
    
    container.appendChild(tabDiv);
  });
  
  // Add success message
  const successMsg = document.createElement('div');
  successMsg.className = 'result success';
  successMsg.style.cssText = 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 6px; margin: 8px 0;';
  successMsg.textContent = `✅ ${allSummaries.length} summaries loaded`;
  container.appendChild(successMsg);
}

// Display tab summaries (reusable function)
function displayTabSummaries(allSummaries, container) {
  // Clear container
  container.innerHTML = '';
  
  // Add info about loaded summaries
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'background: #e3f2fd; color: #1565c0; padding: 8px; margin: 5px; border: 1px solid #90caf9; border-radius: 4px; font-size: 12px;';
  infoDiv.textContent = `📊 Loaded ${allSummaries.length} summaries`;
  container.appendChild(infoDiv);
  
  // Create simple tab list
  allSummaries.forEach((summaryData, index) => {
    const tab = summaryData.tab;
    const summary = summaryData.summary;
    
    const tabDiv = document.createElement('div');
    tabDiv.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px;
      margin: 4px 0;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #f9f9f9;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    
    // Get favicon
    let faviconUrl = '';
    try {
      const url = new URL(tab.url);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch (e) {
      faviconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    }
    
    tabDiv.innerHTML = `
      <img src="${faviconUrl}" style="width: 16px; height: 16px; margin-right: 8px; border-radius: 2px;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: bold; font-size: 12px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(tab.title || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</div>
        <div style="font-size: 10px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tab.url}</div>
      </div>
      <div style="font-size: 10px; color: #999; margin-left: 8px;">📄 ${index + 1}</div>
    `;
    
    // Click handler to show summary
    tabDiv.addEventListener('click', () => {
      showSummary(summaryData);
    });
    
    // Hover effect
    tabDiv.addEventListener('mouseenter', () => {
      tabDiv.style.backgroundColor = '#e9ecef';
    });
    tabDiv.addEventListener('mouseleave', () => {
      tabDiv.style.backgroundColor = '#f9f9f9';
    });
    
    container.appendChild(tabDiv);
  });
  
  // Add success message
  const successMsg = document.createElement('div');
  successMsg.className = 'result success';
  successMsg.style.cssText = 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 6px; margin: 8px 0;';
  successMsg.textContent = `✅ Loaded ${allSummaries.length} existing summaries`;
  container.appendChild(successMsg);
}

window.addEventListener('load', async () => {
  // Test service worker immediately
  console.log('Popup loaded, testing service worker...');
  
  try {
    const pingResponse = await chrome.runtime.sendMessage({ action: 'PING' });
    console.log('Service worker PING successful:', pingResponse);
    
    // Show service worker status
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'background: #e8f5e8; padding: 8px; margin: 8px; border-radius: 4px; font-size: 12px;';
    statusDiv.textContent = `✅ Service Worker: ${pingResponse.pong ? 'Active' : 'Inactive'}`;
    document.body.insertBefore(statusDiv, document.body.firstChild);
    
    // Auto-load existing summaries
    console.log('Auto-loading existing summaries...');
    await loadExistingSummaries();
    
  } catch (error) {
    console.error('Service worker PING failed:', error);
    
    // Show error status
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'background: #ffe8e8; padding: 8px; margin: 8px; border-radius: 4px; font-size: 12px;';
    statusDiv.textContent = `❌ Service Worker: ${error.message}`;
    document.body.insertBefore(statusDiv, document.body.firstChild);
  }
  
  setTimeout(checkExtensionStatus, 1000);
});