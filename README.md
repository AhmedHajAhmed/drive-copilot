# Drive Copilot - Chrome Extension

Drive Copilot is a Chrome extension that provides an AI-powered interface for searching and retrieving information from Google Drive. It enables users to search across their Drive documents, get intelligent answers with proper source attribution, and maintain context awareness throughout the interaction.

## Technical Architecture

### Core Components

1. **Chrome Extension**
   - `manifest.json`: Extension configuration and permissions
   - `background.js`: Background service worker for handling API requests and message passing
   - `sidepanel.js`: Main UI logic and user interaction handling
   - `sidepanel.html`: Extension interface template
   - `styles.css`: UI styling and responsive design

2. **Evaluation System**
   - `evaluation/run_tests.html`: Test runner interface
   - `evaluation/test_documents/`: Sample documents for testing
   - Test cases covering various retrieval scenarios

### Key Features

1. **Document Retrieval**
   - Hierarchical search across Drive folders
   - Content-based search within documents
   - Context-aware retrieval based on user queries
   - Support for multiple document types (Docs, PDFs, Sheets)

2. **Intelligent Response Generation**
   - Context preservation from user queries
   - Information synthesis from multiple sources
   - Clear source attribution
   - Structured response formatting

3. **Evaluation Framework**
   - Comprehensive test suite
   - Metrics for accuracy, completeness, and context
   - Source relevance and accuracy tracking
   - Response time monitoring

### Technical Implementation

#### 1. Extension Architecture

```javascript
// Background Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'SEARCH_DRIVE':
      // Handle Drive search
      break;
    case 'GET_DOCUMENT':
      // Retrieve specific document
      break;
    // ... other message handlers
  }
});
```

#### 2. Search Implementation

- **Hierarchical Search**
  - Folder structure analysis
  - Document metadata extraction
  - Content indexing
  - Relevance scoring

- **Context-Aware Retrieval**
  - Query analysis
  - Context preservation
  - Source relevance ranking
  - Information synthesis

#### 3. Evaluation System

```javascript
// Test Case Structure
const testCases = [
  {
    id: 'timeline',
    name: 'Project Timeline Query',
    query: 'What are the key milestones in Q2?',
    expected: {
      required: {
        dates: ['April 15', 'May 1', 'May 15', 'June 1', 'June 30'],
        events: ['Complete MVP development', 'Begin beta testing', ...]
      }
    }
  }
  // ... other test cases
];
```

### Evaluation Metrics

1. **Accuracy (40%)**
   - Response correctness
   - Information precision
   - Factual accuracy
   - Matches with expected content

2. **Completeness (30%)**
   - Coverage of required information
   - Content coverage
   - Response structure
   - Information gaps

3. **Clarity (20%)**
   - Response formatting
   - Readability
   - Structure
   - Organization

4. **Sources (10%)**
   - Source identification
   - Reference accuracy
   - Citation clarity
   - Source relevance

### Scoring System

Each metric is scored on a scale of 0-5, and the final score is calculated using weighted percentages:
- Accuracy: 40% of total score
- Completeness: 30% of total score
- Clarity: 20% of total score
- Sources: 10% of total score

Example calculation:
```
Final Score = (Accuracy × 0.4) + (Completeness × 0.3) + (Clarity × 0.2) + (Sources × 0.1)
```

### Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your API keys:
   ```
   GOOGLE_DRIVE_API_KEY=your_api_key
   GOOGLE_DRIVE_CLIENT_ID=your_client_id
   GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
   OPENAI_API_KEY=your_openai_key
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

### Extension Installation

1. Open Chrome Extensions (`chrome://extensions/`)
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `dist` directory

### Testing

1. Open test runner: `http://localhost:8000/evaluation/run_tests.html`
2. Run test suite
3. Review results and metrics

## Security Considerations

- OAuth 2.0 authentication for Google Drive access
- Secure API key storage in environment variables
- HTTPS-only API calls
- Minimal permission scope
- No sensitive data persistence

## Performance Optimization

- Lazy loading of document content
- Efficient document processing
- Optimized API calls
- Background processing for heavy tasks
- Caching of search results

## Future Improvements

- Enhanced document type support
- Improved relevance scoring
- Advanced caching mechanisms
- Extended test coverage
- Performance optimizations
- User feedback integration

