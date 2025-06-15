// Google Drive API configuration
// TODO: Replace these values with your actual credentials from Google Cloud Console
import { config } from './config.js';
const API_KEY = config.apiKeys.googleDrive;
const CLIENT_ID = config.clientConfig.clientId;
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

// Import OpenAI API key
import { OPENAI_API_KEY } from './config.js';

// Initialize authentication
chrome.runtime.onInstalled.addListener(() => {
  initializeAuth();
});

// Authentication function
function initializeAuth() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ 
      interactive: true, 
      scopes: SCOPES 
    }, function(token) {
      if (chrome.runtime.lastError) {
        const errorDetails = {
          message: chrome.runtime.lastError.message,
          stack: chrome.runtime.lastError.stack,
          name: chrome.runtime.lastError.name
        };
        
        console.error('Auth error details:', JSON.stringify(errorDetails, null, 2));
        
        // Try to get a new token
        chrome.identity.getAuthToken({ 
          interactive: true, 
          scopes: SCOPES 
        }, function(newToken) {
          if (chrome.runtime.lastError) {
            const error = {
              message: chrome.runtime.lastError.message || 'Authentication failed',
              name: chrome.runtime.lastError.name,
              stack: chrome.runtime.lastError.stack
            };
            console.error('Failed to get new token:', JSON.stringify(error, null, 2));
            chrome.runtime.sendMessage({
              type: 'AUTH_ERROR',
              error: error.message,
              details: error
            });
            reject(error);
          } else {
            console.log('Successfully obtained new token');
            chrome.storage.local.set({ authToken: newToken }, () => {
              if (chrome.runtime.lastError) {
                const error = {
                  message: 'Failed to store token',
                  details: chrome.runtime.lastError
                };
                console.error('Storage error:', JSON.stringify(error, null, 2));
                reject(error);
              } else {
                resolve(newToken);
              }
            });
          }
        });
      } else {
        console.log('Successfully obtained initial token');
        chrome.storage.local.set({ authToken: token }, () => {
          if (chrome.runtime.lastError) {
            const error = {
              message: 'Failed to store token',
              details: chrome.runtime.lastError
            };
            console.error('Storage error:', JSON.stringify(error, null, 2));
            reject(error);
          } else {
            resolve(token);
          }
        });
      }
    });
  });
}

// Listen for messages from the sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'search') {
    handleSearch(message.query, message.context)
      .then(sendResponse)
      .catch(error => {
        console.error('Search error:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }

  if (message.action === 'openFile') {
    // Handle file opening
    const filePath = message.filePath;
    console.log('Opening file:', filePath);
    
    // If it's a file:// URL, convert it to a local path
    let localPath = filePath;
    if (filePath.startsWith('file://')) {
      localPath = filePath.replace('file://', '');
    }
    
    // Get the absolute path
    const absolutePath = chrome.runtime.getURL(localPath);
    console.log('Absolute path:', absolutePath);
    
    // Open the file in a new tab
    chrome.tabs.create({
      url: absolutePath
    }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error opening file:', chrome.runtime.lastError);
        // Try opening as a local file
        chrome.tabs.create({
          url: `file://${localPath}`
        });
      }
    });
  }
});

async function handleSearch(query, context) {
  try {
    console.log('Starting search with query:', query, 'context:', context);
    
    // Check if we're in test mode
    if (context.mode === 'test') {
      console.log('Running in test mode, using local test documents');
      const testResults = await searchTestDocuments(query);
      console.log('Test search results:', testResults);
      return testResults;
    }

    const searchResults = await searchDrive(query, context);
    console.log('Search results:', searchResults);

    if (searchResults.error) {
      console.error('Search error:', searchResults.error);
      return { error: searchResults.error };
    }

    // For document and content searches, return just the file information
    if (context.mode === 'document' || context.mode === 'content') {
      return {
        summary: `Found ${searchResults.results.length} relevant document(s):`,
        sources: searchResults.results.map(result => ({
          name: result.file.name,
          type: getFileType(result.file.mimeType),
          link: `https://drive.google.com/file/d/${result.file.id}/view`,
          snippet: result.snippet
        }))
      };
    }

    // For question mode, process with LLM
    console.log('Processing results with LLM...');
    const processedResults = await processSearchResults(searchResults.results, query);
    console.log('LLM processed results:', processedResults);

    return processedResults;
  } catch (error) {
    console.error('Error in handleSearch:', error);
    return { error: error.message };
  }
}

