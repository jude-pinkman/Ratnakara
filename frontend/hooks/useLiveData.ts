import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLiveDataOptions<T> {
  fetchFn: () => Promise<{ data: T }>;
  interval?: number; // milliseconds
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseLiveDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for polling data at regular intervals
 * @param fetchFn - Function that fetches the data
 * @param interval - Polling interval in milliseconds (default: 30000 = 30 seconds)
 * @param enabled - Whether polling is enabled (default: true)
 * @param onSuccess - Callback when data is fetched successfully
 * @param onError - Callback when an error occurs
 */
export function useLiveData<T>({
  fetchFn,
  interval = 30000,
  enabled = true,
  onSuccess,
  onError,
}: UseLiveDataOptions<T>): UseLiveDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchFn();

      if (isMountedRef.current) {
        setData(response.data);
        setLastUpdate(new Date());
        setLoading(false);
        onSuccess?.(response.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error('Failed to fetch data');
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    }
  }, [fetchFn, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Set up polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch: fetchData,
  };
}

/**
 * Hook for live ocean data with 30-second polling
 */
export function useLiveOceanData() {
  return useLiveData({
    fetchFn: async () => {
      const response = await fetch('http://localhost:3001/api/ocean?limit=100');
      return response.json();
    },
    interval: 30000, // 30 seconds
  });
}

/**
 * Hook for live fisheries data with 30-second polling
 */
export function useLiveFisheriesData() {
  return useLiveData({
    fetchFn: async () => {
      const response = await fetch('http://localhost:3001/api/fisheries?limit=100');
      return response.json();
    },
    interval: 30000,
  });
}

/**
 * Hook for live eDNA data with 30-second polling
 */
export function useLiveEdnaData() {
  return useLiveData({
    fetchFn: async () => {
      const response = await fetch('http://localhost:3001/api/edna?limit=100');
      return response.json();
    },
    interval: 30000,
  });
}

/**
 * Hook for live correlation data with 60-second polling
 */
export function useLiveCorrelationData() {
  return useLiveData({
    fetchFn: async () => {
      const response = await fetch('http://localhost:3001/api/correlation');
      return response.json();
    },
    interval: 60000, // 1 minute
  });
}
