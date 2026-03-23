'use client';

import { useEffect, useState, useRef } from 'react';
import { fisheriesAPI, oceanAPI, correlationAPI } from '@/lib/api';
import { Bar, Line, Doughnut, Scatter } from 'react-chartjs-2';
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
import { Filter, Download, Calendar, TrendingUp, Users, Zap, MapPin, RefreshCw } from 'lucide-react';
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

interface ChartData {
  labels: string[];
  datasets: any[];
}

export default function VisualizationPage() {
  const [temporalData, setTemporalData] = useState<any[]>([]);
  const [geospatialData, setGeospatialData] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [speciesDistribution, setSpeciesDistribution] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState(false);

  // Refs for chart exports
  const stackedChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const doughnutChartRef = useRef<HTMLDivElement>(null);

  const dateRange = useDateRangeFilter(90);

  // Data refresh
  const { refresh, isRefreshing, lastRefreshed, getLastRefreshedText, autoRefreshEnabled, setAutoRefreshEnabled } =
    useDataRefresh({
      onRefresh: fetchAllData,
      autoRefreshInterval: 60,
    });

  async function fetchAllData() {
    try {
      const [temporalRes, geoRes, metricsRes, distRes, corrRes] = await Promise.all([
        fisheriesAPI.getTemporal(),
        fisheriesAPI.getGeospatial(),
        fisheriesAPI.getMetrics(),
        fisheriesAPI.getSpeciesDistribution(),
        correlationAPI.getScatter('temperature'),
      ]);

      setTemporalData(temporalRes.data.data || []);
      setGeospatialData(geoRes.data.data || []);
      setMetricsData(metricsRes.data.data || null);
      setSpeciesDistribution(distRes.data.data || []);
      setCorrelationData(corrRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch visualization data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  // Process temporal data based on filters
  const processedData = temporalData
    .filter((item) => {
      if (selectedSpecies !== 'all' && item.species !== selectedSpecies) return false;
      if (selectedRegion !== 'all' && item.region !== selectedRegion) return false;
      return true;
    })
    .reduce((acc: any[], item) => {
      const month = new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = acc.find((a) => a.month === month);

      if (existing) {
        existing.data.push({
          species: item.species,
          abundance: parseInt(item.total_abundance),
        });
      } else {
        acc.push({
          month,
          data: [{
            species: item.species,
            abundance: parseInt(item.total_abundance),
          }],
        });
      }
      return acc;
    }, []);

  const topSpecies = [...new Set(temporalData.map((t) => t.species))].slice(0, 8);
  const regions = [...new Set(temporalData.map((t) => t.region))];
  const months = [...new Set(processedData.map((p) => p.month))];

  // Stacked Bar Chart Data
  const stackedChartData: ChartData = {
    labels: months,
    datasets: topSpecies.map((species, idx) => ({
      label: species,
      data: processedData.map((p) => {
        const item = p.data.find((d: any) => d.species === species);
        return item ? item.abundance : 0;
      }),
      backgroundColor: `hsla(${idx * 40}, 70%, 60%, 0.8)`,
      borderColor: `hsl(${idx * 40}, 70%, 50%)`,
      borderWidth: 1,
    })),
  };

  // Line chart: Trend by species
  const lineChartData: ChartData = {
    labels: months,
    datasets: (selectedSpecies === 'all' ? topSpecies.slice(0, 3) : [selectedSpecies]).map((species, idx) => {
      const speciesData = processedData.map((p) => {
        const item = p.data.find((d: any) => d.species === species);
        return item ? item.abundance : 0;
      });
      return {
        label: String(species),
        data: speciesData,
        borderColor: `hsl(${idx * 120}, 70%, 50%)`,
        backgroundColor: `hsla(${idx * 120}, 70%, 50%, 0.1)`,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      };
    }),
  };

  // Doughnut: Species composition
  const speciesCompositionData: ChartData = {
    labels: topSpecies,
    datasets: [
      {
        data: topSpecies.map((species) => {
          const total = processedData.reduce((sum, p) => {
            const item = p.data.find((d: any) => d.species === species);
            return sum + (item ? item.abundance : 0);
          }, 0);
          return total;
        }),
        backgroundColor: topSpecies.map((_, idx) => `hsla(${idx * 40}, 70%, 60%, 0.8)`),
        borderColor: topSpecies.map((_, idx) => `hsl(${idx * 40}, 70%, 50%)`),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  // Scatter: Correlation data
  const scatterData: ChartData = {
    labels: [],
    datasets: [
      {
        label: 'Temperature vs Abundance',
        data: correlationData.slice(0, 100).map((item) => ({
          x: parseFloat(item.temperature || 0),
          y: parseInt(item.abundance || 0),
        })),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  // Calculate KPIs
  const totalAbundance = temporalData.reduce((sum, item) => sum + parseInt(item.total_abundance || 0), 0);
  const speciesDiversity = new Set(temporalData.map((item) => item.species)).size;
  const avgBiomass = metricsData?.average_biomass || 0;
  const trend = metricsData?.trend_indicator || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading visualization data...</p>
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Fisheries Analytics</h1>
                <p className="text-gray-500">Real-time abundance and environmental correlation</p>
              </div>
            </div>
            <RefreshControl
              onRefresh={refresh}
              isRefreshing={isRefreshing}
              lastRefreshed={getLastRefreshedText()}
              autoRefreshInterval={60}
              onAutoRefreshToggle={setAutoRefreshEnabled}
              autoRefreshEnabled={autoRefreshEnabled}
            />
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Species</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="select text-sm w-full"
                >
                  <option value="all">All Species</option>
                  {topSpecies.map((species) => (
                    <option key={species} value={species}>
                      {species}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="select text-sm w-full"
                >
                  <option value="all">All Regions</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Comparison Mode</label>
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
                    comparisonMode
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {comparisonMode ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-end">
                <ExportButton
                  data={temporalData}
                  filename="fisheries-abundance"
                  formats={['csv', 'excel', 'json']}
                  disabled={!temporalData || temporalData.length === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            className="kpi-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Total Abundance</h3>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{totalAbundance.toLocaleString()}</p>
            <p className="text-sm opacity-70 mt-2">All species combined</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Species Diversity</h3>
              <Users className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{speciesDiversity}</p>
            <p className="text-sm opacity-70 mt-2">Unique species detected</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-blue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Avg Biomass</h3>
              <Zap className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{avgBiomass.toFixed(2)}</p>
            <p className="text-sm opacity-70 mt-2">kg/hectare average</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Trend</h3>
              <MapPin className="w-5 h-5 opacity-80" />
            </div>
            <p className={`text-3xl font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
            <p className="text-sm opacity-70 mt-2">{trend > 0 ? 'Increasing' : 'Decreasing'}</p>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Stacked Bar Chart */}
          <motion.div
            className="card lg:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Species Abundance Over Time</h2>
              <span className="badge badge-blue">Top 8 Species</span>
            </div>
            <div ref={stackedChartRef} style={{ height: '320px' }}>
              <Bar
                data={stackedChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: {
                      stacked: true,
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      title: { display: true, text: 'Abundance (count)' },
                    },
                  },
                  plugins: {
                    legend: { position: 'bottom' as const },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Line Chart */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Abundance Trend</h2>
              <span className="text-xs text-gray-500">
                {selectedSpecies === 'all' ? 'Top 3 species' : selectedSpecies}
              </span>
            </div>
            <div ref={lineChartRef} style={{ height: '280px' }}>
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' as const } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Doughnut Chart */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Species Composition</h2>
            </div>
            <div className="flex items-center justify-center" style={{ height: '280px' }}>
              <div style={{ width: '240px', height: '240px' }}>
                <Doughnut
                  data={speciesCompositionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom' as const } },
                    cutout: '60%',
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Scatter Plot */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Correlation Analysis</h2>
            </div>
            <div style={{ height: '280px' }}>
              <Scatter
                data={scatterData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: 'Temperature (°C)' } },
                    y: { title: { display: true, text: 'Abundance' } },
                  },
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Data Table */}
        <motion.div
          className="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-navy-900">Top Species Summary</h2>
            <span className="text-sm text-gray-500">{topSpecies.length} species</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Species</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Total Abundance</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Avg Biomass</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Count</th>
                </tr>
              </thead>
              <tbody>
                {topSpecies.map((species, idx) => {
                  const speciesRecords = temporalData.filter((t) => t.species === species);
                  const totalAbund = speciesRecords.reduce((sum, t) => sum + parseInt(t.total_abundance || 0), 0);
                  const avgBiomass = speciesRecords.reduce((sum, t) => sum + parseFloat(t.average_biomass || 0), 0) /
                    speciesRecords.length || 0;
                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-navy-800">{species}</span>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">{totalAbund.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{avgBiomass.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-gray-500">{speciesRecords.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
