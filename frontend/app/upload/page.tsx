'use client';

import { useState } from 'react';
import { Upload, FileUp, CheckCircle2, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    newFiles.forEach(file => {
      if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type) && !file.name.endsWith('.csv')) {
        toast.error(`${file.name} is not a valid CSV or Excel file`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 50MB)`);
        return;
      }
      setFiles(prev => [...prev, file]);
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const analyzeData = async () => {
    if (files.length === 0) {
      toast.error('Please select a file first');
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const response = await fetch('http://localhost:3001/api/upload/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (data.success) {
        setResults({
          fileName: data.data.fileName,
          records: data.data.recordsParsed,
          analysis: data.data.analysis,
          insights: data.data.insights,
        });
        toast.success('Data imported successfully!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process upload');
      console.error('Upload error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Your Data</h1>
          <p className="text-gray-500 mt-2">Upload CSV or Excel files for automated analysis and insights</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="bg-white border-2 border-dashed border-blue-200 rounded-xl p-12 text-center hover:border-blue-400 transition cursor-pointer"
        >
          <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Drag & drop your data</h2>
          <p className="text-gray-500 mb-6">or click to browse CSV/Excel files</p>
          <label className="inline-block">
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium">
              Select Files
            </span>
          </label>
          <p className="text-xs text-gray-400 mt-4">Supported formats: CSV, Excel | Max file size: 50MB</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Selected Files ({files.length})</h3>
            <div className="space-y-3">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileUp className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-2 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={analyzeData}
              disabled={analyzing}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
            >
              {analyzing ? 'Analyzing...' : 'Analyze Data'}
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <h3 className="text-2xl font-bold text-green-900">Import Successful!</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-600">Records Parsed</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">{results.records}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-600">Ocean Records</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{results.analysis?.summary?.oceanCount || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-600">Fisheries Records</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">{results.analysis?.summary?.fisheriesCount || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <p className="text-sm text-gray-600">eDNA Records</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{results.analysis?.summary?.ednaCount || 0}</p>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-4">Import Summary</h4>
              <div className="space-y-3">
                {results.insights?.details?.map((detail: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-700">{detail}</p>
                  </div>
                ))}
                {results.insights?.message && (
                  <div className="flex items-center gap-3 p-4 bg-green-100 rounded-lg border border-green-300">
                    <CheckCircle2 className="w-5 h-5 text-green-700" />
                    <p className="text-sm font-medium text-green-700">{results.insights.message}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  toast.success('Data has been imported to your dashboard');
                  setResults(null);
                  setFiles([]);
                }}
                className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                View Updated Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">📋 Expected Format</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ First row as headers</li>
              <li>✓ Consistent data types per column</li>
              <li>✓ Species / location columns recommended</li>
              <li>✓ Date format: YYYY-MM-DD</li>
              <li>✓ Numeric values without currency symbols</li>
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-900 mb-4">🎯 Data Types Supported</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>🐟 Fisheries data (species, abundance, biomass)</li>
              <li>🌊 Oceanographic (temperature, salinity, pH)</li>
              <li>🧬 eDNA data (concentration, confidence)</li>
              <li>📊 Environmental correlations</li>
              <li>🗺️ Geospatial coordinates (lat/lng)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
