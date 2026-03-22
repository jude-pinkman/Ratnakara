'use client';

import { RefreshCw, Clock } from 'lucide-react';
import { useState } from 'react';

interface RefreshControlProps {
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  lastRefreshed?: string;
  autoRefreshInterval?: number; // in seconds
  onAutoRefreshToggle?: (enabled: boolean) => void;
  autoRefreshEnabled?: boolean;
}

/**
 * Reusable refresh control component with manual and auto-refresh options
 */
export const RefreshControl = ({
  onRefresh,
  isRefreshing = false,
  lastRefreshed,
  autoRefreshInterval,
  onAutoRefreshToggle,
  autoRefreshEnabled = false,
}: RefreshControlProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    if (isLoading || isRefreshing) return;
    setIsLoading(true);
    try {
      await onRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={isLoading || isRefreshing}
        className="btn-secondary flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title="Refresh data"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </button>

      {autoRefreshInterval && onAutoRefreshToggle && (
        <button
          onClick={() => onAutoRefreshToggle(!autoRefreshEnabled)}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
            autoRefreshEnabled
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={`Auto-refresh every ${autoRefreshInterval}s`}
        >
          <Clock className="w-4 h-4" />
          {autoRefreshEnabled ? `Auto (${autoRefreshInterval}s)` : 'Auto-off'}
        </button>
      )}

      {lastRefreshed && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <span>Updated:</span>
          <span className="font-medium">{lastRefreshed}</span>
        </span>
      )}
    </div>
  );
};
