# Drive Copilot Evaluation Test Cases

## Test Categories

### 1. Basic Information Retrieval
- Simple factual questions about document content
- Questions requiring information from multiple documents
- Questions about document metadata (dates, authors, etc.)

### 2. Context-Aware Queries
- Questions requiring understanding of document relationships
- Questions about document hierarchies and organization
- Questions about document versions and changes

### 3. Complex Information Synthesis
- Questions requiring information from different file types
- Questions about trends or patterns across documents
- Questions requiring inference from multiple sources

### 4. Edge Cases
- Questions about non-existent information
- Questions with ambiguous terms
- Questions about very recent or very old documents

## Test Cases

### Project Timeline Query
- Query: "What are the key milestones in Q2?"
- Expected: List of milestones with dates
- Expected Content: ["April 15", "May 1", "May 15", "June 1", "June 30"]
- Evaluation:
  - Accuracy: 5 if all dates are correct
  - Completeness: 5 if all milestones are listed
  - Context: 5 if Q2 context is maintained
  - Synthesis: 5 if milestones are properly organized
  - Clarity: 5 if dates are clearly formatted

### Budget Analysis Query
- Query: "How is the budget allocated across different phases?"
- Expected: Budget breakdown by phase
- Expected Content: ["development", "testing", "marketing", "launch"]
- Evaluation:
  - Accuracy: 5 if all phases are correct
  - Completeness: 5 if all allocations are listed
  - Context: 5 if budget context is maintained
  - Synthesis: 5 if allocations are properly organized
  - Clarity: 5 if amounts are clearly formatted

### Team Structure Query
- Query: "Who are the key members of the project team?"
- Expected: List of team members with roles
- Expected Content: ["CEO", "CTO", "COO", "Lead Engineer"]
- Evaluation:
  - Accuracy: 5 if all roles are correct
  - Completeness: 5 if all key members are listed
  - Context: 5 if team structure context is maintained
  - Synthesis: 5 if roles are properly organized
  - Clarity: 5 if roles are clearly formatted

### Marketing Strategy Query
- Query: "What are the main marketing channels and targets for 2024?"
- Expected: List of channels and target audiences
- Expected Content: ["social media", "content marketing", "email marketing", "industry events"]
- Evaluation:
  - Accuracy: 5 if all channels are correct
  - Completeness: 5 if all channels are listed
  - Context: 5 if 2024 context is maintained
  - Synthesis: 5 if channels are properly organized
  - Clarity: 5 if channels are clearly formatted

### Risk Assessment Query
- Query: "What are the main risks identified in the project plan?"
- Expected: List of identified risks
- Expected Content: ["integration", "performance", "security", "market"]
- Evaluation:
  - Accuracy: 5 if all risks are correct
  - Completeness: 5 if all key risks are listed
  - Context: 5 if risk context is maintained
  - Synthesis: 5 if risks are properly organized
  - Clarity: 5 if risks are clearly formatted

## Evaluation Criteria

### Response Quality (1-5 scale)
1. Accuracy: How correct is the information?
   - 5: All information is correct
   - 0: Information is incorrect or missing

2. Completeness: How comprehensive is the response?
   - 5: All expected points are covered
   - 0: Missing key information

3. Context: How well is the query context maintained?
   - 5: All query terms are addressed
   - 0: Query context is lost

4. Synthesis: How well is information combined?
   - 5: Information is well-organized and connected
   - 0: Information is disjointed

5. Clarity: How clear is the presentation?
   - 5: Well-structured and easy to understand
   - 0: Unclear or poorly formatted

### Source Quality
1. Source Relevance: How relevant are the sources?
   - 5: All sources are directly relevant
   - 0: Sources are irrelevant

2. Source Accuracy: How accurate are the sources?
   - 5: All sources are accurate
   - 0: Sources contain errors

3. Context Preservation: How well is context preserved?
   - 5: Context is maintained across all sources
   - 0: Context is lost

4. Information Synthesis: How well is information synthesized?
   - 5: Information is well-combined from multiple sources
   - 0: Information is not synthesized

## Test Procedure

1. For each test case:
   - Run the query
   - Compare response against expected content
   - Score each evaluation criterion
   - Calculate weighted score

2. Document:
   - Success rate
   - Average response quality
   - Common failure patterns
   - Areas for improvement

## Success Metrics

- Minimum 80% accuracy on basic information retrieval
- Minimum 70% accuracy on complex queries
- Response time under 5 seconds for basic queries
- Clear error messages for edge cases
- Proper source attribution in all responses 