// Function to search test documents
async function searchTestDocuments(query) {
  try {
    console.log('Searching test documents for query:', query);
    const testDocuments = [
      {
        name: 'project_plan.md',
        content: await fetchTestDocument('project_plan.md'),
        mimeType: 'text/markdown'
      },
      {
        name: 'marketing_strategy.md',
        content: await fetchTestDocument('marketing_strategy.md'),
        mimeType: 'text/markdown'
      }
    ];

    console.log('Fetched test documents:', testDocuments.map(doc => doc.name));

    const results = testDocuments.map(doc => ({
      file: {
        id: doc.name,
        name: doc.name,
        size: formatFileSize(doc.content.length),
        modifiedTime: new Date().toLocaleString(),
        owner: "Test User",
        mimeType: doc.mimeType,
        parents: []
      },
      content: doc.content,
      snippet: content.substring(0, 200) + '...',
      hasContent: true
    }));

    console.log('Generated search results:', results);

    // Process the results with LLM
    console.log('Processing test results with LLM...');
    const processedResults = await processSearchResults(results, query);
    console.log('LLM processed test results:', processedResults);

    return processedResults;
  } catch (error) {
    console.error('Error searching test documents:', error);
    return { error: error.message };
  }
}

// Function to fetch test document content
async function fetchTestDocument(filename) {
  try {
    console.log('Fetching test document:', filename);
    const response = await fetch(`/evaluation/test_documents/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test document: ${filename}`);
    }
    const content = await response.text();
    console.log(`Successfully fetched ${filename}, content length:`, content.length);
    return content;
  } catch (error) {
    console.error(`Error fetching test document ${filename}:`, error);
    throw error;
  }
}

// Function to generate a snippet from content
function generateSnippet(content, query) {
  try {
    console.log('Generating snippet for query:', query);
    // Simple snippet generation - first 200 characters
    const snippet = content.substring(0, 200) + '...';
    console.log('Generated snippet:', snippet);
    return snippet;
  } catch (error) {
    console.error('Error generating snippet:', error);
    return '';
  }
}

// Function to format file size
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Search Google Drive
async function searchDrive(query, context) {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication failed. Please try logging in again.");
    }

    // Optimize search query
    const searchQuery = [
      `(name contains '${query}' or fullText contains '${query}')`,
      "trashed = false"
    ];

    // Add file type filter if specified
    if (context.fileType && context.fileType !== 'all') {
      const typeQueries = {
        'document': "mimeType = 'application/vnd.google-apps.document'",
        'spreadsheet': "mimeType = 'application/vnd.google-apps.spreadsheet'",
        'presentation': "mimeType = 'application/vnd.google-apps.presentation'",
        'pdf': "mimeType = 'application/pdf'"
      };
      
      if (typeQueries[context.fileType]) {
        searchQuery.push(typeQueries[context.fileType]);
      }
    }

    // Add date range if specified
    if (context.dateRange) {
      const { start, end } = context.dateRange;
      if (start) searchQuery.push(`modifiedTime >= '${start}'`);
      if (end) searchQuery.push(`modifiedTime <= '${end}'`);
    }

    // Optimize fields to fetch only what we need
    const fields = [
      'files(id,name,mimeType,size,modifiedTime,owners,parents)',
      'nextPageToken'
    ].join(',');

    // Add page size limit for faster response
    const pageSize = 20; // Limit results to improve performance

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery.join(" and "))}&fields=${fields}&pageSize=${pageSize}&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Drive API error: " + response.statusText);
    }

    const data = await response.json();
    const results = [];

    // Process results in parallel for better performance
    const processFile = async (file) => {
      try {
        // Get file content only if it's a text-based file
        const isTextBased = [
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.spreadsheet',
          'application/vnd.google-apps.presentation',
          'application/pdf',
          'text/plain'
        ].includes(file.mimeType);

        let content = '';
        if (isTextBased) {
          content = await getFileContent(token, file.id, file.mimeType);
        }

        return {
          file: {
            id: file.id,
            name: file.name,
            size: formatFileSize(file.size),
            modifiedTime: new Date(file.modifiedTime).toLocaleString(),
            owner: file.owners?.[0]?.displayName || "Unknown",
            mimeType: file.mimeType,
            parents: file.parents || []
          },
          content: content,
          snippet: content ? generateSnippet(content, query) : null,
          hasContent: isTextBased
        };
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
        return null;
      }
    };

    // Process files in parallel with a concurrency limit
    const concurrencyLimit = 5;
    const chunks = [];
    for (let i = 0; i < data.files.length; i += concurrencyLimit) {
      chunks.push(data.files.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(processFile));
      results.push(...chunkResults.filter(Boolean));
    }

    return { results };
  } catch (error) {
    console.error('Search error:', error);
    return { error: error.message };
  }
}

