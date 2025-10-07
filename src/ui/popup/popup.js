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
    container.innerHTML = '<div class="loading-tabs">🔄 Extracting and summarizing tabs...</div>';
    
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
        
        // Generate summaries for ALL tabs but show tab list with infinite scroll (3 at a time)
        const allTabs = filteredTabs; // Process all filtered tabs
        
        console.log(`Processing ${allTabs.length} tabs, will show tab list with infinite scroll (3 at a time)`);
        
        // Update the info div with infinite scroll info
        infoDiv.innerHTML = `
          📊 Found ${allTabs.length} filtered tabs (${tabs.length} total)<br>
          <small>🔄 Scroll down to load more tabs (3 at a time)</small>
        `;
        
        // Process ALL tabs to generate summaries
        const allSummaries = [];
        
        for (const tab of allTabs) {
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
                  length: document.getElementById('summaryLength').value || 'short',
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
            allSummaries.push(summaryData);
            
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
        
        console.log('All tabs processed, implementing infinite scroll...');
        
        // Virtual scrolling implementation - always show 3 tabs, scroll to see more
        let currentIndex = 0;
        const visibleTabs = 3;
        const tabHeight = 60; // Approximate height per tab
        
        // Function to create tab list item
        const createTabListItem = (summaryData, index) => {
          const tab = summaryData.tab;
          const summary = summaryData.summary;
          
          const tabListItem = document.createElement('div');
          tabListItem.className = 'tab-list-item';
          tabListItem.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px;
            margin: 4px 0;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #f9f9f9;
            cursor: pointer;
            transition: background-color 0.2s;
            height: ${tabHeight - 8}px;
            position: relative;
          `;
          
          // Get favicon with fallback
          let faviconUrl = '';
          try {
            const url = new URL(tab.url);
            faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
          } catch (e) {
            faviconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23666"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
          }
          
          tabListItem.innerHTML = `
            <img src="${faviconUrl}" style="width: 16px; height: 16px; margin-right: 8px; border-radius: 2px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: bold; font-size: 12px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(tab.title || 'Untitled').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</div>
              <div style="font-size: 10px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tab.url}</div>
            </div>
            <div style="font-size: 10px; color: #999; margin-left: 8px;">📄 ${index + 1}</div>
          `;
          
          // Add error handler for favicon
          const faviconImg = tabListItem.querySelector('img');
          faviconImg.addEventListener('error', () => {
            faviconImg.style.display = 'none';
          });
          
          // Click handler to show summary in modal
          tabListItem.addEventListener('click', () => {
            showSummary(summaryData);
          });
          
          // Hover effect
          tabListItem.addEventListener('mouseenter', () => {
            tabListItem.style.backgroundColor = '#e9ecef';
          });
          tabListItem.addEventListener('mouseleave', () => {
            tabListItem.style.backgroundColor = '#f9f9f9';
          });
          
          return tabListItem;
        };
        
        // Function to render visible tabs (always exactly 3)
        let renderVisibleTabs = () => {
          // Clear all existing tabs
          const existingTabs = container.querySelectorAll('.tab-list-item');
          existingTabs.forEach(tab => tab.remove());
          
          // Render exactly 3 tabs starting from currentIndex
          for (let i = 0; i < visibleTabs; i++) {
            const tabIndex = currentIndex + i;
            if (tabIndex < allSummaries.length) {
              const tabListItem = createTabListItem(allSummaries[tabIndex], tabIndex);
              container.appendChild(tabListItem);
            }
          }
          
          console.log(`Rendered tabs ${currentIndex + 1}-${Math.min(currentIndex + visibleTabs, allSummaries.length)} of ${allSummaries.length}`);
        };
        
        // Create a separate scrollable container for tab list
        const tabListContainer = document.createElement('div');
        tabListContainer.className = 'tab-list-container';
        tabListContainer.style.cssText = `
          max-height: 250px;
          overflow-y: auto;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          position: relative;
          margin: 8px 0;
        `;
        
        // Create virtual scroll spacer (makes the container scrollable)
        const scrollSpacer = document.createElement('div');
        scrollSpacer.className = 'scroll-spacer';
        scrollSpacer.style.cssText = `
          height: ${allSummaries.length * tabHeight}px;
          position: relative;
        `;
        tabListContainer.appendChild(scrollSpacer);
        
        // Create wrapper for tab items (positioned absolutely)
        const tabItemsWrapper = document.createElement('div');
        tabItemsWrapper.className = 'tab-items-wrapper';
        tabItemsWrapper.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
        `;
        scrollSpacer.appendChild(tabItemsWrapper);
        
        // Update renderVisibleTabs to use tabItemsWrapper with absolute positioning
        const originalRenderVisibleTabs = renderVisibleTabs;
        renderVisibleTabs = () => {
          // Clear all existing tabs from wrapper
          const existingTabs = tabItemsWrapper.querySelectorAll('.tab-list-item');
          existingTabs.forEach(tab => tab.remove());
          
          // Render exactly 3 tabs starting from currentIndex
          for (let i = 0; i < visibleTabs; i++) {
            const tabIndex = currentIndex + i;
            if (tabIndex < allSummaries.length) {
              const tabListItem = createTabListItem(allSummaries[tabIndex], tabIndex);
              tabItemsWrapper.appendChild(tabListItem);
            }
          }
          
          // Position the wrapper based on current scroll index
          tabItemsWrapper.style.top = `${currentIndex * tabHeight}px`;
          
          console.log(`Rendered tabs ${currentIndex + 1}-${Math.min(currentIndex + visibleTabs, allSummaries.length)} of ${allSummaries.length}`);
        };
        
        // Render initial 3 tabs
        renderVisibleTabs();
        
        // Add tabListContainer to main container
        container.appendChild(tabListContainer);
        
        // Add scroll-based virtual scrolling
        let isScrolling = false;
        
        tabListContainer.addEventListener('scroll', () => {
          if (isScrolling) return;
          
          const scrollTop = tabListContainer.scrollTop;
          const containerHeight = tabListContainer.clientHeight;
          const scrollHeight = tabListContainer.scrollHeight;
          
          // Calculate which tabs should be visible based on scroll position
          const newIndex = Math.floor(scrollTop / tabHeight);
          
          if (newIndex !== currentIndex && newIndex >= 0 && newIndex + visibleTabs <= allSummaries.length) {
            currentIndex = newIndex;
            renderVisibleTabs();
            console.log(`Scrolled to tabs ${currentIndex + 1}-${Math.min(currentIndex + visibleTabs, allSummaries.length)}`);
          }
        });
        
        // Add scroll indicators
        const scrollIndicator = document.createElement('div');
        scrollIndicator.style.cssText = `
          position: sticky;
          top: 0;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 4px 8px;
          font-size: 10px;
          text-align: center;
          z-index: 10;
          border-radius: 0 0 4px 4px;
        `;
        
        const updateScrollIndicator = () => {
          const start = currentIndex + 1;
          const end = Math.min(currentIndex + visibleTabs, allSummaries.length);
          scrollIndicator.textContent = `📋 ${start}-${end} of ${allSummaries.length}`;
        };
        
        updateScrollIndicator();
        tabListContainer.appendChild(scrollIndicator);
        
        // Enhance renderVisibleTabs to update indicator
        const enhancedRenderVisibleTabs = renderVisibleTabs;
        renderVisibleTabs = () => {
          enhancedRenderVisibleTabs();
          updateScrollIndicator();
        };
        
        // Function to show summary in modal (MAGIC NUMBER = 1)
        const showSummary = (summaryData) => {
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
        };
        
        // Show success message
        try {
          const successMsg = document.createElement('div');
          successMsg.className = 'result success';
          successMsg.style.cssText = 'background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 6px; margin: 8px 0;';
          successMsg.textContent = `✅ Generated ${allSummaries.length} summaries, scroll to browse tabs (3 at a time)`;
          container.appendChild(successMsg);
          console.log('Success message added');
        } catch (successError) {
          console.error('Error adding success message:', successError);
        }
        
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