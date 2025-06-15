// Global variables and functions for background connection
let isBackgroundReady = false;
let retryCount = 0;
const maxRetries = 3;

function checkBackgroundConnection() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'ping' }, response => {
            if (chrome.runtime.lastError) {
                console.log('Background not ready, retrying...', chrome.runtime.lastError);
                if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(() => checkBackgroundConnection().then(resolve).catch(reject), 1000);
                } else {
                    console.error('Could not connect to background script after', maxRetries, 'attempts');
                    reject(new Error('Could not connect to extension. Please try reloading the page.'));
                }
            } else {
                console.log('Background script is ready');
                isBackgroundReady = true;
                resolve();
            }
        });
    });
}

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing extension...');
    
    // Initialize UI elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const toggleAdvanced = document.getElementById('toggleAdvanced');
    const advancedOptions = document.getElementById('advancedOptions');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const resultsList = document.getElementById('resultsList');
    const pagination = document.getElementById('pagination');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    // State
    let currentPage = 1;
    let totalResults = 0;
    let currentResults = [];
    const resultsPerPage = 5;
    
    // Initialize date fields
    if (startDate && endDate) {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        startDate.value = formatDate(lastMonth);
        endDate.value = formatDate(today);
    }
    
    // Add event listeners
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    if (toggleAdvanced && advancedOptions) {
        toggleAdvanced.addEventListener('click', () => {
            advancedOptions.classList.toggle('hidden');
            toggleAdvanced.textContent = advancedOptions.classList.contains('hidden') 
                ? 'Advanced Search Options' 
                : 'Hide Advanced Options';
        });
    }
    
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayResults();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            if (currentPage * resultsPerPage < totalResults) {
                currentPage++;
                displayResults();
            }
        });
    }
    
    // Initialize search modes
    initializeSearchModes();

    // Initialize connection check
    checkBackgroundConnection().catch(error => {
        console.error('Initial connection check failed:', error);
        showError(error.message);
    });
});

// Initialize search mode selection
function initializeSearchModes() {
    console.log('Initializing search modes...');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const optionPanels = document.querySelectorAll('.search-option-panel');
    
    if (!modeButtons.length) {
        console.error('No mode buttons found!');
        return;
    }
    
    console.log('Found mode buttons:', modeButtons.length);
    
    // Set initial state
    const defaultMode = 'document';
    const defaultButton = document.querySelector(`.mode-btn[data-mode="${defaultMode}"]`);
    if (defaultButton) {
        defaultButton.classList.add('active');
    }
    
    // Show default options panel
    const defaultPanel = document.getElementById(`${defaultMode}Options`);
    if (defaultPanel) {
        defaultPanel.classList.remove('hidden');
    }
    
    // Add click handlers
    modeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            console.log('Mode button clicked:', button.dataset.mode);
            
            // Update active button
            modeButtons.forEach(btn => {
                btn.classList.remove('active');
                console.log('Removing active class from:', btn.dataset.mode);
            });
            button.classList.add('active');
            console.log('Added active class to:', button.dataset.mode);
            
            // Show corresponding options panel
            const mode = button.dataset.mode;
            optionPanels.forEach(panel => {
                panel.classList.add('hidden');
                console.log('Hiding panel:', panel.id);
            });
            
            const targetPanel = document.getElementById(`${mode}Options`);
            if (targetPanel) {
                targetPanel.classList.remove('hidden');
                console.log('Showing panel:', targetPanel.id);
            }
            
            // Update search input placeholder
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                switch(mode) {
                    case 'document':
                        searchInput.placeholder = 'Search for documents or folders...';
                        break;
                    case 'content':
                        searchInput.placeholder = 'Search for specific content...';
                        break;
                    case 'question':
                        searchInput.placeholder = 'Ask a question about your documents...';
                        break;
                }
                console.log('Updated placeholder to:', searchInput.placeholder);
            }
        });
    });
}

