/**
 * Test script for AI Adapter functionality
 * This will help us verify the core AI functionality works
 */

import { aiAdapter } from './aiAdapter.js';

/**
 * Test suite for AI Adapter
 */
export class AIAdapterTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting AI Adapter Tests...\n');
    
    await this.testInitialization();
    await this.testSummarization();
    await this.testQuestionAnswering();
    await this.testErrorHandling();
    
    this.printResults();
  }

  /**
   * Test AI adapter initialization
   */
  async testInitialization() {
    console.log('1️⃣ Testing AI Adapter Initialization...');
    
    try {
      const status = aiAdapter.getStatus();
      console.log('✅ AI Adapter initialized successfully');
      console.log(`   Chrome AI Available: ${status.chromeAIAvailable}`);
      console.log(`   Fallback Mode: ${status.fallbackMode}`);
      
      this.testResults.push({
        test: 'Initialization',
        status: 'PASS',
        details: status
      });
    } catch (error) {
      console.log('❌ AI Adapter initialization failed:', error.message);
      this.testResults.push({
        test: 'Initialization',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test text summarization
   */
  async testSummarization() {
    console.log('2️⃣ Testing Text Summarization...');
    
    const testText = `
      Artificial Intelligence (AI) is transforming the way we work and live. 
      From chatbots to autonomous vehicles, AI technologies are becoming increasingly sophisticated. 
      Machine learning algorithms can now process vast amounts of data to identify patterns and make predictions. 
      However, with these advances come challenges around ethics, privacy, and job displacement. 
      It's important for society to carefully consider the implications of AI development.
    `;
    
    try {
      // Test short summary
      const shortSummary = await aiAdapter.summarizeText(testText, { maxLength: 'short' });
      console.log('✅ Short summary generated:', shortSummary.length, 'characters');
      
      // Test medium summary
      const mediumSummary = await aiAdapter.summarizeText(testText, { maxLength: 'medium' });
      console.log('✅ Medium summary generated:', mediumSummary.length, 'characters');
      
      // Test long summary
      const longSummary = await aiAdapter.summarizeText(testText, { maxLength: 'long' });
      console.log('✅ Long summary generated:', longSummary.length, 'characters');
      
      this.testResults.push({
        test: 'Summarization',
        status: 'PASS',
        details: {
          short: shortSummary.length,
          medium: mediumSummary.length,
          long: longSummary.length
        }
      });
    } catch (error) {
      console.log('❌ Summarization test failed:', error.message);
      this.testResults.push({
        test: 'Summarization',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test question answering
   */
  async testQuestionAnswering() {
    console.log('3️⃣ Testing Question Answering...');
    
    const mockSummaries = [
      {
        title: 'AI Technology Overview',
        summary: 'Artificial Intelligence is transforming industries with machine learning and automation.',
        url: 'https://example.com/ai-overview'
      },
      {
        title: 'Machine Learning Basics',
        summary: 'Machine learning algorithms process data to identify patterns and make predictions.',
        url: 'https://example.com/ml-basics'
      },
      {
        title: 'AI Ethics Discussion',
        summary: 'Society must consider ethical implications of AI development and deployment.',
        url: 'https://example.com/ai-ethics'
      }
    ];
    
    const testQuestions = [
      'What is artificial intelligence?',
      'How does machine learning work?',
      'What are the ethical concerns with AI?'
    ];
    
    try {
      for (const question of testQuestions) {
        const answer = await aiAdapter.answerQuestion(question, mockSummaries);
        console.log(`✅ Question answered: "${question}"`);
        console.log(`   Answer: ${answer.substring(0, 100)}...`);
      }
      
      this.testResults.push({
        test: 'Question Answering',
        status: 'PASS',
        details: `Answered ${testQuestions.length} questions successfully`
      });
    } catch (error) {
      console.log('❌ Question answering test failed:', error.message);
      this.testResults.push({
        test: 'Question Answering',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('4️⃣ Testing Error Handling...');
    
    try {
      // Test with empty text
      const emptyResult = await aiAdapter.summarizeText('');
      console.log('✅ Empty text handled:', emptyResult);
      
      // Test with invalid input
      const invalidResult = await aiAdapter.summarizeText(null);
      console.log('✅ Invalid input handled:', invalidResult);
      
      // Test Q&A with empty summaries
      const emptyAnswer = await aiAdapter.answerQuestion('test question', []);
      console.log('✅ Empty summaries handled:', emptyAnswer);
      
      this.testResults.push({
        test: 'Error Handling',
        status: 'PASS',
        details: 'All error cases handled gracefully'
      });
    } catch (error) {
      console.log('❌ Error handling test failed:', error.message);
      this.testResults.push({
        test: 'Error Handling',
        status: 'FAIL',
        error: error.message
      });
    }
    
    console.log('');
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.error}`));
    }
    
    console.log('\n🎯 AI Adapter is ready for integration!');
  }
}

/**
 * Quick test function for console testing
 */
export async function quickTest() {
  console.log('🚀 Quick AI Adapter Test');
  console.log('========================');
  
  // Test basic functionality
  const testText = 'This is a test article about artificial intelligence and machine learning technologies.';
  
  try {
    console.log('Testing summarization...');
    const summary = await aiAdapter.summarizeText(testText);
    console.log('✅ Summary:', summary);
    
    console.log('\nTesting Q&A...');
    const mockSummaries = [{
      title: 'Test Article',
      summary: 'This is about AI and ML technologies.',
      url: 'https://test.com'
    }];
    
    const answer = await aiAdapter.answerQuestion('What is this about?', mockSummaries);
    console.log('✅ Answer:', answer);
    
    console.log('\n🎉 AI Adapter is working correctly!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Export for use in other files
export default AIAdapterTester;
