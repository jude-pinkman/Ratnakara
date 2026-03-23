'use client';

import { useEffect, useState, useRef } from 'react';
import { ednaAPI, oceanAPI } from '@/lib/api';
import { Bar, Scatter, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Dna, Filter, Download, Calendar, Beaker, Activity, Target, Waves, RefreshCw } from 'lucide-react';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RefreshControl } from '@/components/RefreshControl';
import { ExportButton } from '@/components/ExportButton';
import { useDataRefresh, useDateRangeFilter } from '@/hooks/useDataRefresh';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EdnaPage() {
  const [concentration, setConcentration] = useState<any[]>([]);
  const [depthData, setDepthData] = useState<any[]>([]);
  const [seasonalData, setSeasonalData] = useState<any[]>([]);
  const [confidenceData, setConfidenceData] = useState<any[]>([]);
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [stats, setStats] = useState<any>({ totalSamples: 0, avgConcentration: 0, speciesDetected: 0, avgConfidencePct: 0 });
  const [loading, setLoading] = useState(true);

  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [depthRange, setDepthRange] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [clickedSpecies, setClickedSpecies] = useState<string | null>(null);

  const dateRange = useDateRangeFilter(90);

  // Refs for chart exports
  const concentrationChartRef = useRef<HTMLDivElement>(null);
  const depthChartRef = useRef<HTMLDivElement>(null);
  const seasonalChartRef = useRef<HTMLDivElement>(null);

  // Data refresh
  const { refresh, isRefreshing, lastRefreshed, getLastRefreshedText, autoRefreshEnabled, setAutoRefreshEnabled } =
    useDataRefresh({
      onRefresh: fetchAllData,
      autoRefreshInterval: 120,
    });

  async function fetchAllData() {
    try {
      const params = selectedYear === 'all' ? {} : { year: Number(selectedYear) };
      const [concRes, depthRes, seasonRes, confRes, speciesRes, statsRes] = await Promise.all([
        ednaAPI.getConcentrationTrends(params),
        ednaAPI.getDepthAnalysis(params),
        ednaAPI.getSeasonal(params),
        ednaAPI.getConfidenceDistribution(params),
        ednaAPI.getSpeciesList(params),
        ednaAPI.getStats(),
      ]);

      setConcentration(concRes.data.data);
      setDepthData(depthRes.data.data);
      setSeasonalData(seasonRes.data.data);
      setConfidenceData(confRes.data.data);
      setSpeciesList(speciesRes.data.data || []);
      setStats(statsRes.data.data || { totalSamples: 0, avgConcentration: 0, speciesDetected: 0, avgConfidencePct: 0 });
    } catch (error) {
      console.error('Failed to fetch eDNA data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, [selectedYear]);

  const yearOptions = Array.from({ length: 10 }, (_, index) => (new Date().getFullYear() - index).toString());

  // Apply filters
  const filteredConcentration = concentration.filter((c) => {
    if (selectedSpecies !== 'all' && c.species !== selectedSpecies) return false;
    if (clickedSpecies && c.species !== clickedSpecies) return false;
    return true;
  });

  const filteredDepthData = depthData.filter((d) => {
    if (clickedSpecies && d.species && d.species !== clickedSpecies) return false;
    const depth = parseFloat(d.depth);
    if (depthRange === '0-50' && (depth < 0 || depth > 50)) return false;
    if (depthRange === '50-100' && (depth < 50 || depth > 100)) return false;
    if (depthRange === '100+' && depth < 100) return false;
    return true;
  });

  const filteredSeasonalData = seasonalData.filter((s) => {
    if (selectedSeason !== 'all' && s.season !== selectedSeason) return false;
    if (clickedSpecies && s.species && s.species !== clickedSpecies) return false;
    return true;
  });

  // Use stats from the dedicated endpoint for accurate KPIs
  const totalSamples = stats.totalSamples;
  const avgConcentration = stats.avgConcentration.toFixed(2);
  const avgConfidence = stats.avgConfidencePct;

  const concentrationGradients = filteredConcentration.slice(0, 12).map((_, idx) => {
    const hue = 270 - (idx * 15);
    return `hsla(${hue}, 70%, 50%, 0.8)`;
  });

  const concentrationChart = {
    labels: filteredConcentration.slice(0, 12).map((c) => {
      const name = c.species || '';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }),
    datasets: [
      {
        label: 'Avg Concentration (ng/L)',
        data: filteredConcentration.slice(0, 12).map((c) => parseFloat(c.avg_concentration)),
        backgroundColor: concentrationGradients,
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const scatterData = {
    datasets: [
      {
        label: 'Depth vs Concentration',
        data: filteredDepthData.map((d) => ({
          x: parseFloat(d.depth),
          y: parseFloat(d.avg_concentration),
        })),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
  const seasonColors = {
    Spring: 'rgba(34, 197, 94, 0.8)',
    Summer: 'rgba(234, 179, 8, 0.8)',
    Fall: 'rgba(249, 115, 22, 0.8)',
    Winter: 'rgba(59, 130, 246, 0.8)',
  };

  const seasonalChartData = {
    labels: seasons,
    datasets: [
      {
        label: 'Avg Concentration',
        data: seasons.map((season) => {
          const seasonItems = filteredSeasonalData.filter((s) => s.season === season);
          if (seasonItems.length === 0) return 0;
          const total = seasonItems.reduce((sum, s) => sum + parseFloat(s.avg_concentration || 0), 0);
          return total / seasonItems.length;
        }),
        backgroundColor: seasons.map((s) => seasonColors[s as keyof typeof seasonColors]),
        borderColor: seasons.map((s) => seasonColors[s as keyof typeof seasonColors]),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const confidenceColors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(239, 68, 68, 0.8)',
  ];

  const confidencePie = {
    labels: confidenceData.map((c) => c.confidence_range),
    datasets: [
      {
        data: confidenceData.map((c) => parseInt(c.count)),
        backgroundColor: confidenceColors,
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading eDNA data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-gray-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Dna className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Environmental DNA Analysis</h1>
                <p className="text-gray-500">Molecular biodiversity assessment and monitoring</p>
              </div>
            </div>
            <RefreshControl
              onRefresh={refresh}
              isRefreshing={isRefreshing}
              lastRefreshed={getLastRefreshedText()}
              autoRefreshInterval={120}
              onAutoRefreshToggle={setAutoRefreshEnabled}
              autoRefreshEnabled={autoRefreshEnabled}
            />
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Filters & Options</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="select text-sm py-2 w-full"
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Species</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => {
                    setSelectedSpecies(e.target.value);
                    setClickedSpecies(null);
                  }}
                  className="select text-sm py-2 w-full"
                >
                  <option value="all">All Species</option>
                  {Array.isArray(speciesList) && speciesList.map((species: any, idx) => (
                    <option key={idx} value={species.species || species}>
                      {species.species || species}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="select text-sm py-2 w-full"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map((season) => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Depth Range</label>
                <select
                  value={depthRange}
                  onChange={(e) => setDepthRange(e.target.value)}
                  className="select text-sm py-2 w-full"
                >
                  <option value="all">All Depths</option>
                  <option value="0-50">0-50m (Shallow)</option>
                  <option value="50-100">50-100m (Mid)</option>
                  <option value="100+">100m+ (Deep)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Comparison</label>
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition ${
                    comparisonMode
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {comparisonMode ? '✓ Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-end">
                <ExportButton
                  data={concentration}
                  filename="edna-analysis"
                  formats={['csv', 'excel', 'json']}
                  disabled={!concentration || concentration.length === 0}
                />
              </div>
            </div>

            {clickedSpecies && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  <strong>Drill-down active:</strong> Showing data for {clickedSpecies}
                </span>
                <button onClick={() => setClickedSpecies(null)} className="text-sm text-blue-600 hover:text-blue-800">
                  Clear filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            className="kpi-card kpi-card-purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Total Samples</h3>
              <Beaker className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{totalSamples.toLocaleString()}</p>
            <p className="text-sm opacity-70 mt-2">eDNA samples analyzed</p>
          </motion.div>

          <motion.div
            className="kpi-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Avg Concentration</h3>
              <Activity className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{avgConcentration}</p>
            <p className="text-sm opacity-70 mt-2">ng/L average</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Species Detected</h3>
              <Dna className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.speciesDetected}</p>
            <p className="text-sm opacity-70 mt-2">Unique species</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-teal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Confidence Score</h3>
              <Target className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{avgConfidence}%</p>
            <p className="text-sm opacity-70 mt-2">Average confidence</p>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Concentration by Species */}
          <motion.div
            className="card lg:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">eDNA Concentration by Species</h2>
              <span className="badge badge-purple">Click to drill-down</span>
            </div>
            <div ref={concentrationChartRef} style={{ height: '320px' }}>
              <Bar
                data={concentrationChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (event, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const species = filteredConcentration[index]?.species;
                      if (species) setClickedSpecies(species);
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => context.parsed.y ? `${context.parsed.y.toFixed(2)} ng/L` : '',
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      title: {
                        display: true,
                        text: 'Concentration (ng/L)',
                        font: { size: 12 },
                      },
                    },
                    x: {
                      grid: { display: false },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-3 text-xs text-gray-500">
              💡 Tip: Click a bar to filter all charts to that species
            </div>
          </motion.div>

          {/* Depth Analysis */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Depth vs Concentration</h2>
              <Waves className="w-5 h-5 text-gray-400" />
            </div>
            <div ref={depthChartRef} style={{ height: '280px' }}>
              <Scatter
                data={scatterData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Depth (m)',
                        font: { size: 12 },
                      },
                      grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Concentration (ng/L)',
                        font: { size: 12 },
                      },
                      grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                  },
                }}
              />
            </div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                Scatter plot shows relationship between sampling depth and eDNA concentration
              </p>
            </div>
          </motion.div>

          {/* Seasonal Variation */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Seasonal Variation</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div ref={seasonalChartRef} style={{ height: '280px' }}>
              <Bar
                data={seasonalChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      title: {
                        display: true,
                        text: 'Avg Concentration',
                        font: { size: 12 },
                      },
                    },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {seasons.map((season) => (
                <div key={season} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: seasonColors[season as keyof typeof seasonColors] }}
                  ></div>
                  <span className="text-xs text-gray-600">{season}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Confidence Distribution */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Detection Confidence</h2>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-center" style={{ height: '280px' }}>
              <div style={{ width: '240px', height: '240px' }}>
                <Doughnut
                  data={confidencePie}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { padding: 15, usePointStyle: true },
                      },
                    },
                    cutout: '60%',
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Species Breakdown Table */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Species Summary</h2>
              <span className="text-sm text-gray-500">{filteredConcentration.length} species</span>
            </div>
            <div className="overflow-y-auto max-h-[300px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-sm">Species</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-sm">Concentration</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600 text-sm">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConcentration.slice(0, 10).map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setClickedSpecies(item.species)}
                      className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition"
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: concentrationGradients[idx] }}
                          ></div>
                          <span className="text-sm font-medium text-navy-800 truncate max-w-[150px]">
                            {item.species}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3 text-sm font-medium">
                        {parseFloat(item.avg_concentration).toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-3 text-sm text-gray-500">
                        {item.sample_count || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              💡 Click a row to drill-down to that species
            </div>
          </motion.div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <Dna className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">What is eDNA?</h3>
                <p className="text-sm text-purple-700 mt-1">
                  Environmental DNA (eDNA) is genetic material shed by organisms into their environment through skin cells, mucus, and waste.
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Beaker className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Collection Method</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Water samples are collected and filtered to capture DNA fragments, which are then analyzed using PCR techniques.
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Detection Accuracy</h3>
                <p className="text-sm text-green-700 mt-1">
                  eDNA detection provides high sensitivity for rare species and non-invasive biodiversity monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
