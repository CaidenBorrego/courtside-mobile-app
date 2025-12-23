import { useEffect, useState, useRef } from 'react';
import { Unsubscribe } from 'firebase/firestore';

/**
 * Hook to manage Firestore real-time listeners with automatic cleanup
 */
export function useFirestoreListener<T>(
  listenerFn: (callback: (data: T) => void, errorCallback?: (error: Error) => void) => Unsubscribe,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Set up the listener
    unsubscribeRef.current = listenerFn(
      (newData) => {
        setData(newData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, deps);

  return { data, loading, error };
}

/**
 * Hook to manage conditional Firestore listeners
 * Only subscribes when condition is true
 */
export function useConditionalFirestoreListener<T>(
  condition: boolean,
  listenerFn: (callback: (data: T) => void, errorCallback?: (error: Error) => void) => Unsubscribe,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!condition) {
      // Clean up existing listener if condition becomes false
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up the listener
    unsubscribeRef.current = listenerFn(
      (newData) => {
        setData(newData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [condition, ...deps]);

  return { data, loading, error };
}