function calculateNameMatch(fileName, query) {
  const name = fileName.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/);
  
  // Exact match gets highest score
  if (name === query.toLowerCase()) return 1.0;
  
  // Contains all terms in order
  if (name.includes(query.toLowerCase())) return 0.9;
  
  // Contains all terms in any order
  const containsAllTerms = terms.every(term => name.includes(term));
  if (containsAllTerms) return 0.8;
  
  // Contains some terms
  const matchingTerms = terms.filter(term => name.includes(term));
  return matchingTerms.length / terms.length * 0.7;
}

function calculateFolderPathRelevance(folderPath, query) {
  if (!folderPath.length) return 0;
  
  const pathString = folderPath.join('/').toLowerCase();
  const terms = query.toLowerCase().split(/\s+/);
  
  // Exact match in folder name
  if (folderPath.some(folder => folder.toLowerCase() === query.toLowerCase())) {
    return 1.0;
  }
  
  // Contains all terms in path
  if (terms.every(term => pathString.includes(term))) {
    return 0.8;
  }
  
  // Contains some terms
  const matchingTerms = terms.filter(term => pathString.includes(term));
  return matchingTerms.length / terms.length * 0.5;
}

function calculateRecencyScore(modifiedTime) {
  const now = new Date();
  const diffDays = (now - modifiedTime) / (1000 * 60 * 60 * 24);
  
  // Score based on recency (exponential decay)
  return Math.exp(-diffDays / 365); // 1 year half-life
}

function calculateContentRelevance(content, query) {
  if (!content) return 0;
  
  const text = content.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/);
  
  // Calculate term frequency
  const termFrequencies = terms.map(term => {
    const matches = text.match(new RegExp(term, 'g')) || [];
    return matches.length;
  });
  
  // Calculate term proximity
  const proximityScores = terms.map(term => {
    const positions = [];
    let pos = text.indexOf(term);
    while (pos !== -1) {
      positions.push(pos);
      pos = text.indexOf(term, pos + 1);
    }
    
    if (positions.length < 2) return 0;
    
    // Calculate minimum distance between occurrences
    const distances = [];
    for (let i = 1; i < positions.length; i++) {
      distances.push(positions[i] - positions[i-1]);
    }
    const minDistance = Math.min(...distances);
    
    // Score based on proximity (closer = better)
    return Math.exp(-minDistance / 100);
  });
  
  // Combine scores
  const frequencyScore = termFrequencies.reduce((sum, freq) => sum + freq, 0) / terms.length;
  const proximityScore = proximityScores.reduce((sum, score) => sum + score, 0) / terms.length;
  
  return (frequencyScore * 0.6 + proximityScore * 0.4);
}

function extractRelevantSnippet(content, query) {
  if (!content) return null;
  
  const text = content.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/);
  
  // Find the best matching position
  let bestPosition = -1;
  let bestScore = -1;
  
  for (let i = 0; i < text.length; i++) {
    let score = 0;
    for (const term of terms) {
      if (text.substring(i, i + term.length) === term) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestPosition = i;
    }
  }
  
  if (bestPosition === -1) {
    return content.substring(0, 200) + "...";
  }
  
  // Extract context around the best match
  const start = Math.max(0, bestPosition - 100);
  const end = Math.min(content.length, bestPosition + 100);
  return content.substring(start, end) + "...";
}


// Enhanced relevance calculation
function calculateRelevance(text, query) {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text input for relevance calculation:', text);
    return 0;
  }

  try {
    const textLower = text.toLowerCase();
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return 0;
    }

    // Calculate word match score
    const wordMatchScore = searchTerms.reduce((score, term) => {
      const matches = (textLower.match(new RegExp(term, 'g')) || []).length;
      return score + matches;
    }, 0);

    // Calculate phrase match score
    const phraseScore = textLower.includes(query.toLowerCase()) ? 2 : 0;

    // Calculate proximity score
    const proximityScore = searchTerms.reduce((score, term) => {
      const positions = [];
      let pos = textLower.indexOf(term);
      while (pos !== -1) {
        positions.push(pos);
        pos = textLower.indexOf(term, pos + 1);
      }

      if (positions.length > 1) {
        const minDistance = Math.min(...positions.slice(1).map((p, i) => p - positions[i]));
        return score + (minDistance < 50 ? 1 : 0);
      }
      return score;
    }, 0);

    // Calculate final score with weights
    const finalScore = (wordMatchScore * 0.5) + (phraseScore * 0.3) + (proximityScore * 0.2);
    
    // Normalize score based on text length
    return finalScore / (text.length * 0.001);
  } catch (error) {
    console.error('Error calculating relevance:', error);
    return 0;
  }
}

