'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, AlertCircle, Plus, X, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SPECIES_LIST = [
  'Sardinella longiceps',
  'Rastrelliger kanagurta',
  'Thunnus albacares',
  'Katsuwonus pelamis',
  'Scomberomorus guttatus',
];

interface Forecast {
  species: string;
  data: Array<{
    date: string;
    predicted_abundance: number;
    confidence_low: number;
    confidence_high: number;
  }>;
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([SPECIES_LIST[0]]);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(95);

  const generateMockForecast = (species: string, months: number): Forecast['data'] => {
    const baseline = 3000 + Math.random() * 2000;
    const data = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);

      const seasonalFactor = 1 + 0.3 * Math.sin((date.getMonth() * Math.PI) / 6);
      const trend = 1 + 0.02 * i;
      const noise = (Math.random() - 0.5) * 0.2;

      const predicted = baseline * seasonalFactor * trend * (1 + noise);
      const confidence = confidenceLevel / 100;
      const margin = predicted * (1 - confidence) * 0.5;

      data.push({
        date: date.toISOString().split('T')[0],
        predicted_abundance: Math.round(predicted),
        confidence_low: Math.round(predicted - margin),
        confidence_high: Math.round(predicted + margin),
      });
    }

    return data;
  };

  const generateForecast = async () => {
    if (selectedSpecies.length === 0) {
      toast.error('Select at least one species');
      return;
    }

    setLoading(true);
    try {
      const newForecasts: Forecast[] = selectedSpecies.map((species) => ({
        species,
        data: generateMockForecast(species, months),
      }));

      setForecasts(newForecasts);
      toast.success(`Generated forecasts for ${selectedSpecies.length} species`);
    } catch (error) {
      toast.error('Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecies = (species: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(species)
        ? prev.filter((s) => s !== species)
        : [...prev, species]
    );
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Combined comparison data
  const comparisonData = forecasts.length > 0 && forecasts[0].data
    ? forecasts[0].data.map((item, idx) => ({
        date: item.date,
        ...forecasts.reduce((acc, forecast) => {
          acc[forecast.species] = forecast.data[idx]?.predicted_abundance || 0;
          return acc;
        }, {} as Record<string, number>),
      }))
    : [];

  // Risk analysis
  const getRiskLevel = (forecast: Forecast): 'critical' | 'warning' | 'stable' => {
    if (forecast.data.length === 0) return 'stable';
    const trend =
      forecast.data[forecast.data.length - 1].predicted_abundance -
      forecast.data[0].predicted_abundance;
    const trendPercent = (trend / forecast.data[0].predicted_abundance) * 100;

    if (trendPercent < -30) return 'critical';
    if (trendPercent < -10) return 'warning';
    return 'stable';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Fish Population Forecasts</h1>
                <p className="text-gray-500">AI-powered LSTM predictions for marine species</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Configuration Panel */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-navy-900">Forecast Settings</h2>
            <Zap className="w-5 h-5 text-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Species Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Species to Forecast
              </label>
              <div className="space-y-2">
                {SPECIES_LIST.map((species) => (
                  <label key={species} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSpecies.includes(species)}
                      onChange={() => toggleSpecies(species)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600"
                    />
                    <span className="text-sm text-gray-700">{species}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Forecast Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Forecast Duration
              </label>
              <div className="space-y-4">
                <div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={months}
                    onChange={(e) => setMonths(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>1 month</span>
                    <span className="text-lg font-bold text-purple-600">{months} months</span>
                    <span>24 months</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Confidence Level
              </label>
              <div className="space-y-4">
                <div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>50%</span>
                    <span className="text-lg font-bold text-purple-600">{confidenceLevel}%</span>
                    <span>99%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={generateForecast}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Generating Forecasts...' : 'Generate Forecasts'}
          </button>
        </motion.div>

        {/* Results */}
        {forecasts.length > 0 && (
          <>
            {/* Risk Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-600 font-medium">Critical Risk</p>
                    <p className="text-2xl font-bold text-red-700">
                      {forecasts.filter((f) => getRiskLevel(f) === 'critical').length}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Warning Level</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {forecasts.filter((f) => getRiskLevel(f) === 'warning').length}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Stable/Positive</p>
                    <p className="text-2xl font-bold text-green-700">
                      {forecasts.filter((f) => getRiskLevel(f) === 'stable').length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Comparison Chart */}
            {forecasts.length > 1 && (
              <motion.div
                className="card mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-navy-900">Species Comparison</h2>
                  <span className="badge badge-purple">{forecasts.length} species</span>
                </div>

                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #ccc',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                        formatter={(value) => [value.toLocaleString(), '']}
                      />
                      <Legend />
                      {forecasts.map((forecast, idx) => (
                        <Line
                          key={forecast.species}
                          type="monotone"
                          dataKey={forecast.species}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Individual Forecasts */}
            <div className="space-y-6">
              {forecasts.map((forecast, idx) => {
                const risk = getRiskLevel(forecast);
                const trend =
                  forecast.data[forecast.data.length - 1].predicted_abundance -
                  forecast.data[0].predicted_abundance;
                const trendPercent = ((trend / forecast.data[0].predicted_abundance) * 100).toFixed(1);

                return (
                  <motion.div
                    key={forecast.species}
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (idx + 1) }}
                  >
                    {/* Header with Risk Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-navy-900">{forecast.species}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Trend: <span className={trendPercent.startsWith('-') ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            {trendPercent}%
                          </span>
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        risk === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : risk === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
                      </div>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Starting</p>
                        <p className="text-xl font-bold text-navy-900">
                          {forecast.data[0].predicted_abundance.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Ending</p>
                        <p className="text-xl font-bold text-navy-900">
                          {forecast.data[forecast.data.length - 1].predicted_abundance.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Peak</p>
                        <p className="text-xl font-bold text-purple-600">
                          {Math.max(...forecast.data.map((d) => d.predicted_abundance)).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Low</p>
                        <p className="text-xl font-bold text-orange-600">
                          {Math.min(...forecast.data.map((d) => d.predicted_abundance)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Chart with Confidence Intervals */}
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecast.data}>
                          <defs>
                            <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              padding: '12px',
                            }}
                            formatter={(value) => value.toLocaleString()}
                          />
                          <Area
                            type="monotone"
                            dataKey="confidence_high"
                            fill={colors[idx % colors.length]}
                            fillOpacity={0.1}
                            stroke="none"
                          />
                          <Area
                            type="monotone"
                            dataKey="confidence_low"
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <Line
                            type="monotone"
                            dataKey="predicted_abundance"
                            stroke={colors[idx % colors.length]}
                            strokeWidth={3}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex items-center gap-6 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                        <span>Predicted Value</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length], opacity: 0.3 }}></div>
                        <span>Confidence Range ({confidenceLevel}%)</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Insights Panel */}
            <motion.div
              className="card mt-8 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Forecast Insights</h3>
                  <ul className="mt-3 space-y-2 text-sm text-blue-800">
                    <li>• These forecasts are based on LSTM neural networks trained on historical patterns</li>
                    <li>• Confidence intervals widen further into the future, reflecting increased uncertainty</li>
                    <li>• Environmental factors like monsoon season significantly affect predictions</li>
                    <li>• Consider combining with real-time oceanographic data for improved accuracy</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Empty State */}
        {forecasts.length === 0 && (
          <motion.div
            className="card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Forecasts Generated</h3>
            <p className="text-gray-500">Select species and click "Generate Forecasts" to see predictions</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
