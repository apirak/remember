// Error handling utilities for the flashcard application
// Provides user-friendly error messages and retry mechanisms

import { isFirebaseError, getFirebaseErrorMessage } from './firebase';

// Application error types
export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: Date;
  context?: any;
}

// Error categories
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  AUTH: 'auth',
  FIRESTORE: 'firestore',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
} as const;

export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];

// Create a standardized application error
export const createAppError = (
  code: string,
  message: string,
  retryable: boolean = false,
  context?: any
): AppError => ({
  code,
  message,
  retryable,
  timestamp: new Date(),
  context
});

// Determine error category based on error code
export const getErrorCategory = (error: any): ErrorCategory => {
  if (isFirebaseError(error)) {
    if (error.code.startsWith('auth/')) {
      return ERROR_CATEGORIES.AUTH;
    }
    if (error.code.includes('network') || error.code.includes('unavailable')) {
      return ERROR_CATEGORIES.NETWORK;
    }
    return ERROR_CATEGORIES.FIRESTORE;
  }
  
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
    return ERROR_CATEGORIES.NETWORK;
  }
  
  if (error.code === 'VALIDATION_ERROR') {
    return ERROR_CATEGORIES.VALIDATION;
  }
  
  return ERROR_CATEGORIES.UNKNOWN;
};

// Determine error severity
export const getErrorSeverity = (error: any): ErrorSeverity => {
  const category = getErrorCategory(error);
  
  switch (category) {
    case ERROR_CATEGORIES.NETWORK:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_CATEGORIES.AUTH:
      return ERROR_SEVERITY.HIGH;
    case ERROR_CATEGORIES.FIRESTORE:
      return ERROR_SEVERITY.MEDIUM;
    case ERROR_CATEGORIES.VALIDATION:
      return ERROR_SEVERITY.LOW;
    default:
      return ERROR_SEVERITY.MEDIUM;
  }
};

// Check if an error is retryable
export const isRetryableError = (error: any): boolean => {
  if (isFirebaseError(error)) {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'internal',
      'network-request-failed',
      'too-many-requests'
    ];
    return retryableCodes.some(code => error.code.includes(code));
  }
  
  return error.retryable === true || error.code === 'NETWORK_ERROR';
};

// Get user-friendly error message
export const getUserFriendlyMessage = (error: any): string => {
  if (isFirebaseError(error)) {
    return getFirebaseErrorMessage(error);
  }
  
  // Custom application errors
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Please check your internet connection and try again.';
    case 'VALIDATION_ERROR':
      return error.message || 'Please check your input and try again.';
    case 'SESSION_EXPIRED':
      return 'Your session has expired. Please sign in again.';
    case 'INSUFFICIENT_PERMISSIONS':
      return 'You don\'t have permission to perform this action.';
    case 'QUOTA_EXCEEDED':
      return 'Usage limit exceeded. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Retry mechanism with exponential backoff
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable or it's the last attempt
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Error logging utility
export const logError = (error: any, context?: string): void => {
  const category = getErrorCategory(error);
  const severity = getErrorSeverity(error);
  const message = getUserFriendlyMessage(error);
  
  // In development, log to console
  if (import.meta.env.DEV) {
    console.group(`🚨 Error [${severity.toUpperCase()}] - ${category}`);
    console.error('Message:', message);
    console.error('Error:', error);
    if (context) console.log('Context:', context);
    console.groupEnd();
  }
  
  // In production, you might want to send to a logging service
  // Example: 
  // const logData = {
  //   timestamp: new Date().toISOString(),
  //   category,
  //   severity,
  //   code: error.code || 'UNKNOWN',
  //   message,
  //   context,
  //   stack: error.stack,
  //   retryable: isRetryableError(error)
  // };
  // sendToLoggingService(logData);
};

// Network connectivity checker
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined') return true;
  
  // Check navigator.onLine first
  if (!navigator.onLine) return false;
  
  try {
    // Try to fetch a small resource to verify connectivity
    await fetch('/favicon.svg', { 
      method: 'HEAD',
      cache: 'no-cache',
      mode: 'no-cors'
    });
    return true;
  } catch {
    return false;
  }
};

// Global error boundary helper
export const handleGlobalError = (error: any, errorInfo?: any): void => {
  logError(error, 'Global Error Boundary');
  
  // You might want to show a global error toast or modal here
  console.error('Global error caught:', error, errorInfo);
};

// Validation error helper
export const createValidationError = (field: string, message: string): AppError => {
  return createAppError(
    'VALIDATION_ERROR',
    message,
    false,
    { field }
  );
};

// Network error helper
export const createNetworkError = (message?: string): AppError => {
  return createAppError(
    'NETWORK_ERROR',
    message || 'Network connection failed',
    true
  );
};

// Export error handling utilities as default
export default {
  createAppError,
  getErrorCategory,
  getErrorSeverity,
  isRetryableError,
  getUserFriendlyMessage,
  retryOperation,
  logError,
  checkNetworkConnectivity,
  handleGlobalError,
  createValidationError,
  createNetworkError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY
};