// Helper function to get auth token
function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true, scopes: SCOPES }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Initial auth error:', chrome.runtime.lastError);
        // Try to refresh the token
        chrome.identity.getAuthToken({ interactive: true, scopes: SCOPES }, (newToken) => {
          if (chrome.runtime.lastError) {
            const error = {
              message: chrome.runtime.lastError.message || 'Authentication failed',
              name: chrome.runtime.lastError.name,
              stack: chrome.runtime.lastError.stack
            };
            console.error('Failed to get new token:', JSON.stringify(error, null, 2));
            chrome.runtime.sendMessage({ type: 'AUTH_ERROR', error: error.message, details: error });
            reject(error);
          } else {
            console.log('Successfully obtained new token');
            chrome.storage.local.set({ authToken: newToken }, () => {
              if (chrome.runtime.lastError) {
                const error = {
                  message: 'Failed to store token',
                  details: chrome.runtime.lastError
                };
                console.error('Storage error:', JSON.stringify(error, null, 2));
                reject(error);
              } else {
                resolve(newToken);
              }
            });
          }
        });
      } else {
        console.log('Successfully obtained initial token');
        chrome.storage.local.set({ authToken: token }, () => {
          if (chrome.runtime.lastError) {
            const error = {
              message: 'Failed to store token',
              details: chrome.runtime.lastError
            };
            console.error('Storage error:', JSON.stringify(error, null, 2));
            reject(error);
          } else {
            resolve(token);
          }
        });
      }
    });
  });
}

// Get file content based on mime type
async function getFileContent(token, fileId, mimeType) {
  try {
    console.log(`Getting content for file ${fileId} (${mimeType})`);
    
    switch (mimeType) {
      case 'application/vnd.google-apps.document':
        return await getGoogleDocContent(fileId, token);
      case 'application/pdf':
        return await getPdfContent(fileId, token);
      case 'text/plain':
        return await getTextContent(fileId, token);
      default:
        console.log(`Unsupported file type: ${mimeType}`);
        return null;
    }
  } catch (error) {
    console.error(`Error getting content for file ${fileId}:`, {
      error: error.message || 'Unknown error',
      stack: error.stack,
      mimeType,
      details: error.details || error
    });
    throw error;
  }
}

