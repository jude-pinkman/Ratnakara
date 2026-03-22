'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { oceanAPI } from '@/lib/api';
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  Waves,
  Thermometer,
  Droplets,
  Activity,
  Wind,
  MapPin,
  Calendar,
  TrendingUp,
  Globe,
  RefreshCw,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function OceanPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [activeParam, setActiveParam] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, trendRes, geoRes] = await Promise.all([
          oceanAPI.getKPIs(),
          oceanAPI.getTrends(),
          oceanAPI.getGeospatial(),
        ]);

        setKpis(kpiRes.data.data);
        setTrends(trendRes.data.data);
        setGeoData(geoRes.data.data);
      } catch (error) {
        console.error('Failed to fetch ocean data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const regions = [
    'Bay of Bengal',
    'Arabian Sea',
    'Indian Ocean',
    'Andaman Sea',
    'Lakshadweep Sea',
  ];

  const regionCounts = geoData.reduce((acc: any, item: any) => {
    const region = item.region || 'Unknown';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});

  const paramColors = {
    temperature: { border: 'rgba(239, 68, 68, 1)', bg: 'rgba(239, 68, 68, 0.1)' },
    salinity: { border: 'rgba(59, 130, 246, 1)', bg: 'rgba(59, 130, 246, 0.1)' },
    ph: { border: 'rgba(16, 185, 129, 1)', bg: 'rgba(16, 185, 129, 0.1)' },
    oxygen: { border: 'rgba(234, 179, 8, 1)', bg: 'rgba(234, 179, 8, 0.1)' },
  };

  const chartData = {
    labels: trends.map((t) =>
      new Date(t.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    ),
    datasets: [
      ...(activeParam === 'all' || activeParam === 'temperature'
        ? [
            {
              label: 'Temperature (°C)',
              data: trends.map((t) => parseFloat(t.avg_temp)),
              borderColor: paramColors.temperature.border,
              backgroundColor: paramColors.temperature.bg,
              fill: activeParam === 'temperature',
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ]
        : []),
      ...(activeParam === 'all' || activeParam === 'salinity'
        ? [
            {
              label: 'Salinity (PSU)',
              data: trends.map((t) => parseFloat(t.avg_salinity)),
              borderColor: paramColors.salinity.border,
              backgroundColor: paramColors.salinity.bg,
              fill: activeParam === 'salinity',
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ]
        : []),
      ...(activeParam === 'all' || activeParam === 'ph'
        ? [
            {
              label: 'pH Level',
              data: trends.map((t) => parseFloat(t.avg_ph)),
              borderColor: paramColors.ph.border,
              backgroundColor: paramColors.ph.bg,
              fill: activeParam === 'ph',
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ]
        : []),
      ...(activeParam === 'all' || activeParam === 'oxygen'
        ? [
            {
              label: 'Oxygen (mg/L)',
              data: trends.map((t) => parseFloat(t.avg_oxygen)),
              borderColor: paramColors.oxygen.border,
              backgroundColor: paramColors.oxygen.bg,
              fill: activeParam === 'oxygen',
              tension: 0.4,
              pointRadius: 3,
              pointHoverRadius: 6,
            },
          ]
        : []),
    ],
  };

  const regionBarData = {
    labels: Object.keys(regionCounts),
    datasets: [
      {
        label: 'Monitoring Stations',
        data: Object.values(regionCounts),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderRadius: 8,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ocean data...</p>
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-marine-500 to-marine-600 flex items-center justify-center">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Ocean Data Monitoring</h1>
                <p className="text-gray-500">Real-time oceanographic parameter tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="select"
              >
                <option value="all">All Regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <button className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Avg Temperature</h3>
                <Thermometer className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(kpis.avg_temp).toFixed(2)}°C</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                <span className="text-xs opacity-70">
                  Min: {parseFloat(kpis.min_temp).toFixed(1)}°C
                </span>
                <span className="text-xs opacity-70">
                  Max: {parseFloat(kpis.max_temp).toFixed(1)}°C
                </span>
              </div>
            </div>

            <div className="kpi-card kpi-card-green">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Avg Salinity</h3>
                <Droplets className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(kpis.avg_salinity).toFixed(2)}</p>
              <p className="text-xs opacity-70 mt-3">Practical Salinity Units (PSU)</p>
            </div>

            <div className="kpi-card kpi-card-teal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Avg pH Level</h3>
                <Activity className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(kpis.avg_ph).toFixed(2)}</p>
              <p className="text-xs opacity-70 mt-3">Ocean Acidity Index</p>
            </div>

            <div className="kpi-card kpi-card-orange">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Avg Dissolved Oxygen</h3>
                <Wind className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(kpis.avg_oxygen).toFixed(2)}</p>
              <p className="text-xs opacity-70 mt-3">mg/L average</p>
            </div>
          </div>
        )}

        {/* Main Map Section */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-marine-600" />
              <h2 className="text-lg font-semibold text-navy-900">Regional Data Distribution</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {geoData.length} monitoring stations
              </span>
            </div>
          </div>
          <div className="h-[500px] rounded-xl overflow-hidden border border-gray-200">
            <MapView data={geoData} type="ocean" />
          </div>

          {/* Region Legend */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(regionCounts).map(([region, count], idx) => {
              const colors = [
                'bg-marine-500',
                'bg-emerald-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-pink-500',
              ];
              return (
                <div
                  key={region}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`}></div>
                  <div>
                    <p className="text-sm font-medium text-navy-800">{region}</p>
                    <p className="text-xs text-gray-500">{count as number} stations</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Parameter Trends */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-marine-600" />
                <h2 className="text-lg font-semibold text-navy-900">Parameter Trends</h2>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Monthly Data</span>
              </div>
            </div>

            {/* Parameter Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'all', label: 'All Parameters' },
                { key: 'temperature', label: 'Temperature', color: 'bg-red-500' },
                { key: 'salinity', label: 'Salinity', color: 'bg-blue-500' },
                { key: 'ph', label: 'pH', color: 'bg-emerald-500' },
                { key: 'oxygen', label: 'Oxygen', color: 'bg-yellow-500' },
              ].map((param) => (
                <button
                  key={param.key}
                  onClick={() => setActiveParam(param.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeParam === param.key
                      ? 'bg-marine-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {param.color && (
                    <span className={`w-2 h-2 rounded-full ${param.color}`}></span>
                  )}
                  {param.label}
                </button>
              ))}
            </div>

            <div className="chart-container" style={{ height: '320px' }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      grid: {
                        color: 'rgba(0,0,0,0.05)',
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                }}
              />
            </div>
          </div>

          {/* Regional Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Stations by Region</h2>
              <span className="badge badge-blue">{geoData.length} total</span>
            </div>
            <div className="chart-container" style={{ height: '320px' }}>
              <Bar
                data={regionBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0,0,0,0.05)',
                      },
                    },
                    y: {
                      grid: {
                        display: false,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Data Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="card bg-gradient-to-br from-marine-50 to-marine-100 border-marine-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-marine-500 flex items-center justify-center">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-marine-900">Temperature Monitoring</h3>
                <p className="text-sm text-marine-700 mt-1">
                  Surface water temperatures are tracked across all monitoring stations with hourly updates.
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900">Salinity Levels</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Salinity is measured in PSU (Practical Salinity Units) to track freshwater influence.
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">Water Quality</h3>
                <p className="text-sm text-orange-700 mt-1">
                  pH and dissolved oxygen levels indicate ecosystem health and support marine life needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
