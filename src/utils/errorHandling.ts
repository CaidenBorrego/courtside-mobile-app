import { FirebaseError } from 'firebase/app';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Categorizes Firebase and network errors into user-friendly error types
 */
export function categorizeError(error: unknown): AppError {
  // Check if it's a FirebaseError (by checking for code property)
  if (error instanceof FirebaseError || (error instanceof Error && 'code' in error)) {
    return categorizeFirebaseError(error as FirebaseError);
  }

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: 'Network connection issue. Please check your internet connection.',
        originalError: error,
        retryable: true,
      };
    }

    // Generic error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred',
      originalError: error,
      retryable: false,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    retryable: false,
  };
}

/**
 * Categorizes Firebase-specific errors
 */
function categorizeFirebaseError(error: FirebaseError): AppError {
  const code = error.code;

  // Authentication errors
  if (code.startsWith('auth/')) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: getAuthErrorMessage(code),
      originalError: error,
      retryable: false,
    };
  }

  // Permission errors
  if (code === 'permission-denied' || code.includes('permission')) {
    return {
      type: ErrorType.PERMISSION,
      message: 'You do not have permission to perform this action',
      originalError: error,
      retryable: false,
    };
  }

  // Not found errors
  if (code === 'not-found' || code.includes('not-found')) {
    return {
      type: ErrorType.NOT_FOUND,
      message: 'The requested resource was not found',
      originalError: error,
      retryable: false,
    };
  }

  // Network/unavailable errors
  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code.includes('network')
  ) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network connection issue. Please check your internet connection.',
      originalError: error,
      retryable: true,
    };
  }

  // Default Firebase error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'An error occurred with the database',
    originalError: error,
    retryable: false,
  };
}

/**
 * Returns user-friendly messages for Firebase Auth errors
 */
function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection';
    default:
      return 'Authentication failed. Please try again';
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const appError = categorizeError(error);

      // Don't retry if error is not retryable
      if (!appError.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Wraps async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = categorizeError(error);
    console.error(errorMessage || 'Operation failed:', appError);
    throw new Error(appError.message);
  }
}
