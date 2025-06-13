// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Web Highlighter & Notes extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getAllHighlights') {
        // Handle getting all highlights
        chrome.storage.local.get(null, (data) => {
            const highlights = Object.entries(data)
                .filter(([key]) => key.startsWith('highlights_'))
                .flatMap(([_, highlights]) => highlights)
                .sort((a, b) => b.timestamp - a.timestamp);
            sendResponse({ highlights });
        });
        return true; // Required for async response
    }
}); 