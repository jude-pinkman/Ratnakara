'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onReset?: () => void;
  maxDays?: number;
  label?: string;
}

/**
 * Reusable date range filter component with calendar inputs
 */
export const DateRangeFilter = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  maxDays = 365,
  label = 'Date Range',
}: DateRangeFilterProps) => {
  const [showValidationError, setShowValidationError] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    if (newDate <= endDate) {
      onStartDateChange(newDate);
      setShowValidationError(false);
    } else {
      setShowValidationError(true);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T23:59:59');
    if (newDate >= startDate) {
      onEndDateChange(newDate);
      setShowValidationError(false);
    } else {
      setShowValidationError(true);
    }
  };

  const daysInRange = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const exceedsMax = daysInRange > maxDays;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">From</label>
          <input
            type="date"
            value={formatDate(startDate)}
            onChange={handleStartDateChange}
            className="input text-sm py-2"
            max={formatDate(endDate)}
          />
        </div>

        <span className="text-gray-400 text-lg mt-6">→</span>

        <div>
          <label className="text-xs text-gray-500 block mb-1">To</label>
          <input
            type="date"
            value={formatDate(endDate)}
            onChange={handleEndDateChange}
            className="input text-sm py-2"
            min={formatDate(startDate)}
            max={formatDate(new Date())}
          />
        </div>

        <div className="mt-6 text-sm text-gray-600">
          ({daysInRange} days)
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="btn-secondary-small mt-6 p-2 hover:bg-gray-200 rounded"
            title="Reset to default"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showValidationError && (
        <div className="text-sm text-red-600">
          ⚠️ Start date must be before end date
        </div>
      )}

      {exceedsMax && (
        <div className="text-sm text-amber-600">
          ⚠️ Date range exceeds {maxDays} days
        </div>
      )}
    </div>
  );
};
