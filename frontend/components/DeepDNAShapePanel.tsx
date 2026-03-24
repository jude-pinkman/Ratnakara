'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

// Type definitions
interface SequenceData {
  id: string;
  sequence: string;
  predictions: Array<{
    position: number;
    base: string;
    value: number;
  }>;
}

interface ShapeResult {
  success: boolean;
  sequences: SequenceData[];
  feature: string;
  fluctuation: boolean;
  layer: number;
  statistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  confidence: number;
  processingTime: number;
}

interface SpeciesResult {
  species: string;
  probability: number;
  confidence: number;
}

interface EcologicalMetrics {
  biodiversityIndex: number;
  speciesRichness: number;
  anomalyScore: number;
  dominantCluster: string;
}

type PlotType = 'line' | 'boxplot';

const DeepDNAShapePanel: React.FC = () => {
  // State Management
  const [dnaInput, setDnaInput] = useState('ACGNTAGT');
  const [feature, setFeature] = useState('MGW');
  const [fluctuation, setFluctuation] = useState(false);
  const [layer, setLayer] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShapeResult | null>(null);
  const [plotType, setPlotType] = useState<PlotType>('line');
  const [fileError, setFileError] = useState('');
  const [speciesResults, setSpeciesResults] = useState<SpeciesResult[]>([]);
  const [ecologicalMetrics, setEcologicalMetrics] = useState<EcologicalMetrics | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feature groups (matching DeepDNAshape website)
  const featureGroups = {
    'Groove Features': ['MGW', 'EP'],
    'Intra-base-pair Features': ['Shear', 'Stretch', 'Stagger', 'Buckle', 'ProT', 'Opening'],
    'Inter-base-pair Features': ['Shift', 'Slide', 'Rise', 'Tilt', 'Roll', 'HelT'],
  };

  // Features that don't support fluctuation
  const noFluctuationFeatures = ['EP'];

  // Load example sequences
  const handleLoadExample = () => {
    const examples = 'ACGNTAGT';
    setDnaInput(examples);
    callPredictionAPI(parseSequences(examples));
    toast.success('Example sequences loaded');
  };

  // Match webserver behavior: keep prediction synced with controls when sequence exists
  useEffect(() => {
    const sequences = parseSequences(dnaInput);
    if (sequences.length > 0) {
      callPredictionAPI(sequences);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, layer, fluctuation]);

  // Initial render prediction for default sample
  useEffect(() => {
    const sequences = parseSequences('ACGNTAGT');
    callPredictionAPI(sequences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate DNA sequence
  const validateDNA = (seq: string): boolean => {
    const cleanSeq = seq.toUpperCase().replace(/\s/g, '');
    return /^[ACGTN]+$/.test(cleanSeq) && cleanSeq.length >= 1;
  };

  // Parse multiple sequences from input
  const parseSequences = (input: string): string[] => {
    return input
      .split('\n')
      .map((line) => line.trim().toUpperCase().replace(/\s/g, ''))
      .filter((seq) => seq.length > 0 && validateDNA(seq));
  };

  // Real-time prediction with debounce
  const handleDNAChange = useCallback(
    (value: string) => {
      setDnaInput(value);

      // Clear previous timer
      if (debounceTimer) clearTimeout(debounceTimer);

      // Set new timer for debounced API call
      const timer = setTimeout(() => {
        const sequences = parseSequences(value);
        if (sequences.length > 0 && sequences.length <= 100) {
          callPredictionAPI(sequences);
        } else if (sequences.length > 100) {
          toast.error('Maximum 100 sequences allowed for real-time prediction');
        }
      }, 500);

      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // Call prediction API
  const callPredictionAPI = async (sequences: string[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/edna/deep-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequences,
          feature,
          fluctuation: fluctuation && !noFluctuationFeatures.includes(feature),
          layer,
          mode: 'predict',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const data: ShapeResult = await response.json();
      setResult(data);
      setFileError('');

      // Calculate species and ecological metrics
      if (data.sequences.length > 0) {
        await fetchSpeciesClassification(data.sequences);
        await fetchEcologicalMetrics(data.sequences);
      }

      toast.success(`Predicted ${data.sequences.length} sequence(s)`);
    } catch (error: any) {
      setFileError(error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch species classification
  const fetchSpeciesClassification = async (sequences: SequenceData[]) => {
    try {
      const response = await fetch('/api/edna/deep-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequences: sequences.map((s) => s.sequence),
          feature,
          mode: 'species-classify',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSpeciesResults(data.species || []);
      }
    } catch (error) {
      console.error('Species classification error:', error);
    }
  };

  // Fetch ecological metrics
  const fetchEcologicalMetrics = async (sequences: SequenceData[]) => {
    try {
      const response = await fetch('/api/edna/deep-shape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequences: sequences.map((s) => s.sequence),
          mode: 'ecological-metrics',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ecological metrics response:', data);
        // Extract only the metrics fields
        if (data.biodiversityIndex !== undefined || data.success) {
          setEcologicalMetrics({
            biodiversityIndex: typeof data.biodiversityIndex === 'number' ? data.biodiversityIndex : 0,
            speciesRichness: typeof data.speciesRichness === 'number' ? data.speciesRichness : 0,
            anomalyScore: typeof data.anomalyScore === 'number' ? data.anomalyScore : 0,
            dominantCluster: data.dominantCluster || 'Unknown',
          });
        } else {
          console.warn('No metrics in response:', data);
        }
      }
    } catch (error) {
      console.error('Ecological metrics error:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.txt', '.fa', '.fasta'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setFileError('Only .txt, .fa, and .fasta files are supported');
      toast.error('Invalid file type');
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const sequences = parseSequences(content);

        if (sequences.length === 0) {
          throw new Error('No valid sequences found in file');
        }

        if (sequences.length > 1000000) {
          throw new Error('File contains more than 1,000,000 sequences');
        }

        // Call batch prediction API
        const response = await fetch('/api/edna/deep-shape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sequences,
            feature,
            fluctuation: fluctuation && !noFluctuationFeatures.includes(feature),
            layer,
            mode: 'batch',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Batch processing failed');
        }

        // Download CSV
        const csvBlob = await response.blob();
        const url = URL.createObjectURL(csvBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deep-shape-predictions-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Processed ${sequences.length} sequences`);
        setFileError('');
      } catch (error: any) {
        setFileError(error.message);
        toast.error(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setFileError('Failed to read file');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Export results as PNG
  const handleExportPNG = async () => {
    if (!result) {
      toast.error('No results to export');
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const chartElement = document.getElementById('dna-shape-chart');

      if (!chartElement) {
        toast.error('Chart not found');
        return;
      }

      const canvas = await html2canvas(chartElement);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `deep-shape-${result.feature}-${Date.now()}.png`;
      link.click();

      toast.success('Chart exported as PNG');
    } catch (error) {
      toast.error('Failed to export PNG');
    }
  };

  // Export results as CSV
  const handleExportCSV = () => {
    if (!result || !result.sequences.length) {
      toast.error('No results to export');
      return;
    }

    const csvRows = ['sequence_id,position,base,value'];

    result.sequences.forEach((seq) => {
      seq.predictions.forEach((pred) => {
        csvRows.push(`${seq.id},${pred.position},${pred.base},${pred.value.toFixed(4)}`);
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep-shape-${result.feature}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Results exported as CSV');
  };

  const getPlotlyFigure = () => {
    if (!result || !result.sequences.length) {
      return { data: [], layout: {} };
    }

    const featureUnits: Record<string, string> = {
      MGW: '(A)',
      EP: '(kT/e)',
      Shear: '(A)',
      Stretch: '(A)',
      Stagger: '(A)',
      Buckle: '(deg)',
      ProT: '(deg)',
      Opening: '(deg)',
      Shift: '(A)',
      Slide: '(A)',
      Rise: '(A)',
      Tilt: '(deg)',
      Roll: '(deg)',
      HelT: '(deg)',
    };

    const data = plotType === 'line'
      ? result.sequences.map((seq, idx) => {
          const x = seq.predictions.map((p) => p.position - 1);
          const y = seq.predictions.map((p) => p.value);
          return {
            x,
            y,
            type: 'scatter',
            mode: 'lines+markers',
            name: seq.id,
            line: { color: colors[idx % colors.length], width: 2 },
            marker: { size: 5 },
            error_y: fluctuation
              ? {
                  type: 'data',
                  array: y.map(() => Math.max(result.statistics.std * 0.3, 0.05)),
                  visible: true,
                }
              : undefined,
          };
        })
      : result.sequences.map((seq, idx) => ({
          y: seq.predictions.map((p) => p.value),
          type: 'box',
          name: seq.id,
          marker: { color: colors[idx % colors.length] },
          boxpoints: 'outliers',
        }));

    const layout = {
      title: 'Deep DNAshape Prediction',
      xaxis: {
        title: plotType === 'line' ? 'Position' : 'Sequence',
        showgrid: true,
        zeroline: false,
      },
      yaxis: {
        title: `${result.feature} ${featureUnits[result.feature] || ''}`,
        showgrid: true,
        zeroline: false,
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.2,
      },
      margin: { l: 70, r: 20, t: 55, b: 70 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      dragmode: 'pan',
      autosize: true,
    };

    return { data, layout };
  };

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-600">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">🧬 eDNA Analysis</h1>
        <p className="text-slate-600">
          Predict DNA structural shape features using deep learning. Analyze multiple sequences in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* DNA Input */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-bold text-slate-800 mb-2">
              📝 Enter DNA Sequence(s)
            </label>
            <p className="text-xs text-slate-500 mb-2">One sequence per line. Allowed: A, C, G, T, N</p>
            <textarea
              value={dnaInput}
              onChange={(e) => handleDNAChange(e.target.value)}
              placeholder="ACGTCACGTGGTAG"
              className="w-full h-40 p-3 border-2 border-slate-300 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleLoadExample}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Load Example
            </button>

            {/* Error message */}
            {fileError && <div className="mt-2 p-2 bg-red-100 text-red-700 text-xs rounded">{fileError}</div>}
          </div>

          {/* Feature Selector */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-bold text-slate-800 mb-2">🔍 Select Feature</label>
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
          </div>

          {/* Fluctuation Toggle */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fluctuation && !noFluctuationFeatures.includes(feature)}
                onChange={(e) => setFluctuation(e.target.checked)}
                disabled={noFluctuationFeatures.includes(feature)}
                className="w-5 h-5 rounded border-slate-300 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm font-semibold text-slate-800">
                For shape fluctuation values, check this box.
              </span>
            </label>
            {noFluctuationFeatures.includes(feature) && (
              <p className="text-xs text-slate-500 mt-2">{feature} does not support fluctuation.</p>
            )}
          </div>

          {/* Layer Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Deep DNAshape layer (Default: 4)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Layer defines flanking region (k-mer) size. Layer 4 uses 9-mer/10-mer windows.
            </p>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((l) => (
                <button
                  key={l}
                  onClick={() => setLayer(l)}
                  className={`flex-1 py-2 px-3 rounded-lg font-semibold transition ${
                    layer === l
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-bold text-slate-800 mb-2">📤 Upload a File</label>
            <p className="text-xs text-slate-500 mb-3">Supports .txt, .fa, .fasta (max 1,000,000 sequences)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.fa,.fasta"
              onChange={handleFileUpload}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full mt-3 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              Upload File & Download Predictions
            </button>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          {result && result.sequences.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">📊 DNA Shape Profile</h2>
                <button
                  onClick={() => setPlotType(plotType === 'line' ? 'boxplot' : 'line')}
                  className="text-sm px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold"
                >
                  Toggle plot type
                </button>
              </div>

              <div id="dna-shape-chart" className="w-full h-96">
                <Plot
                  data={getPlotlyFigure().data as any[]}
                  layout={getPlotlyFigure().layout as any}
                  config={{
                    responsive: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                    toImageButtonOptions: {
                      format: 'png',
                      filename: 'edna-shape-profile',
                    },
                  }}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler
                />
              </div>

              {/* Export Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleExportPNG}
                  className="flex-1 py-2 px-4 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700"
                >
                  📥 Download PNG
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 py-2 px-4 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700"
                >
                  📥 Download CSV
                </button>
              </div>
            </div>
          )}

          {/* Statistics */}
          {result && result.sequences.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">📈 Statistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Mean</p>
                  <p className="text-lg font-bold text-blue-600">{result.statistics.mean.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Std Dev</p>
                  <p className="text-lg font-bold text-blue-600">{result.statistics.std.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Min</p>
                  <p className="text-lg font-bold text-blue-600">{result.statistics.min.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Max</p>
                  <p className="text-lg font-bold text-blue-600">{result.statistics.max.toFixed(3)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-500">Confidence Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{(result.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Species Classification Results */}
          {speciesResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">🐟 Species Classification</h2>
              <div className="space-y-3">
                {speciesResults.map((species, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-800">{species.species}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${species.probability * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{(species.probability * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ecological Metrics */}
          {ecologicalMetrics && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">🌍 Ecological Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Biodiversity Index</p>
                  <p className="text-lg font-bold text-green-600">
                    {typeof ecologicalMetrics.biodiversityIndex === 'number' ? ecologicalMetrics.biodiversityIndex.toFixed(3) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Species Richness</p>
                  <p className="text-lg font-bold text-green-600">
                    {ecologicalMetrics.speciesRichness}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Anomaly Score</p>
                  <p className="text-lg font-bold text-orange-600">
                    {typeof ecologicalMetrics.anomalyScore === 'number' ? ecologicalMetrics.anomalyScore.toFixed(3) : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Dominant Cluster</p>
                  <p className="text-lg font-bold text-blue-600">{ecologicalMetrics.dominantCluster}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3" />
              <p className="text-slate-600">Processing sequences...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeepDNAShapePanel;
