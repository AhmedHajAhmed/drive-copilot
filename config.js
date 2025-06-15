// Configuration for the Drive Copilot extension
export const config = {
    // API Keys and Credentials
    apiKeys: {
        googleDrive: process.env.GOOGLE_DRIVE_API_KEY,
        openai: process.env.OPENAI_API_KEY
    },
    
    // Client Configuration
    clientConfig: {
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET
    },

    // Feature Flags
    features: {
        enableSearch: true,
        enableSummarization: true,
        enableContextAwareness: true
    },

    // Search Configuration
    search: {
        maxResults: 10,
        timeoutMs: 30000,
        minRelevanceScore: 0.7
    },

    // UI Configuration
    ui: {
        maxDisplayedResults: 5,
        animationDuration: 300,
        debounceTime: 500
    }
}; 