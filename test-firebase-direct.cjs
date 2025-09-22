// Direct Firebase test script
// Run with: node test-firebase-direct.js

const path = require('path');

// Import built modules (if available)
async function testFirebaseConnection() {
  try {
    console.log('🔥 Testing Firebase connection directly...\n');
    
    // Try to import from built files first, then source
    let FlashcardService;
    try {
      console.log('Trying to import from built files...');
      const builtModule = require('./dist/_astro/client.BBKXMyYs.js');
      console.log('Built module keys:', Object.keys(builtModule));
      FlashcardService = builtModule.FlashcardService;
    } catch (buildError) {
      console.log('Build import failed:', buildError.message);
      console.log('Falling back to source files...');
      
      // This won't work in Node.js directly due to TypeScript/ES modules
      console.log('❌ Cannot import TypeScript modules directly in Node.js');
      console.log('We need to use the test environment instead.');
      return;
    }

    if (!FlashcardService) {
      console.log('❌ FlashcardService not found in imports');
      return;
    }

    console.log('✅ FlashcardService imported successfully');
    
    // Test the service
    const result = await FlashcardService.loadCardSetData(
      'test_direct_nodejs', 
      'business_chinese.json'
    );
    
    console.log('📊 Test Result:', {
      success: result.success,
      source: result.data?.source,
      cardCount: result.data?.cards?.length,
      error: result.error
    });

    if (result.success && result.data?.cards?.length > 0) {
      console.log('🎉 SUCCESS! Cards were created in Firebase');
      console.log('First card:', {
        id: result.data.cards[0].id,
        cardSetId: result.data.cards[0].cardSetId,
        frontTitle: result.data.cards[0].front.title
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Alternative: Create a simpler test using the web interface
function suggestWebTest() {
  console.log('\n🌐 Alternative: Web-based test');
  console.log('Since Node.js direct testing is complex, try this:');
  console.log('');
  console.log('1. Start dev server: pnpm run dev');
  console.log('2. Open: http://localhost:4321/db-test');
  console.log('3. Sign in with Google');
  console.log('4. Open browser console (F12)');
  console.log('5. Run this code:');
  console.log('');
  console.log(`
// Paste this in browser console:
import('/src/services/flashcardService.ts').then(module => {
  const { FlashcardService } = module;
  
  console.log('Testing card creation...');
  
  FlashcardService.loadCardSetData('browser_test_set', 'business_chinese.json')
    .then(result => {
      console.log('✅ Result:', {
        success: result.success,
        source: result.data?.source,
        cardCount: result.data?.cards?.length,
        error: result.error
      });
      
      if (result.success) {
        console.log('🎉 Check Firebase Console!');
        console.log('Path: users/[your-id]/cardSets/browser_test_set/cards');
      }
    })
    .catch(err => console.error('❌ Error:', err));
});
  `);
}

// Run the test
testFirebaseConnection().then(() => {
  suggestWebTest();
});