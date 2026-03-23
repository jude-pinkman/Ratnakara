'use client';

import { useEffect, useState } from 'react';
import { correlationAPI } from '@/lib/api';
import CorrelationChart from '@/components/CorrelationChart';
import { Scatter, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { GitBranch, TrendingUp, Activity, Info, RefreshCw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function CorrelationsPage() {
  const [environmentalImpact, setEnvironmentalImpact] = useState<any[]>([]);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedVariable, setSelectedVariable] = useState<string>('temperature');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [impactRes, speciesRes] = await Promise.all([
          correlationAPI.getEnvironmentalImpact(),
          correlationAPI.getSpeciesList(),
        ]);

        setEnvironmentalImpact(impactRes.data.data);
        setSpeciesList(speciesRes.data.data);
        if (speciesRes.data.data.length > 0) {
          const firstSpecies = typeof speciesRes.data.data[0] === 'string'
            ? speciesRes.data.data[0]
            : speciesRes.data.data[0].species;
          setSelectedSpecies(firstSpecies);
        }
      } catch (error) {
        console.error('Failed to fetch correlation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate summary metrics
  const avgCorrelation = environmentalImpact.length > 0
    ? (environmentalImpact.reduce((sum, item) => {
        const temps = parseFloat(item.temp_correlation || 0);
        const sal = parseFloat(item.salinity_correlation || 0);
        const ph = parseFloat(item.ph_correlation || 0);
        const ox = parseFloat(item.oxygen_correlation || 0);
        return sum + Math.abs(temps + sal + ph + ox);
      }, 0) / (environmentalImpact.length * 4)).toFixed(3)
    : '0';

  const strongestCorrelations = environmentalImpact
    .flatMap((item) => [
      { species: item.species, param: 'Temperature', value: item.temp_correlation },
      { species: item.species, param: 'Salinity', value: item.salinity_correlation },
      { species: item.species, param: 'pH', value: item.ph_correlation },
      { species: item.species, param: 'Oxygen', value: item.oxygen_correlation },
    ])
    .sort((a, b) => Math.abs(parseFloat(b.value)) - Math.abs(parseFloat(a.value)))
    .slice(0, 3);

  // Heatmap data
  const parameters = ['Temperature', 'Salinity', 'pH', 'Oxygen'];
  const correlationRows = environmentalImpact.slice(0, 8);

  const getCorrelationColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.7) return value > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    if (absValue >= 0.4) return value > 0 ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)';
    return 'rgb(229, 231, 235)';
  };

  const getCorrelationKey = (param: string, item: any) => {
    switch (param) {
      case 'Temperature': return item.temp_correlation;
      case 'Salinity': return item.salinity_correlation;
      case 'pH': return item.ph_correlation;
      case 'Oxygen': return item.oxygen_correlation;
      default: return 0;
    }
  };

  // Bar chart: Correlations for selected species
  const selectedSpeciesData = environmentalImpact.find(
    (item) => item.species === selectedSpecies
  );

  const correlationBpData = selectedSpeciesData ? {
    labels: parameters,
    datasets: [
      {
        label: `${selectedSpecies.split('_').join(' ')}`,
        data: [
          parseFloat(selectedSpeciesData.temp_correlation || 0),
          parseFloat(selectedSpeciesData.salinity_correlation || 0),
          parseFloat(selectedSpeciesData.ph_correlation || 0),
          parseFloat(selectedSpeciesData.oxygen_correlation || 0),
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(234, 179, 8, 0.8)',
        ],
        borderRadius: 6,
      },
    ],
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading correlation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Environmental Correlations</h1>
                <p className="text-gray-500">Species sensitivity to environmental parameters</p>
              </div>
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
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
              <h3 className="text-sm opacity-90">Avg Correlation</h3>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{avgCorrelation}</p>
            <p className="text-sm opacity-70 mt-2">Mean strength</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-green"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Species Analyzed</h3>
              <Activity className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{environmentalImpact.length}</p>
            <p className="text-sm opacity-70 mt-2">Total species</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-purple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Parameters</h3>
              <Filter className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">4</p>
            <p className="text-sm opacity-70 mt-2">Environmental variables</p>
          </motion.div>

          <motion.div
            className="kpi-card kpi-card-orange"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Strongest Correlation</h3>
              <TrendingUp className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {strongestCorrelations.length > 0
                ? parseFloat(strongestCorrelations[0].value).toFixed(3)
                : '-'}
            </p>
            <p className="text-sm opacity-70 mt-2">
              {strongestCorrelations.length > 0
                ? `${strongestCorrelations[0].param}`
                : 'N/A'}
            </p>
          </motion.div>
        </div>

        {/* Heatmap and Selected Species Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Correlation Heatmap */}
          <motion.div
            className="card lg:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Correlation Matrix</h2>
              <span className="badge badge-indigo">Species vs Parameters</span>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header Row */}
                <div className="flex gap-1 mb-4">
                  <div className="w-[140px] flex-shrink-0"></div>
                  {parameters.map((param) => (
                    <div
                      key={param}
                      className="w-24 text-center text-xs font-semibold text-gray-600"
                    >
                      {param}
                    </div>
                  ))}
                </div>

                {/* Data Rows */}
                {correlationRows.map((item, idx) => (
                  <div key={idx} className="flex gap-1 mb-2">
                    <div className="w-[140px] flex-shrink-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {item.species.split('_').join(' ')}
                      </p>
                    </div>
                    {parameters.map((param) => {
                      const value = parseFloat(getCorrelationKey(param, item) || 0);
                      return (
                        <div
                          key={param}
                          className="w-24 h-10 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                          style={{
                            backgroundColor: getCorrelationColor(value),
                          }}
                        >
                          {value.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Strong Positive</span>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(134, 239, 172)' }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(229, 231, 235)' }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(252, 165, 165)' }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
                </div>
                <span className="text-gray-600">Strong Negative</span>
              </div>
            </div>
          </motion.div>

          {/* Key Insights */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Top Correlations</h2>
              <Info className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {strongestCorrelations.map((corr, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy-900">
                        {corr.species.split('_').join(' ')}
                      </p>
                      <p className="text-xs text-gray-500">{corr.param}</p>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        parseFloat(corr.value) > 0
                          ? 'text-green-600'
                          : parseFloat(corr.value) < 0
                          ? 'text-red-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {parseFloat(corr.value).toFixed(3)}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.abs(parseFloat(corr.value)) * 100}%`,
                        backgroundColor:
                          parseFloat(corr.value) > 0
                            ? 'rgb(34, 197, 94)'
                            : 'rgb(239, 68, 68)',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Selected Species Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Species Selector and Bar Chart */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">Species Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">Select a species to explore</p>
              </div>
              <Filter className="w-5 h-5 text-gray-400" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
              <select
                className="select w-full"
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
              >
                {speciesList.map((s, idx) => {
                  const speciesValue = typeof s === 'string' ? s : s.species;
                  return (
                    <option key={`${speciesValue}-${idx}`} value={speciesValue}>
                      {speciesValue}
                    </option>
                  );
                })}
              </select>
            </div>

            {correlationBpData && (
              <div style={{ height: '280px' }}>
                <Bar
                  data={correlationBpData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        title: {
                          display: true,
                          text: 'Correlation Coefficient',
                          font: { size: 12 },
                        },
                      },
                      x: {
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            )}
          </motion.div>

          {/* Scatter Plot */}
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-navy-900">Variable Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">Select environmental parameter</p>
              </div>
              <Filter className="w-5 h-5 text-gray-400" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Variable</label>
              <select
                className="select w-full"
                value={selectedVariable}
                onChange={(e) => setSelectedVariable(e.target.value)}
              >
                <option value="temperature">Temperature</option>
                <option value="salinity">Salinity</option>
                <option value="ph">pH</option>
                <option value="oxygen">Oxygen</option>
              </select>
            </div>

            <div style={{ height: '280px' }}>
              <CorrelationChart species={selectedSpecies} variable={selectedVariable} />
            </div>
          </motion.div>
        </div>

        {/* Detailed Table */}
        <motion.div
          className="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-navy-900">Detailed Correlation Coefficients</h2>
            <span className="text-sm text-gray-500">{environmentalImpact.length} species</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Species</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-sm">Temperature</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-sm">Salinity</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-sm">pH</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-sm">Oxygen</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 text-sm">Strength</th>
                </tr>
              </thead>
              <tbody>
                {environmentalImpact.slice(0, 10).map((item, idx) => {
                  const temp = parseFloat(item.temp_correlation || 0);
                  const sal = parseFloat(item.salinity_correlation || 0);
                  const ph = parseFloat(item.ph_correlation || 0);
                  const oxy = parseFloat(item.oxygen_correlation || 0);
                  const avgStrength = Math.abs((temp + sal + ph + oxy) / 4);

                  return (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-indigo-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-navy-900">{item.species}</p>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            temp > 0
                              ? 'bg-green-100 text-green-700'
                              : temp < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {temp.toFixed(3)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            sal > 0
                              ? 'bg-green-100 text-green-700'
                              : sal < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {sal.toFixed(3)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            ph > 0
                              ? 'bg-green-100 text-green-700'
                              : ph < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {ph.toFixed(3)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            oxy > 0
                              ? 'bg-green-100 text-green-700'
                              : oxy < 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {oxy.toFixed(3)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${avgStrength * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 w-10 text-right">
                            {(avgStrength * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div
          className="card mt-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-900">Understanding Correlation Coefficients</h3>
              <p className="text-sm text-indigo-700 mt-2">
                Correlation shows how strongly a species responds to environmental changes. Values range from -1 (strong negative) to +1 (strong positive).
                A value near 0 indicates little to no relationship with that environmental parameter.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
