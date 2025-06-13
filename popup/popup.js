class PopupManager {
    constructor() {
        this.currentTab = null;
        this.highlights = []; // Highlights for the current page
        this.allHighlights = []; // All highlights from storage
        this.isEnabled = true; // Track extension state
        this.init();
    }

    async init() {
        console.log('Popup: Initializing PopupManager');
        
        // Get current tab details
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tabs[0];

        // Initialize UI
        this.initializeTabs();
        this.initializeExportButtons();
        this.initializeToggle();
        
        // Load highlights for the current page initially
        await this.loadCurrentPageHighlights();
    }

    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Show corresponding content
                const tabId = button.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                const targetContent = document.getElementById(tabId === 'current' ? 'currentPage' : 'allHighlights');
                targetContent.classList.add('active');

                // Reload highlights if needed
                if (tabId === 'all') {
                    await this.loadAllHighlights();
                } else {
                    await this.loadCurrentPageHighlights();
                }
            });
        });
    }

    initializeExportButtons() {
        document.getElementById('exportPDF').addEventListener('click', () => this.exportHighlights('pdf'));
        document.getElementById('exportMD').addEventListener('click', () => this.exportHighlights('markdown'));
    }

    async initializeToggle() {
        const toggle = document.getElementById('extensionToggle');
        const toggleLabel = document.querySelector('.toggle-label');

        // Load initial state from storage
        const { isEnabled = true } = await chrome.storage.local.get('isEnabled');
        this.isEnabled = isEnabled;
        toggle.checked = isEnabled;
        this.updateToggleLabel(toggleLabel, isEnabled);

        // Add change listener
        toggle.addEventListener('change', async (e) => {
            this.isEnabled = e.target.checked;
            await chrome.storage.local.set({ isEnabled: this.isEnabled });
            this.updateToggleLabel(toggleLabel, this.isEnabled);

            // Notify content script about the state change
            if (this.currentTab && this.currentTab.url.startsWith('http')) {
                try {
                    await chrome.tabs.sendMessage(this.currentTab.id, {
                        action: 'toggleExtension',
                        isEnabled: this.isEnabled
                    });
                } catch (error) {
                    console.error('Failed to notify content script:', error);
                }
            }
        });
    }

    updateToggleLabel(labelElement, isEnabled) {
        labelElement.textContent = isEnabled ? 'Extension Active' : 'Extension Disabled';
        labelElement.style.color = isEnabled ? '#4a90e2' : '#666';
    }

    async loadCurrentPageHighlights() {
        console.log('Popup: Loading current page highlights...');
        const currentHighlightsContainer = document.getElementById('currentHighlights');
        try {
            // Check if the current tab is a valid HTTP/HTTPS page for content script injection
            if (!this.currentTab || !this.currentTab.url || (!this.currentTab.url.startsWith('http://') && !this.currentTab.url.startsWith('https://'))) {
                currentHighlightsContainer.innerHTML = '<p class="no-highlights">Highlights cannot be loaded on this type of page (e.g., Chrome internal pages or new tab pages).</p>';
                console.warn('Popup: Cannot load current page highlights on non-HTTP/HTTPS page:', this.currentTab.url);
                return;
            }

            // Send message to content script to get highlights for the current page
            const response = await chrome.tabs.sendMessage(this.currentTab.id, { action: 'getHighlights' });
            
            if (chrome.runtime.lastError) {
                console.error('Popup: chrome.tabs.sendMessage error', chrome.runtime.lastError.message);
                currentHighlightsContainer.innerHTML = '<p class="no-highlights">Error connecting to content script. Please refresh the page and try again.</p>';
                return;
            }

            this.highlights = response?.highlights || [];
            this.renderHighlights('currentHighlights', this.highlights);
            console.log('Popup: Current page highlights loaded', this.highlights);
        } catch (error) {
            console.error('Popup: Uncaught error loading current page highlights', error);
            currentHighlightsContainer.innerHTML = '<p class="no-highlights">An unexpected error occurred while loading current page highlights.</p>';
        }
    }

    async loadAllHighlights() {
        console.log('Popup: Loading all highlights from storage...');
        const allHighlightsContainer = document.getElementById('allHighlights');
        try {
            // Get all highlights from storage through the background script
            const response = await chrome.runtime.sendMessage({ action: 'getAllHighlights' });
            
            if (chrome.runtime.lastError) {
                console.error('Popup: chrome.runtime.sendMessage error', chrome.runtime.lastError.message);
                allHighlightsContainer.innerHTML = '<p class="no-highlights">Error fetching all highlights from storage.</p>';
                return;
            }

            this.allHighlights = response?.highlights || [];
            this.renderHighlights('allHighlights', this.allHighlights);
            console.log('Popup: All highlights loaded', this.allHighlights);
        } catch (error) {
            console.error('Popup: Uncaught error loading all highlights', error);
            allHighlightsContainer.innerHTML = '<p class="no-highlights">An unexpected error occurred while loading all highlights.</p>';
        }
    }

    renderHighlights(containerId, highlights) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (highlights.length === 0) {
            container.innerHTML = '<p class="no-highlights">No highlights found.</p>';
            return;
        }

        highlights.forEach(highlight => {
            const element = document.createElement('div');
            element.className = 'highlight-item';
            element.innerHTML = `
                <div class="highlight-text">${highlight.text}</div>
                ${highlight.note ? `<div class="highlight-note">${highlight.note}</div>` : ''}
                <div class="highlight-meta">
                    <span class="highlight-source">${highlight.title}</span>
                    <span class="highlight-date">${new Date(highlight.timestamp).toLocaleDateString()}</span>
                </div>
            `;
            container.appendChild(element);
        });
    }

    async exportHighlights(format) {
        console.log(`Popup: Exporting highlights as ${format}`);
        
        // Determine which set of highlights to export based on active tab in popup UI
        const currentTabActive = document.querySelector('.tab-btn[data-tab="current"]').classList.contains('active');
        const highlightsToExport = currentTabActive ? this.highlights : this.allHighlights;

        if (highlightsToExport.length === 0) {
            alert('No highlights to export.');
            return;
        }

        if (format === 'pdf') {
            await this.exportToPDF(highlightsToExport);
        } else {
            await this.exportToMarkdown(highlightsToExport);
        }
    }

    async exportToPDF(highlights) {
        console.log('Popup: Exporting to PDF');
        // Create a new window with formatted content
        const content = this.formatHighlightsForExport(highlights, 'pdf');
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new tab for printing
        await chrome.tabs.create({ url: url });
    }

    async exportToMarkdown(highlights) {
        console.log('Popup: Exporting to Markdown');
        const content = this.formatHighlightsForExport(highlights, 'markdown');
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        // Download the file
        await chrome.downloads.download({
            url: url,
            filename: 'highlights.md',
            saveAs: true
        });
    }

    formatHighlightsForExport(highlights, format) {
        if (format === 'markdown') {
            return highlights.map(h => `
## ${h.title}
> ${h.text}
${h.note ? `\nNote: ${h.note}\n` : ''}
Source: ${h.url}
Date: ${new Date(h.timestamp).toLocaleString()}
---
`).join('\n');
        } else {
            return `
<!DOCTYPE html>
<html>
<head>
    <title>Highlights Export</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .highlight { margin-bottom: 20px; padding: 10px; border-left: 3px solid #4a90e2; }
        .text { font-style: italic; margin-bottom: 10px; }
        .note { color: #666; margin-bottom: 10px; }
        .meta { font-size: 12px; color: #999; }
    </style>
</head>
<body>
    ${highlights.map(h => `
    <div class="highlight">
        <h2>${h.title}</h2>
        <div class="text">${h.text}</div>
        ${h.note ? `<div class="note">${h.note}</div>` : ''}
        <div class="meta">
            Source: ${h.url}<br>
            Date: ${new Date(h.timestamp).toLocaleString()}
        </div>
    </div>
    `).join('\n')}
</body>
</html>`;
        }
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 