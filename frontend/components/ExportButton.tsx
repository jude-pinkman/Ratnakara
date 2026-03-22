'use client';

import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import {
  exportChartAsImage,
  exportChartAsPDF,
  exportDataAsCSV,
  exportDataAsExcel,
  exportDataAsJSON,
} from '@/lib/chartExport';

type ExportFormat = 'png' | 'pdf' | 'csv' | 'excel' | 'json';

interface ExportButtonProps {
  data: any[];
  filename: string;
  formats?: ExportFormat[];
  chartRef?: React.RefObject<HTMLDivElement>;
  chartTitle?: string;
  disabled?: boolean;
}

/**
 * Reusable export button with multiple format options
 */
export const ExportButton = ({
  data,
  filename,
  formats = ['csv', 'excel', 'json'],
  chartRef,
  chartTitle,
  disabled = false,
}: ExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting || !data || data.length === 0) return;

    setIsExporting(true);

    try {
      switch (format) {
        case 'png':
          if (chartRef?.current) {
            await exportChartAsImage(chartRef.current, filename);
          }
          break;
        case 'pdf':
          if (chartRef?.current) {
            await exportChartAsPDF(chartRef.current, filename, chartTitle);
          }
          break;
        case 'csv':
          exportDataAsCSV(data, filename);
          break;
        case 'excel':
          exportDataAsExcel(data, filename);
          break;
        case 'json':
          exportDataAsJSON(data, filename);
          break;
      }
      setIsOpen(false);
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  const availableFormats = formats.filter((fmt) => {
    if ((fmt === 'png' || fmt === 'pdf') && !chartRef) return false;
    return true;
  });

  if (availableFormats.length === 0) {
    return null;
  }

  if (availableFormats.length === 1) {
    return (
      <button
        onClick={() => handleExport(availableFormats[0])}
        disabled={disabled || isExporting || !data || data.length === 0}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Export as ${availableFormats[0].toUpperCase()}`}
      >
        <Download className="w-4 h-4" />
        Export {availableFormats[0].toUpperCase()}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || !data || data.length === 0}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
          {availableFormats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={isExporting}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Export as {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
