// Simple console test for SM-2 algorithm
// Run this in the browser console to verify the algorithm works

import { runSM2Tests, demonstrateSM2Usage } from './sm2Test';

// Function to run SM-2 tests in browser environment
export const testSM2InBrowser = async (): Promise<void> => {
  console.log('🚀 Starting SM-2 Algorithm Browser Tests...');
  
  try {
    // Run comprehensive test suite
    const testsPassedPassed = runSM2Tests();
    
    // Show usage demonstration
    demonstrateSM2Usage();
    
    if (testsPassedPassed) {
      console.log('\n✅ SM-2 Algorithm is ready for production use!');
    } else {
      console.log('\n❌ SM-2 Algorithm has issues that need to be resolved.');
    }
  } catch (error) {
    console.error('Error running SM-2 tests:', error);
  }
};

// Expose for manual testing
if (typeof window !== 'undefined') {
  (window as any).testSM2 = testSM2InBrowser;
  console.log('SM-2 test function available as window.testSM2()');
}

export default testSM2InBrowser;