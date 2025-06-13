// Add console logging for debugging
console.log('Web Highlighter & Notes: Content script loaded');

class Highlighter {
    constructor() {
        this.highlights = new Map();
        this.isSelecting = false;
        this.currentHighlight = null;
        this.isEnabled = true; // Track extension state
        this.init();
    }

    async init() {
        console.log('Web Highlighter & Notes: Initializing highlighter');
        
        // Load initial state from storage
        const { isEnabled = true } = await chrome.storage.local.get('isEnabled');
        this.isEnabled = isEnabled;
        
        // Listen for text selection only if enabled
        if (this.isEnabled) {
            document.addEventListener('mouseup', this.handleSelection.bind(this));
        }
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Web Highlighter & Notes: Received message', request);
            
            if (request.action === 'getHighlights') {
                sendResponse({ 
                    highlights: Array.from(this.highlights.values()),
                    url: window.location.href,
                    title: document.title
                });
                return true; // Required for async response
            } else if (request.action === 'toggleExtension') {
                this.isEnabled = request.isEnabled;
                if (this.isEnabled) {
                    document.addEventListener('mouseup', this.handleSelection.bind(this));
                } else {
                    document.removeEventListener('mouseup', this.handleSelection.bind(this));
                }
                sendResponse({ success: true });
                return true;
            }
        });

        // Load existing highlights for this page
        this.loadExistingHighlights();
    }

    // Helper to get a unique selector path for a DOM node
    getPathTo(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }
        if (!node || node === document.documentElement) {
            return 'html'; // Base case for the root HTML element
        }
        if (node.id !== '') {
            return '#' + node.id;
        }
        if (node === document.body) {
            return 'body';
        }

        const siblings = Array.from(node.parentNode.children);
        let path = '';
        let count = 0;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling.nodeName === node.nodeName) {
                if (sibling === node) {
                    path = node.nodeName.toLowerCase() + ':nth-child(' + (count + 1) + ')' + path;
                    break;
                }
                count++;
            }
        }
        return this.getPathTo(node.parentNode) + ' > ' + path;
    }

    // Helper to get a DOM node from a selector path
    getNodeFromPath(path) {
        if (!path || typeof path !== 'string') {
            console.error('getNodeFromPath received invalid path:', path);
            return null;
        }
        let node = document;
        const parts = path.split(' > ');
        for (const part of parts) {
            if (part === 'html') {
                node = document.documentElement;
                continue;
            }
            if (part === 'body') {
                node = document.body;
                continue;
            }
            if (part.startsWith('#')) {
                node = document.getElementById(part.substring(1));
                if (!node) return null; // Node not found
                break;
            }
            const tagName = part.split(':')[0];
            const indexMatch = part.match(/\((\d+)\)/);
            const index = indexMatch ? parseInt(indexMatch[1], 10) - 1 : 0; // Default to first child if no index
            
            const children = Array.from(node.children).filter(child => child.tagName.toLowerCase() === tagName);
            node = children[index];
            if (!node) return null; // Node not found
        }
        return node;
    }

    // Improved method to wrap text nodes within a range without extracting content
    wrapRangeWithHighlight(range, highlightId) {
        // Create a span element for the highlight
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'web-highlighter';
        highlightSpan.dataset.id = highlightId;
        highlightSpan.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        highlightSpan.style.display = 'inline';

        // Get all text nodes within the range
        const textNodes = [];
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            if (!node.parentNode.classList?.contains('web-highlighter')) {
                textNodes.push(node);
            }
        }

        // Process each text node
        textNodes.forEach(textNode => {
            const nodeRange = document.createRange();
            nodeRange.selectNode(textNode);

            // Calculate intersection with highlight range
            const start = Math.max(range.startOffset, nodeRange.startOffset);
            const end = Math.min(range.endOffset, nodeRange.endOffset);

            if (start >= end) return;

            // Split text node if needed
            if (start > nodeRange.startOffset) {
                textNode.splitText(start - nodeRange.startOffset);
            }
            if (end < nodeRange.endOffset) {
                textNode.splitText(end - nodeRange.startOffset);
            }

            // Wrap the text node
            const span = highlightSpan.cloneNode(false);
            textNode.parentNode.insertBefore(span, textNode);
            span.appendChild(textNode);
        });
    }

    async loadExistingHighlights() {
        try {
            const key = `highlights_${window.location.href}`;
            const data = await chrome.storage.local.get(key);
            const highlights = data[key] || [];
            
            console.log('Web Highlighter & Notes: Loading existing highlights', highlights);
            
            highlights.forEach(highlightData => {
                try {
                    const startNode = this.getNodeFromPath(highlightData.startContainerPath);
                    const endNode = this.getNodeFromPath(highlightData.endContainerPath);

                    if (!startNode || !endNode) {
                        console.warn('Web Highlighter & Notes: Could not re-apply highlight. Nodes not found. Skipping.', highlightData);
                        return;
                    }

                    const range = document.createRange();
                    range.setStart(startNode, highlightData.startOffset);
                    range.setEnd(endNode, highlightData.endOffset);

                    // Ensure the range is not collapsed and has content before attempting to wrap
                    if (!range.collapsed && range.toString().trim().length > 0) {
                        this.wrapRangeWithHighlight(range.cloneRange(), highlightData.id); // Clone range as extractContents modifies it
                        this.highlights.set(highlightData.id, highlightData); // Add back to map after re-applying
                    } else {
                         console.warn('Web Highlighter & Notes: Skipped re-applying empty or collapsed highlight.', highlightData);
                    }
                } catch (innerError) {
                    console.error('Web Highlighter & Notes: Error re-applying single highlight', highlightData, innerError);
                }
            });
        } catch (error) {
            console.error('Web Highlighter & Notes: Error loading highlights', error);
        }
    }

    handleSelection(event) {
        if (!this.isEnabled) return; // Don't handle selection if extension is disabled
        
        const selection = window.getSelection();
        if (!selection.toString().trim()) return;

        console.log('Web Highlighter & Notes: Text selected', selection.toString());

        try {
            const range = selection.getRangeAt(0);
            const highlightId = Date.now();

            const startPath = this.getPathTo(range.startContainer);
            const endPath = this.getPathTo(range.endContainer);
            
            console.log('Web Highlighter & Notes: Generated paths - Start:', startPath, 'End:', endPath);

            const highlightData = {
                id: highlightId,
                text: selection.toString(),
                note: '',
                url: window.location.href,
                title: document.title,
                timestamp: Date.now(),
                // Store range in a way that can be re-created using paths
                startContainerPath: startPath,
                startOffset: range.startOffset,
                endContainerPath: endPath,
                endOffset: range.endOffset,
            };

            // Apply highlight visually using the new robust function
            this.wrapRangeWithHighlight(range.cloneRange(), highlightId); // Clone range as extractContents modifies it

            this.highlights.set(highlightData.id, highlightData);
            this.saveHighlight(highlightData);
            selection.removeAllRanges();
            console.log('Web Highlighter & Notes: Highlight created', highlightData);
        } catch (error) {
            console.error('Web Highlighter & Notes: Error creating highlight', error);
        }
    }

    async saveHighlight(highlightData) {
        try {
            const key = `highlights_${window.location.href}`;
            const existing = await chrome.storage.local.get(key);
            const highlights = existing[key] || [];
            // Remove existing highlight if it was re-highlighted or modified (optional: for editing notes)
            const filteredHighlights = highlights.filter(h => h.id !== highlightData.id);
            filteredHighlights.push(highlightData);

            await chrome.storage.local.set({ [key]: filteredHighlights });
            console.log('Web Highlighter & Notes: Highlight saved', highlightData);
        } catch (error) {
            console.error('Web Highlighter & Notes: Error saving highlight', error);
        }
    }
}

// Initialize highlighter
try {
    const highlighter = new Highlighter();
    console.log('Web Highlighter & Notes: Highlighter initialized successfully');
} catch (error) {
    console.error('Web Highlighter & Notes: Error initializing highlighter', error);
} 