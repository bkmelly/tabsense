// TabSense Popup Script - Test Functions

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

async function testPing() {
    const resultDiv = document.getElementById('testResults');
    try {
        resultDiv.innerHTML = '<div class="test-result">Sending ping...</div>';
        
        const response = await sendMessageToServiceWorker({ action: 'PING' });
        
        resultDiv.innerHTML = `
            <div class="test-result">
                <strong>✅ Ping Test Passed:</strong><br>
                Pong: ${response.data.pong}<br>
                Timestamp: ${new Date(response.data.timestamp).toLocaleString()}
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<div class="test-error">❌ Ping Test Failed: ${error.message}</div>`;
    }
}

async function testStatus() {
    const resultDiv = document.getElementById('testResults');
    try {
        resultDiv.innerHTML = '<div class="test-result">Getting status...</div>';
        
        const response = await sendMessageToServiceWorker({ action: 'GET_STATUS' });
        
        resultDiv.innerHTML = `
            <div class="test-result">
                <strong>✅ Status Test Passed:</strong><br>
                Initialized: ${response.data.initialized}<br>
                Timestamp: ${new Date(response.data.timestamp).toLocaleString()}
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `<div class="test-error">❌ Status Test Failed: ${error.message}</div>`;
    }
}

async function runAllTests() {
    const resultDiv = document.getElementById('testResults');
    resultDiv.innerHTML = '<div class="test-result">Running all tests...</div>';
    
    const tests = [
        { name: 'Ping', fn: testPing },
        { name: 'Status', fn: testStatus }
    ];
    
    const results = [];
    for (const test of tests) {
        try {
            await test.fn();
            results.push({ name: test.name, status: 'PASS' });
        } catch (error) {
            results.push({ name: test.name, status: 'FAIL', error: error.message });
        }
    }
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const total = results.length;
    
    resultDiv.innerHTML = `
        <div class="test-result">
            <strong>🎯 Test Results:</strong><br>
            Passed: ${passed}/${total}<br>
            Success Rate: ${Math.round((passed / total) * 100)}%<br><br>
            <strong>Details:</strong><br>
            ${results.map(r => `${r.status === 'PASS' ? '✅' : '❌'} ${r.name}`).join('<br>')}
        </div>
    `;
    
    if (passed === total) {
        resultDiv.innerHTML += `
            <div class="test-result">
                <strong>🎉 All Tests Passed!</strong><br>
                Service worker is working correctly.
            </div>
        `;
    }
}

function openFullTest() {
    chrome.tabs.create({ url: chrome.runtime.getURL('../tests/milestone1-test-fixed.html') });
}

// Add event listeners when the popup loads
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('testPingBtn').addEventListener('click', testPing);
    document.getElementById('testStatusBtn').addEventListener('click', testStatus);
    document.getElementById('runAllTestsBtn').addEventListener('click', runAllTests);
    document.getElementById('openFullTestBtn').addEventListener('click', openFullTest);
});
