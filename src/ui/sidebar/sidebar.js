// TabSense Sidebar Script - Main UI Logic

/**
 * Send message to service worker
 * @param {Object} message - Message to send
 * @returns {Promise} Response from service worker
 */
async function sendMessageToServiceWorker(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

/**
 * Update consolidated summary
 */
async function updateConsolidatedSummary() {
    try {
        const response = await sendMessageToServiceWorker({
            action: 'GET_MULTI_TAB_COLLECTION'
        });

        if (response.success) {
            const collection = response.data;
            const summaryElement = document.getElementById('consolidatedText');
            
            if (collection.tabCount > 0) {
                const totalContent = collection.tabs.reduce((total, tab) => total + (tab.content?.length || 0), 0);
                summaryElement.innerHTML = `
                    <div class="text-sm text-gray-600">
                        <p><strong>${collection.tabCount} tabs processed</strong></p>
                        <p>Total content: ${totalContent.toLocaleString()} characters</p>
                        <p>Last updated: ${new Date(collection.lastUpdated).toLocaleString()}</p>
                        <p class="mt-2 text-xs text-gray-500">Multi-tab summarization will be available in Milestone 3</p>
                    </div>
                `;
            } else {
                summaryElement.innerHTML = '<p class="text-sm text-gray-500">No tabs processed yet. Visit some websites to build your research collection.</p>';
            }
        }
    } catch (error) {
        console.error('Failed to update consolidated summary:', error);
        document.getElementById('consolidatedText').innerHTML = '<p class="text-sm text-red-500">Error loading summary</p>';
    }
}

/**
 * Update tab summaries list
 */
async function updateTabSummaries() {
    try {
        const response = await sendMessageToServiceWorker({
            action: 'GET_MULTI_TAB_COLLECTION'
        });

        if (response.success) {
            const collection = response.data;
            const tabsListElement = document.getElementById('tabsList');
            
            if (collection.tabCount > 0) {
                tabsListElement.innerHTML = collection.tabs.map(tab => `
                    <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
                        <h3 class="font-medium text-gray-800 text-sm">${tab.title}</h3>
                        <p class="text-xs text-gray-500 mt-1">${tab.url}</p>
                        <p class="text-xs text-gray-600 mt-2">${tab.content?.length || 0} characters</p>
                        <p class="text-xs text-gray-500 mt-1">${new Date(tab.storedAt).toLocaleString()}</p>
                    </div>
                `).join('');
            } else {
                tabsListElement.innerHTML = '<p class="text-sm text-gray-500">No tabs processed yet.</p>';
            }
        }
    } catch (error) {
        console.error('Failed to update tab summaries:', error);
        document.getElementById('tabsList').innerHTML = '<p class="text-sm text-red-500">Error loading tab summaries</p>';
    }
}

/**
 * Handle ask question functionality
 */
async function handleAskQuestion() {
    const questionInput = document.getElementById('questionInput');
    const askBtn = document.getElementById('askBtn');
    const answerArea = document.getElementById('answerArea');
    
    const question = questionInput.value.trim();
    if (!question) {
        alert('Please enter a question');
        return;
    }

    // Disable button and show loading
    askBtn.disabled = true;
    askBtn.textContent = 'Asking...';
    answerArea.classList.remove('hidden');
    answerArea.innerHTML = '<p class="text-sm text-gray-600">Processing your question...</p>';

    try {
        // For now, show a placeholder response
        // In Milestone 3, this will use the AI adapter
        const response = await sendMessageToServiceWorker({
            action: 'ANSWER_QUESTION',
            payload: { question }
        });

        if (response.success) {
            answerArea.innerHTML = `
                <div class="text-sm text-gray-700">
                    <p><strong>Question:</strong> ${question}</p>
                    <p class="mt-2"><strong>Answer:</strong></p>
                    <p class="mt-1">${response.data.message || 'Q&A functionality will be implemented in Milestone 3'}</p>
                </div>
            `;
        } else {
            answerArea.innerHTML = `<p class="text-sm text-red-500">Error: ${response.error}</p>`;
        }
    } catch (error) {
        answerArea.innerHTML = `<p class="text-sm text-red-500">Error: ${error.message}</p>`;
    } finally {
        // Re-enable button
        askBtn.disabled = false;
        askBtn.textContent = 'Ask';
    }
}

/**
 * Initialize the sidebar
 */
async function initializeSidebar() {
    try {
        // Update status
        const statusElement = document.getElementById('status');
        statusElement.textContent = 'Ready';
        statusElement.className = 'px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full';

        // Load initial data
        await updateConsolidatedSummary();
        await updateTabSummaries();

        // Set up event listeners
        document.getElementById('askBtn').addEventListener('click', handleAskQuestion);
        
        // Allow Enter key to submit question
        document.getElementById('questionInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAskQuestion();
            }
        });

        // Refresh data every 30 seconds
        setInterval(async () => {
            await updateConsolidatedSummary();
            await updateTabSummaries();
        }, 30000);

        console.log('TabSense sidebar initialized successfully');
    } catch (error) {
        console.error('Failed to initialize sidebar:', error);
        document.getElementById('status').textContent = 'Error';
        document.getElementById('status').className = 'px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidebar);
