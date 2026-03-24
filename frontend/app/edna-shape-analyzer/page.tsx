'use client';

import { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

// Types
interface PredictionResult {
  success: boolean;
  sequence: string;
  feature: string;
  predictions: Array<{
    position: number;
    base: string;
    value: number;
  }>;
  statistics: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
  confidence: number;
  processingTimeMs: number;
}

interface ComparisonResult {
  sequence1: string;
  sequence2: string;
  feature: string;
  difference: Array<{
    position: number;
    value1: number;
    value2: number;
    diff: number;
  }>;
}

const DNAShapeAnalyzer = () => {
  // State Management
  const [sequence, setSequence] = useState('');
  const [feature, setFeature] = useState('MGW');
  const [enableFL, setEnableFL] = useState(false);
  const [deepLayer, setDeepLayer] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [sequence2, setSequence2] = useState('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature groups
  const featureGroups = {
    'Groove Features': ['MGW', 'EP'],
    'Intra-base-pair Features': ['Shear', 'Stretch', 'Stagger', 'Buckle', 'ProT', 'Opening'],
    'Inter-base-pair Features': ['Shift', 'Slide', 'Rise', 'Tilt', 'Roll', 'HelT'],
  };

  // Load example sequence
  const handleLoadExample = () => {
    setSequence('CGCGAATTCGCGCGCGAATTCGCG');
    toast.success('Example DNA sequence loaded');
  };

  // Validate DNA sequence
  const validateSequence = (seq: string): boolean => {
    const cleanSeq = seq.toUpperCase().replace(/\s/g, '');
    if (cleanSeq.length === 0) {
      toast.error('Please enter a DNA sequence');
      return false;
    }
    if (!/^[ACGTN]+$/.test(cleanSeq)) {
      toast.error('Invalid characters. Only A, C, G, T, N are allowed');
      return false;
    }
    if (cleanSeq.length < 5) {
      toast.error('Sequence must be at least 5 bases long');
      return false;
    }
    return true;
  };

  // Run prediction
  const handlePrediction = async () => {
    if (!validateSequence(sequence)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/edna-shape/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: sequence.toUpperCase().replace(/\s/g, ''),
          feature,
          enableFL,
          deepLayer,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: PredictionResult = await response.json();
      setResult(data);
      toast.success(`Prediction complete (${data.processingTimeMs}ms)`);
    } catch (error: any) {
      toast.error(`Prediction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Compare two sequences
  const handleComparison = async () => {
    if (!validateSequence(sequence) || !validateSequence(sequence2)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/edna-shape/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence1: sequence.toUpperCase().replace(/\s/g, ''),
          sequence2: sequence2.toUpperCase().replace(/\s/g, ''),
          feature,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: ComparisonResult = await response.json();
      setComparisonResult(data);
      toast.success('Comparison complete');
    } catch (error: any) {
      toast.error(`Comparison failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('feature', feature);
    formData.append('deepLayer', deepLayer.toString());

    try {
      const response = await fetch('/api/edna-shape/batch-predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Predictions downloaded as CSV');
    } catch (error: any) {
      toast.error(`File upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export results as CSV
  const handleExport = () => {
    if (!result) {
      toast.error('No results to export');
      return;
    }

    const csvContent = [
      ['Position', 'Base', 'Shape Value'],
      ...result.predictions.map((p) => [p.position, p.base, p.value.toFixed(4)]),
      [],
      ['Statistics'],
      ['Min', result.statistics.min.toFixed(4)],
      ['Max', result.statistics.max.toFixed(4)],
      ['Mean', result.statistics.mean.toFixed(4)],
      ['Std Dev', result.statistics.std.toFixed(4)],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.feature}-predictions-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Results exported as CSV');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-600">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">🧬 Deep eDNA Shape Analyzer</h1>
          <p className="text-slate-600">
            Predict DNA structural shape features using deep learning. Analyze molecular signals
            for ecological insights and species identification.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* Left Panel: Input Controls */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setComparisonMode(false)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  !comparisonMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Single Sequence
              </button>
              <button
                onClick={() => setComparisonMode(true)}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  comparisonMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Compare
              </button>
            </div>

            {/* DNA Sequence Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📝 DNA Sequence{comparisonMode && ' 1'} (A, C, G, T, N)
              </label>
              <textarea
                value={sequence}
                onChange={(e) => setSequence(e.target.value)}
                placeholder="Enter DNA sequence (e.g., CGCGAATTCGCG)"
                className="w-full h-32 p-3 border-2 border-slate-300 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleLoadExample}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← Load Example
              </button>
            </div>

            {/* Comparison Mode: Second Sequence */}
            {comparisonMode && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  📝 DNA Sequence 2 (A, C, G, T, N)
                </label>
                <textarea
                  value={sequence2}
                  onChange={(e) => setSequence2(e.target.value)}
                  placeholder="Enter second DNA sequence"
                  className="w-full h-32 p-3 border-2 border-slate-300 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Feature Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">🔍 Select Feature</label>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {Object.entries(featureGroups).map(([group, features]) => (
                  <optgroup key={group} label={group}>
                    {features.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {feature === 'MGW' && '👉 Minor Groove Width'}
                {feature === 'EP' && '👉 Electrostatic Potential'}
                {feature === 'Shear' && '👉 Intra-base-pair shearing'}
                {feature === 'Stretch' && '👉 Intra-base-pair stretching'}
                {feature === 'Buckle' && '👉 Intra-base-pair buckling'}
                {feature === 'ProT' && '👉 Propeller twist angle'}
                {feature === 'Shift' && '👉 Inter-base-pair shift'}
                {feature === 'Slide' && '👉 Inter-base-pair slide'}
                {feature === 'Rise' && '👉 Rise per base pair'}
                {feature === 'Roll' && '👉 Roll angle'}
                {feature === 'HelT' && '👉 Helical twist'}
              </p>
            </div>

            {/* Options */}
            {!comparisonMode && (
              <>
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFL}
                      onChange={(e) => setEnableFL(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Enable Shape Fluctuation (FL)
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Include flexibility/variability estimates
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🏗️ Deep Layer
                  </label>
                  <select
                    value={deepLayer}
                    onChange={(e) => setDeepLayer(parseInt(e.target.value))}
                    className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {[2, 3, 4, 5].map((layer) => (
                      <option key={layer} value={layer}>
                        {layer} layers {layer === 4 ? '(default)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Deeper layers = more complex patterns, slower processing
                  </p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={comparisonMode ? handleComparison : handlePrediction}
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition ${
                  loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                {loading ? '⏳ Processing...' : comparisonMode ? '⚖️ Compare' : '▶️ Run Prediction'}
              </button>

              {!comparisonMode && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white transition ${
                    loading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 active:scale-95'
                  }`}
                >
                  📤 Upload & Download Predictions
                </button>
              )}

              {result && !comparisonMode && (
                <button
                  onClick={handleExport}
                  className="w-full py-3 px-4 rounded-lg font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition"
                >
                  💾 Export Results (CSV)
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".fasta,.fa,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Info Box */}
            {result && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm text-slate-700">
                  <strong>Sequence:</strong> {result.sequence.length} bp
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Processing:</strong> {result.processingTimeMs}ms
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="col-span-12 lg:col-span-8">
          {result && !comparisonMode && (
            <div className="space-y-6">
              {/* Graph */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">📈 Shape Profile</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.predictions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="position"
                      type="number"
                      domain={[1, result.predictions[result.predictions.length - 1]?.position || 1]}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => (typeof value === 'number' ? value.toFixed(4) : value)}
                      labelFormatter={(label) => `Position: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      dot={false}
                      strokeWidth={2}
                      name={result.feature}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <p className="text-xs text-slate-600 font-semibold">Minimum</p>
                  <p className="text-2xl font-bold text-blue-600">{result.statistics.min.toFixed(4)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <p className="text-xs text-slate-600 font-semibold">Maximum</p>
                  <p className="text-2xl font-bold text-green-600">{result.statistics.max.toFixed(4)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                  <p className="text-xs text-slate-600 font-semibold">Mean</p>
                  <p className="text-2xl font-bold text-purple-600">{result.statistics.mean.toFixed(4)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                  <p className="text-xs text-slate-600 font-semibold">Std Dev</p>
                  <p className="text-2xl font-bold text-orange-600">{result.statistics.std.toFixed(4)}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">📊 Detailed Predictions</h2>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-slate-700">Position</th>
                        <th className="px-4 py-2 text-left font-bold text-slate-700">Base</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-700">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.predictions.map((pred, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-4 py-2 text-slate-700">{pred.position}</td>
                          <td className="px-4 py-2 font-mono font-bold text-blue-600">{pred.base}</td>
                          <td className="px-4 py-2 text-right text-slate-700">
                            {pred.value.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {comparisonResult && (
            <div className="space-y-6">
              {/* Comparison Graph */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">⚖️ Shape Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonResult.difference}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="position" type="number" />
                    <YAxis />
                    <Tooltip formatter={(value) => (typeof value === 'number' ? value.toFixed(4) : value)} />
                    <Legend />
                    <Bar dataKey="value1" fill="#3b82f6" name="Sequence 1" />
                    <Bar dataKey="value2" fill="#ef4444" name="Sequence 2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Difference Table */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">📊 Difference Analysis</h2>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-slate-700">Pos</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-700">Seq 1</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-700">Seq 2</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-700">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.difference.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-4 py-2">{row.position}</td>
                          <td className="px-4 py-2 text-right text-blue-600">{row.value1.toFixed(4)}</td>
                          <td className="px-4 py-2 text-right text-red-600">{row.value2.toFixed(4)}</td>
                          <td className={`px-4 py-2 text-right font-bold ${row.diff > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {row.diff > 0 ? '+' : ''}{row.diff.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!result && !comparisonResult && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <p className="text-slate-500 text-lg mb-4">📊 Enter a DNA sequence and click "Run Prediction" to see results</p>
              <p className="text-slate-400 text-sm">Predictions will appear here with visualizations and detailed data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DNAShapeAnalyzer;