// Get current search mode
function getCurrentSearchMode() {
    const activeButton = document.querySelector('.mode-btn.active');
    return activeButton ? activeButton.dataset.mode : 'document';
}

// Get search context based on current mode
function getSearchContext() {
    const mode = getCurrentSearchMode();
    const context = {
        mode: mode,
        query: document.getElementById('searchInput').value.trim()
    };
    
    switch(mode) {
        case 'document':
            const fileType = document.getElementById('fileType');
            const sortBy = document.getElementById('sortBy');
            if (fileType) context.fileType = fileType.value;
            if (sortBy) context.sortBy = sortBy.value;
            break;
            
        case 'content':
            const targetLocation = document.getElementById('targetLocation');
            const searchScope = document.getElementById('searchScope');
            if (targetLocation) context.targetLocation = targetLocation.value;
            if (searchScope) context.searchScope = searchScope.value;
            break;
            
        case 'question':
            // Always use 'all' for search scope and 'sources' for response type
            context.scope = 'all';
            context.responseType = 'sources';
            break;
    }
    
    return context;
}

// Update performSearch to check connection
async function performSearch() {
    if (!isBackgroundReady) {
        try {
            await checkBackgroundConnection();
        } catch (error) {
            showError(error.message);
            return;
        }
    }

    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showError('Please enter a search query');
        return;
    }
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }
    
    // Clear previous results and error message
    const resultsList = document.getElementById('resultsList');
    const resultsContainer = document.getElementById('resultsContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    if (resultsList) {
        resultsList.innerHTML = ''; // Clear previous results
    }
    if (resultsContainer) {
        resultsContainer.style.display = 'none'; // Hide results container
    }
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }
    
    try {
        // Get search context
        const context = getSearchContext();
        console.log('Search context:', context);
        
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
            action: 'search',
            query: query,
            context: context
        });
        
        console.log('Raw search response:', response);
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        if (!response.summary) {
            throw new Error('No results found');
        }
        
        // Display the answer
        displayAnswer(response);
        
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    } finally {
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}

