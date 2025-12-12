import { categorizeError, ErrorType, retryWithBackoff } from '../errorHandling';

// Mock FirebaseError
class MockFirebaseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'FirebaseError';
  }
}

describe('errorHandling', () => {
  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('network request failed');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.retryable).toBe(true);
      expect(result.message).toContain('Network connection');
    });

    it('should categorize Firebase auth errors', () => {
      const error = new MockFirebaseError('auth/invalid-email', 'Invalid email');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.retryable).toBe(false);
      expect(result.message).toContain('Invalid email');
    });

    it('should categorize permission errors', () => {
      const error = new MockFirebaseError('permission-denied', 'Permission denied');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.PERMISSION);
      expect(result.retryable).toBe(false);
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(mockFn, 3, 10);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = new MockFirebaseError('auth/invalid-email', 'Invalid email');
      const mockFn = jest.fn().mockRejectedValue(authError);
      
      await expect(retryWithBackoff(mockFn, 3, 10)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('network error'));
      
      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow('network error');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});
