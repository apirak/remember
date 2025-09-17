// Global type declarations for the flashcard application

/// <reference types="astro/client" />

// Extend the global Window interface for potential debugging
declare global {
  interface Window {
    // Firebase app instance for debugging
    firebaseApp?: any;
    // Development mode flag
    __DEV__?: boolean;
  }
}

// Module declarations for JSON imports
declare module "*.json" {
  const value: any;
  export default value;
}

// Environment variables type safety
interface ImportMetaEnv {
  readonly PUBLIC_FIREBASE_API_KEY?: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Export empty object to make this a module
export {};