import { renderHook, waitFor } from '@testing-library/react-native';
import { useFirestoreListener, useConditionalFirestoreListener } from '../useFirestoreListener';

describe('useFirestoreListener', () => {
  it('should set up listener and receive data', async () => {
    const mockData = { id: '1', name: 'Test' };
    const mockUnsubscribe = jest.fn();
    const mockListenerFn = jest.fn((callback) => {
      callback(mockData);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useFirestoreListener(mockListenerFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockListenerFn).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const mockError = new Error('Listener error');
    const mockUnsubscribe = jest.fn();
    const mockListenerFn = jest.fn((callback, errorCallback) => {
      if (errorCallback) {
        errorCallback(mockError);
      }
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useFirestoreListener(mockListenerFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should cleanup listener on unmount', () => {
    const mockUnsubscribe = jest.fn();
    const mockListenerFn = jest.fn(() => mockUnsubscribe);

    const { unmount } = renderHook(() => useFirestoreListener(mockListenerFn));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('useConditionalFirestoreListener', () => {
  it('should not set up listener when condition is false', () => {
    const mockListenerFn = jest.fn();

    renderHook(() => useConditionalFirestoreListener(false, mockListenerFn));

    expect(mockListenerFn).not.toHaveBeenCalled();
  });

  it('should set up listener when condition is true', async () => {
    const mockData = { id: '1', name: 'Test' };
    const mockUnsubscribe = jest.fn();
    const mockListenerFn = jest.fn((callback) => {
      callback(mockData);
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => 
      useConditionalFirestoreListener(true, mockListenerFn)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(mockListenerFn).toHaveBeenCalled();
  });

  it('should cleanup listener when condition changes to false', () => {
    const mockUnsubscribe = jest.fn();
    const mockListenerFn = jest.fn(() => mockUnsubscribe);

    const { rerender } = renderHook(
      (props: { condition: boolean }) => useConditionalFirestoreListener(props.condition, mockListenerFn),
      { initialProps: { condition: true } }
    );

    rerender({ condition: false });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