// Get content from Google Docs
async function getGoogleDocContent(fileId, token) {
  try {
    console.log(`Fetching Google Doc content for file ${fileId}`);
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Docs API error:', errorText);
      throw new Error(`Failed to get document content: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Google Doc response:', data);

    if (!data.body || !data.body.content) {
      console.log('No content found in Google Doc');
      return null;
    }

    const content = data.body.content
      .map(item => {
        if (item.paragraph) {
          const text = item.paragraph.elements
            .map(element => element.textRun?.content || '')
            .join('');
          return text;
        }
        return '';
      })
      .filter(text => text.trim().length > 0)
      .join('\n');

    if (!content.trim()) {
      console.log('No text content found in Google Doc');
      return null;
    }

    console.log(`Extracted ${content.length} characters from Google Doc`);
    return content;
  } catch (error) {
    console.error('Error in getGoogleDocContent:', {
      error: error.message,
      stack: error.stack,
      fileId,
      details: error.details || error
    });
    return null;
  }
}

// Get content from PDF files
async function getPdfContent(fileId, token) {
  try {
    console.log(`Fetching PDF content for file ${fileId}`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF content error:', errorText);
      throw new Error(`Failed to get PDF content: ${response.status} ${response.statusText}`);
    }

    // For now, return null since PDF parsing requires additional libraries
    console.log('PDF content not supported yet');
    return null;
  } catch (error) {
    console.error('Error in getPdfContent:', {
      error: error.message,
      stack: error.stack,
      fileId,
      details: error.details || error
    });
    return null;
  }
}

// Get content from text files
async function getTextContent(fileId, token) {
  try {
    console.log(`Fetching text content for file ${fileId}`);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Text content error:', errorText);
      throw new Error(`Failed to get text content: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    if (!content.trim()) {
      console.log('No text content found in file');
      return null;
    }

    console.log(`Extracted ${content.length} characters from text file`);
    return content.trim();
  } catch (error) {
    console.error('Error in getTextContent:', {
      error: error.message,
      stack: error.stack,
      fileId,
      details: error.details || error
    });
    return null;
  }
}

// Add helper function for date formatting
function formatDateForQuery(date) {
    if (!date) return null;
    try {
        // If it's already a string, return it
        if(typeof date === 'string') return date;
        // If it's a Date object, convert to ISO string
        if(date instanceof Date) return date.toISOString();
        // If it's neither, return null
        return null;
    } catch(e) {
        console.error("Error formatting date:", e);
        return null;
    }
}

function formatDate(date) {
  try {
    return new Date(date).toLocaleDateString();
  } catch (e) {
    console.error("Error formatting date:", e);
    return null;
  }
}

// Add new function to process content and generate answers
async function processSearchResults(results, query) {
  try {
    console.log('Processing search results:', results.length, 'results');
    
    // Group results by file type
    const groupedResults = results.reduce((acc, result) => {
      const fileType = getFileType(result.file.mimeType);
      if (!acc[fileType]) {
        acc[fileType] = [];
      }
      acc[fileType].push(result);
      return acc;
    }, {});

    console.log('Grouped results:', groupedResults);

    // Prepare context for LLM
    const context = Object.entries(groupedResults)
      .map(([type, files]) => {
        const snippets = files
          .filter(f => f.snippet)
          .map(f => ({
            content: f.snippet,
            source: f.file.name,
            type: type,
            id: f.file.id,
            link: `https://drive.google.com/file/d/${f.file.id}/view`
          }));
        return snippets;
      })
      .flat();

    console.log('Prepared context for LLM:', context);

    // Generate LLM response
    let llmResponse;
    try {
      console.log('Calling LLM with query:', query);
      llmResponse = await generateLLMResponse(query, context);
      console.log('Received LLM response:', llmResponse);
      return llmResponse;
    } catch (error) {
      console.error("Error calling LLM:", error);
      // Fallback to basic summary if LLM fails
      return {
        summary: `Found ${results.length} relevant documents. The most relevant content appears to be from: ${results.slice(0, 3).map(r => r.file.name).join(", ")}`,
        sources: results.slice(0, 3).map(r => ({
          name: r.file.name,
          type: getFileType(r.file.mimeType),
          link: `https://drive.google.com/file/d/${r.file.id}/view`
        })),
        relevantSnippets: []
      };
    }
  } catch (error) {
    console.error("Error processing search results:", error);
    return {
      summary: "Error processing search results. Please try again.",
      sources: [],
      relevantSnippets: []
    };
  }
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

function getFileType(mimeType) {
  if (!mimeType) return 'other';
  
  if (mimeType === 'application/vnd.google-apps.document') {
    return 'documents';
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return 'spreadsheets';
  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    return 'presentations';
  } else if (mimeType === 'application/pdf') {
    return 'pdfs';
  } else if (mimeType === 'text/plain') {
    return 'text';
  } else if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return 'media';
  }
  
  return 'other';
}

async function generateLLMResponse(query, context) {
  try {
    console.log('Generating LLM response for query:', query);
    
    // Check if we have any relevant context
    if (!context || context.length === 0) {
      return {
        summary: "I couldn't find any relevant information in your Google Drive documents to answer this question.",
        sources: [],
        relevantSnippets: []
      };
    }
    
    // Limit context to most relevant items
    const limitedContext = context.slice(0, 5); // Only use top 5 most relevant items
    
    // Construct a more focused prompt
    const prompt = `Based on the following context from the user's Google Drive documents, provide a concise answer to: "${query}"

Context:
${limitedContext.map(item => `From ${item.source} (${item.type}):
${item.content}`).join('\n\n')}

Provide a clear, direct answer with supporting evidence. If the context doesn't contain enough information to answer the question, say so.`;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKeys.openai}`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides clear, accurate answers based on the given context. Only answer based on the provided context. If the context doesn\'t contain enough information to answer the question, explicitly state that you don\'t have enough information from the provided documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more focused responses
        max_tokens: 500, // Limit response length
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    return {
      summary: answer,
      sources: limitedContext.map(item => ({
        name: item.source,
        type: item.type,
        link: item.link
      })),
      relevantSnippets: limitedContext.map(item => ({
        content: item.content,
        source: item.source,
        context: item.type,
        link: item.link
      }))
    };
  } catch (error) {
    console.error('Error generating LLM response:', error);
    return {
      summary: 'Error generating response. Please try again.',
      sources: [],
      relevantSnippets: []
    };
  }
}

function v(e) {
  // Convert input to number and handle invalid inputs
  const size = Number(e);
  if (isNaN(size)) {
    console.warn('Invalid size value:', e);
    return '0 B';
  }
  
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}