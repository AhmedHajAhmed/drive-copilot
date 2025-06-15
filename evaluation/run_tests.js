const fs = require('fs');
const path = require('path');

// Test results structure
const results = {
    timestamp: new Date().toISOString(),
    testCases: [],
    summary: {
        totalTests: 0,
        completedTests: 0,
        failedTests: 0,
        averageScore: 0,
        averageResponseTime: 0
    }
};

// Function to run a single test case
async function runTestCase(testCase) {
    const result = {
        name: testCase.name,
        query: testCase.query,
        status: 'pending',
        response: null,
        evaluation: null,
        responseTime: 0
    };
    
    try {
        // Send query to extension
        const startTime = Date.now();
        const response = await sendQueryToExtension(testCase.query);
        result.responseTime = Date.now() - startTime;
        
        if (response.error) {
            result.status = 'failed';
            result.error = response.error;
        } else {
            result.status = 'completed';
            result.response = response;
            result.evaluation = evaluateResponse(response, testCase);
        }
    } catch (error) {
        result.status = 'failed';
        result.error = error.message;
    }
    
    return result;
}

// Function to evaluate a response
function evaluateResponse(response, testCase) {
    const evaluation = {
        accuracy: 0,
        completeness: 0,
        clarity: 0,
        sources: 0,
        notes: []
    };
    
    // Check if response exists
    if (!response) {
        evaluation.notes.push('No response received');
        return evaluation;
    }
    
    // Check for error
    if (response.error) {
        evaluation.notes.push(`Error: ${response.error}`);
        return evaluation;
    }
    
    // Evaluate summary
    if (response.summary) {
        const summary = response.summary.toLowerCase();
        
        // Accuracy: Check if the response contains all expected content
        const accuracyMatches = testCase.expectedContent.filter(content => 
            summary.includes(content.toLowerCase())
        ).length;
        evaluation.accuracy = (accuracyMatches / testCase.expectedContent.length) * 5;
        
        // Completeness: Check if the response covers all expected points
        const completenessMatches = testCase.expected.filter(expected => 
            summary.includes(expected.toLowerCase())
        ).length;
        evaluation.completeness = (completenessMatches / testCase.expected.length) * 5;
        
        // Clarity: Check if the response is well-structured and readable
        const hasStructure = summary.includes('\n') || 
                           summary.includes('•') ||
                           summary.includes('-');
        const hasFormatting = summary.includes(':') || 
                            summary.includes('(') ||
                            summary.includes(')');
        evaluation.clarity = (hasStructure && hasFormatting) ? 5 : 
                           (hasStructure || hasFormatting) ? 3 : 2;
    }
    
    // Evaluate sources
    if (response.sources && response.sources.length > 0) {
        // Source Attribution: Check for proper source attribution
        const hasMultipleSources = response.sources.length >= 2;
        const hasSourceDetails = response.sources.some(source => 
            source.name && source.type && source.link
        );
        evaluation.sources = (hasMultipleSources && hasSourceDetails) ? 5 :
                           (hasMultipleSources || hasSourceDetails) ? 3 : 2;
    } else {
        evaluation.notes.push('No sources provided');
        evaluation.sources = 0;
    }
    
    return evaluation;
}

// Function to calculate weighted score
function calculateWeightedScore(evaluation) {
    const weights = {
        accuracy: 0.4,    // 40% weight
        completeness: 0.3, // 30% weight
        clarity: 0.2,     // 20% weight
        sources: 0.1      // 10% weight
    };
    
    return (
        evaluation.accuracy * weights.accuracy +
        evaluation.completeness * weights.completeness +
        evaluation.clarity * weights.clarity +
        evaluation.sources * weights.sources
    );
}

// Function to update summary statistics
function updateSummary() {
    const completedTests = results.testCases.filter(test => test.status === 'completed');
    
    results.summary = {
        totalTests: results.testCases.length,
        completedTests: completedTests.length,
        failedTests: results.testCases.filter(test => test.status === 'failed').length,
        averageScore: 0,
        averageResponseTime: 0
    };
    
    if (completedTests.length > 0) {
        // Calculate average scores
        const totalScore = completedTests.reduce((sum, test) => {
            if (test.evaluation) {
                return sum + calculateWeightedScore(test.evaluation);
            }
            return sum;
        }, 0);
        
        results.summary.averageScore = totalScore / completedTests.length;
        
        // Calculate average response time
        const totalTime = completedTests.reduce((sum, test) => sum + (test.responseTime || 0), 0);
        results.summary.averageResponseTime = totalTime / completedTests.length;
    }
}

// Function to save results
function saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test_results_${timestamp}.json`;
    const filepath = path.join(__dirname, 'results', filename);
    
    // Create results directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'results'))) {
        fs.mkdirSync(path.join(__dirname, 'results'));
    }
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${filepath}`);
}

// Main function to run all tests
async function runTests() {
    console.log('Starting test suite...');
    
    // Read test cases from the markdown file
    const testCases = [
        {
            name: 'Project Timeline Query',
            query: 'What are the key milestones in Q2?',
            expected: ['April 15', 'May 1', 'May 15', 'June 1', 'June 30'],
            expectedContent: ['MVP development', 'beta testing', 'marketing campaign', 'v1.0', '1000 users']
        },
        {
            name: 'Budget Analysis Query',
            query: 'How is the budget allocated across different phases?',
            expected: ['development', 'testing', 'marketing', 'launch'],
            expectedContent: ['budget', 'allocation', 'phases']
        },
        {
            name: 'Team Structure Query',
            query: 'Who are the key members of the project team?',
            expected: ['CEO', 'CTO', 'COO', 'Lead Engineer'],
            expectedContent: ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Alex Rodriguez']
        },
        {
            name: 'Marketing Strategy Query',
            query: 'What are the main marketing channels and targets for 2024?',
            expected: ['social media', 'content marketing', 'email marketing', 'industry events'],
            expectedContent: ['LinkedIn', 'Twitter', 'Blog', 'Whitepapers']
        },
        {
            name: 'Risk Assessment Query',
            query: 'What are the main risks identified in the project plan?',
            expected: ['integration', 'performance', 'security', 'market'],
            expectedContent: ['legacy systems', 'scale', 'vulnerabilities', 'competitor']
        }
    ];
    
    // Run each test case
    for (const testCase of testCases) {
        const result = await runTestCase(testCase);
        results.testCases.push(result);
        
        // Log progress
        console.log(`Completed test case: ${testCase.name}`);
        if (result.evaluation) {
            console.log(`Evaluation:`, result.evaluation);
        }
    }
    
    // Update summary statistics
    updateSummary();
    
    // Save results
    saveResults();
    
    return results;
}

// Run the tests
runTests().catch(console.error); 