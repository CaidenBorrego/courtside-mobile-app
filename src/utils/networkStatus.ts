import { useEffect, useState } from 'react';

/**
 * Hook to monitor network connectivity status
 * Uses a simple polling mechanism to check connectivity
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | number;

    const checkConnection = async () => {
      try {
        const online = await isNetworkAvailable();
        setIsOnline(online);
      } catch {
        setIsOnline(false);
      }
    };

    // Check immediately
    checkConnection();

    // Poll every 10 seconds
    intervalId = setInterval(checkConnection, 10000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return {
    isConnected: isOnline,
    isInternetReachable: isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Check if network is available by attempting a lightweight request
 */
async function isNetworkAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<{
  isConnected: boolean;
  isInternetReachable: boolean;
  isOffline: boolean;
}> {
  const isOnline = await isNetworkAvailable();

  return {
    isConnected: isOnline,
    isInternetReachable: isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Wait for network connection to be restored
 */
export function waitForConnection(timeout: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConnection = async () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        resolve(false);
        return;
      }

      const isOnline = await isNetworkAvailable();
      
      if (isOnline) {
        resolve(true);
      } else {
        setTimeout(checkConnection, 2000);
      }
    };

    checkConnection();
  });
}
