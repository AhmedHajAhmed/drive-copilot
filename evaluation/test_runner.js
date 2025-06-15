// Content script to handle communication between test runner and extension
console.log('Test runner content script loaded');

let isExtensionContextValid = false;
let initializationAttempted = false;

// Function to check if extension context is still valid
function checkExtensionContext() {
    if (!initializationAttempted) {
        try {
            // Try to access chrome.runtime.id - if it throws, context is invalid
            chrome.runtime.id;
            isExtensionContextValid = true;
            initializationAttempted = true;
            return true;
        } catch (error) {
            console.log('Extension context invalidated during initialization');
            isExtensionContextValid = false;
            initializationAttempted = true;
            return false;
        }
    }
    return isExtensionContextValid;
}

// Function to notify test runner about context invalidation
function notifyContextInvalidated() {
    window.postMessage({
        type: 'CONTEXT_INVALIDATED',
        message: 'Extension context invalidated. Please reload the page.'
    }, '*');
}

// Function to safely access chrome.runtime
function safeChromeRuntimeAccess(callback) {
    try {
        if (!checkExtensionContext()) {
            notifyContextInvalidated();
            return;
        }
        callback();
    } catch (error) {
        console.error('Error accessing chrome.runtime:', error);
        notifyContextInvalidated();
    }
}

// Listen for messages from the test runner
window.addEventListener('message', async (event) => {
    // Only accept messages from our window
    if (event.source !== window) return;

    console.log('Content script received message:', event.data);

    if (event.data.type === 'TEST_RUNNER_READY') {
        console.log('Test runner is ready, sending extension ID');
        try {
            const extensionId = chrome.runtime.id;
            window.postMessage({ type: 'EXTENSION_ID', extensionId }, '*');
        } catch (error) {
            console.error('Error getting extension ID:', error);
            window.postMessage({ type: 'CONTEXT_INVALIDATED', error: error.message }, '*');
        }
    } else if (event.data.type === 'RUN_TEST') {
        try {
            console.log('Running test:', event.data);
            const { testId, query, context } = event.data;
            
            // Forward the test query to the extension
            console.log('Sending message to extension:', { type: 'SEARCH', query, context });
            const response = await chrome.runtime.sendMessage({
                type: 'SEARCH',
                query: query,
                context: context
            });

            console.log('Received response from extension:', response);

            // Send the response back to the test runner
            window.postMessage({
                type: 'TEST_RESPONSE',
                testId: testId,
                response: response
            }, '*');
        } catch (error) {
            console.error('Error running test:', error);
            window.postMessage({
                type: 'TEST_RESPONSE',
                testId: event.data.testId,
                response: { error: error.message }
            }, '*');
        }
    }
});

// Notify the test runner that the content script is ready
console.log('Content script is ready, sending CONTENT_SCRIPT_READY message');
window.postMessage({ type: 'CONTENT_SCRIPT_READY' }, '*'); 