import { useEffect, useState, useCallback } from 'react';

interface UseDataRefreshOptions {
  onRefresh: () => Promise<void>;
  autoRefreshInterval?: number; // in seconds, null = disabled
  onError?: (error: Error) => void;
}

/**
 * Hook for managing data refresh with auto-refresh capability
 */
export const useDataRefresh = ({
  onRefresh,
  autoRefreshInterval,
  onError,
}: UseDataRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(
    autoRefreshInterval ? !!autoRefreshInterval : false
  );
  const [refreshError, setRefreshError] = useState<Error | null>(null);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      await onRefresh();
      setLastRefreshed(new Date());
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setRefreshError(err);
      onError?.(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, onError]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled || !autoRefreshInterval || autoRefreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      refresh();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval, refresh]);

  // Format last refreshed time
  const getLastRefreshedText = useCallback(() => {
    if (!lastRefreshed) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastRefreshed.toLocaleDateString();
  }, [lastRefreshed]);

  return {
    refresh,
    isRefreshing,
    lastRefreshed,
    getLastRefreshedText,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshError,
  };
};

/**
 * Hook for date range filtering
 */
export const useDateRangeFilter = (initialDays: number = 30) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - initialDays);

  const [dateRange, setDateRange] = useState({
    start: startDate,
    end: today,
  });

  const setStartDate = useCallback((date: Date) => {
    setDateRange((prev) => ({
      ...prev,
      start: date,
    }));
  }, []);

  const setEndDate = useCallback((date: Date) => {
    setDateRange((prev) => ({
      ...prev,
      end: date,
    }));
  }, []);

  const reset = useCallback(() => {
    const newToday = new Date();
    const newStart = new Date(newToday);
    newStart.setDate(newStart.getDate() - initialDays);
    setDateRange({
      start: newStart,
      end: newToday,
    });
  }, [initialDays]);

  const getDaysInRange = useCallback(() => {
    const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [dateRange]);

  return {
    dateRange,
    setDateRange,
    setStartDate,
    setEndDate,
    reset,
    getDaysInRange,
  };
};