// Display search results
function displayAnswer(answer) {
    console.log('Displaying answer:', answer);
    
    const resultsList = document.getElementById('resultsList');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (!resultsList || !resultsContainer) {
        console.error('Results container elements not found');
        return;
    }
    
    // Create answer container
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';
    
    // Add summary
    if (answer.summary) {
        console.log('Adding summary:', answer.summary);
        const summary = document.createElement('div');
        summary.className = 'answer-summary';
        summary.innerHTML = answer.summary.replace(/\n/g, '<br>');
        answerContainer.appendChild(summary);
    }
    
    // Add sources
    if (answer.sources && answer.sources.length > 0) {
        console.log('Adding sources:', answer.sources);
        const sources = document.createElement('div');
        sources.className = 'answer-sources';
        
        const sourcesHeading = document.createElement('h3');
        sourcesHeading.textContent = 'Sources:';
        sources.appendChild(sourcesHeading);
        
        const sourcesList = document.createElement('ul');
        answer.sources.forEach(source => {
            const sourceItem = document.createElement('li');
            const sourceLink = document.createElement('a');
            sourceLink.href = source.link || `https://drive.google.com/file/d/${source.id}/view`;
            sourceLink.textContent = source.name || source.title;
            sourceLink.target = '_blank';
            sourceItem.appendChild(sourceLink);
            
            if (source.type) {
                const typeSpan = document.createElement('span');
                typeSpan.className = 'file-type';
                typeSpan.textContent = ` (${source.type})`;
                sourceItem.appendChild(typeSpan);
            }
            
            sourcesList.appendChild(sourceItem);
        });
        sources.appendChild(sourcesList);
        answerContainer.appendChild(sources);
    }
    
    // Add relevant snippets
    if (answer.relevantSnippets && answer.relevantSnippets.length > 0) {
        console.log('Adding snippets:', answer.relevantSnippets);
        const snippets = document.createElement('div');
        snippets.className = 'answer-snippets';
        
        const snippetsHeading = document.createElement('h3');
        snippetsHeading.textContent = 'Relevant Content:';
        snippets.appendChild(snippetsHeading);
        
        answer.relevantSnippets.forEach(snippet => {
            const snippetItem = document.createElement('div');
            snippetItem.className = 'snippet-item';
            
            if (snippet.context) {
                const context = document.createElement('div');
                context.className = 'snippet-context';
                context.textContent = snippet.context;
                snippetItem.appendChild(context);
            }
            
            const text = document.createElement('div');
            text.className = 'snippet-text';
            text.textContent = snippet.text || snippet.content;
            snippetItem.appendChild(text);
            
            if (snippet.link) {
                const source = document.createElement('div');
                source.className = 'snippet-source';
                const sourceLink = document.createElement('a');
                sourceLink.href = snippet.link;
                sourceLink.textContent = 'View Source';
                sourceLink.target = '_blank';
                source.appendChild(sourceLink);
                snippetItem.appendChild(source);
            }
            
            snippets.appendChild(snippetItem);
        });
        answerContainer.appendChild(snippets);
    }
    
    // Add the answer container to the results list
    resultsList.appendChild(answerContainer);
    resultsContainer.style.display = 'block';
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// Display Functions
function displayResults() {
    resultsList.innerHTML = '';
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = Math.min(startIndex + resultsPerPage, totalResults);
    const pageResults = currentResults.slice(startIndex, endIndex);
    
    pageResults.forEach(result => {
        const resultElement = createResultElement(result);
        resultsList.appendChild(resultElement);
    });
    
    updatePagination();
}

function createResultElement(result) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'result-header';

    const titleLink = document.createElement('a');
    titleLink.className = 'result-title';
    titleLink.href = `https://drive.google.com/file/d/${result.file.id}/view`;
    titleLink.target = '_blank';
    titleLink.textContent = result.file.name;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'result-meta';
    metaDiv.innerHTML = `
        <span>${result.file.size}</span>
        <span>Modified: ${result.file.modifiedTime}</span>
        <span>By: ${result.file.owner}</span>
        ${result.file.mimeType ? `<span>Type: ${result.file.mimeType}</span>` : ''}
    `;

    headerDiv.appendChild(titleLink);
    headerDiv.appendChild(metaDiv);

    const snippetDiv = document.createElement('div');
    snippetDiv.className = 'result-snippet';
    
    if (result.hasContent) {
        snippetDiv.textContent = result.snippet;
    } else {
        snippetDiv.innerHTML = `
            <span class="no-content">No preview available</span>
            <span class="file-type">${result.file.mimeType || 'Unknown file type'}</span>
        `;
    }

    resultDiv.appendChild(headerDiv);
    resultDiv.appendChild(snippetDiv);

    return resultDiv;
}

function updatePagination() {
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    
    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }
    
    pagination.classList.remove('hidden');
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Utility Functions
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    resultsList.innerHTML = '';
    pagination.classList.add('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function getFileTypeLabel(mimeType) {
    const typeMap = {
        'application/vnd.google-apps.document': 'Google Doc',
        'application/vnd.google-apps.spreadsheet': 'Google Sheet',
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/pdf': 'PDF',
        'text/plain': 'Text File'
    };

    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';

    return typeMap[mimeType] || 'File';
}

// Rename h() to updateResults
function updateResults() {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    const startIndex = 5 * (currentPage - 1);
    const endIndex = Math.min(startIndex + 5, totalResults);
    
    results.slice(startIndex, endIndex).forEach(result => {
        const resultElement = createResultElement(result);
        resultsList.appendChild(resultElement);
    });
    
    const totalPages = Math.ceil(totalResults / 5);
    if (totalPages <= 1) {
        pagination.classList.add('hidden');
    } else {
        pagination.classList.remove('hidden');
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage === totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
} 