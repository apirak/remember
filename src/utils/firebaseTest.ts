// Firebase configuration test utility
// This file can be used to verify Firebase setup is working correctly

import { app, checkFirebaseConnection, firebaseConfig } from './firebase';
import { auth } from './firebase';
import { firestore } from './firebase';

// Test Firebase configuration
export const testFirebaseConfig = (): boolean => {
  try {
    // Check if all required config properties are present
    const requiredProps = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingProps = requiredProps.filter(prop => !firebaseConfig[prop as keyof typeof firebaseConfig]);
    
    if (missingProps.length > 0) {
      console.error('Missing Firebase config properties:', missingProps);
      return false;
    }
    
    // Check if Firebase app is initialized
    if (!app) {
      console.error('Firebase app not initialized');
      return false;
    }
    
    // Check if auth service is available
    if (!auth) {
      console.error('Firebase Auth not initialized');
      return false;
    }
    
    // Check if firestore service is available
    if (!firestore) {
      console.error('Firebase Firestore not initialized');
      return false;
    }
    
    console.log('✅ Firebase configuration test passed');
    console.log('📱 Project ID:', firebaseConfig.projectId);
    console.log('🔐 Auth Domain:', firebaseConfig.authDomain);
    
    return true;
  } catch (error) {
    console.error('❌ Firebase configuration test failed:', error);
    return false;
  }
};

// Test Firebase connectivity
export const testFirebaseConnectivity = async (): Promise<boolean> => {
  try {
    const isConnected = await checkFirebaseConnection();
    
    if (isConnected) {
      console.log('✅ Firebase connectivity test passed');
    } else {
      console.log('❌ Firebase connectivity test failed');
    }
    
    return isConnected;
  } catch (error) {
    console.error('❌ Firebase connectivity test error:', error);
    return false;
  }
};

// Run all Firebase tests
export const runFirebaseTests = async (): Promise<boolean> => {
  console.log('🚀 Running Firebase configuration tests...');
  
  const configTest = testFirebaseConfig();
  const connectivityTest = await testFirebaseConnectivity();
  
  const allTestsPassed = configTest && connectivityTest;
  
  if (allTestsPassed) {
    console.log('🎉 All Firebase tests passed! Ready to use Firebase services.');
  } else {
    console.log('⚠️  Some Firebase tests failed. Please check the configuration.');
  }
  
  return allTestsPassed;
};

// Export for use in development
export default {
  testFirebaseConfig,
  testFirebaseConnectivity,
  runFirebaseTests
};