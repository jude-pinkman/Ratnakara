'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { fisheriesAPI } from '@/lib/api';
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Fish, TrendingUp, Scale, Layers, MapPin, Calendar, Filter, RefreshCw } from 'lucide-react';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HotspotArea {
  region: string;
  center_latitude: number;
  center_longitude: number;
  total_abundance: number;
  observations: number;
  matched_species: string[];
}

export default function FisheriesPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [speciesData, setSpeciesData] = useState<any[]>([]);
  const [temporalData, setTemporalData] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [showTemperature, setShowTemperature] = useState(true);
  const [showSalinity, setShowSalinity] = useState(true);
  const [showPH, setShowPH] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [searchingHotspot, setSearchingHotspot] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hotspotArea, setHotspotArea] = useState<HotspotArea | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, speciesRes, temporalRes, geoRes] = await Promise.all([
          fisheriesAPI.getMetrics(),
          fisheriesAPI.getSpeciesDistribution(),
          fisheriesAPI.getTemporal(),
          fisheriesAPI.getGeospatial(),
        ]);

        setMetrics(metricsRes.data.data);
        setSpeciesData(speciesRes.data.data);
        setTemporalData(temporalRes.data.data || []);
        setGeoData(geoRes.data.data);
      } catch (error) {
        console.error('Failed to fetch fisheries data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const speciesColors = [
    'rgba(14, 165, 233, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(99, 102, 241, 0.8)',
    'rgba(244, 63, 94, 0.8)',
    'rgba(34, 197, 94, 0.8)',
  ];

  const mapGeoData = useMemo(() => {
    if (selectedSpecies === 'all') {
      return geoData;
    }

    const selected = selectedSpecies.toLowerCase();
    return geoData.filter((item) => String(item.species || '').toLowerCase() === selected);
  }, [geoData, selectedSpecies]);

  const searchSpeciesHotspot = async () => {
    const query = speciesQuery.trim();

    if (!query) {
      setHotspotArea(null);
      setSearchError('Enter a species name first');
      return;
    }

    try {
      setSearchingHotspot(true);
      setSearchError(null);

      const res = await fisheriesAPI.getHighestPopulationArea(query);
      const area = res?.data?.data ?? null;

      if (!area) {
        setHotspotArea(null);
        setSearchError('No population records found for this species');
        return;
      }

      setHotspotArea(area);
      const resolvedSpecies = area.matched_species?.[0] || query;
      setSelectedSpecies(resolvedSpecies);
    } catch (error) {
      console.error('Failed to fetch species hotspot:', error);
      setHotspotArea(null);
      setSearchError('Could not fetch highest population area');
    } finally {
      setSearchingHotspot(false);
    }
  };

  const doughnutData = {
    labels: speciesData.slice(0, 8).map((s) => s.common_name || s.species),
    datasets: [
      {
        data: speciesData.slice(0, 8).map((s) => parseInt(s.total_abundance)),
        backgroundColor: speciesColors,
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const abundanceLineData = {
    labels: temporalData.slice(0, 12).map((t) => {
      const date = new Date(t.month);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Total Abundance',
        data: temporalData.slice(0, 12).map((t) => parseInt(t.total_abundance)),
        borderColor: 'rgba(14, 165, 233, 1)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const biomassBarData = {
    labels: speciesData.slice(0, 10).map((s) => {
      const name = s.common_name || s.species;
      return name.length > 12 ? name.substring(0, 12) + '...' : name;
    }),
    datasets: [
      {
        label: 'Biomass (kg)',
        data: speciesData.slice(0, 10).map((s) => parseFloat(s.total_biomass)),
        backgroundColor: speciesColors,
        borderRadius: 6,
        barThickness: 24,
      },
    ],
  };

  const environmentalData = {
    labels: temporalData.slice(0, 12).map((t) => {
      const date = new Date(t.month);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }),
    datasets: [
      ...(showTemperature ? [{
        label: 'Temperature (°C)',
        data: temporalData.slice(0, 12).map((t) => parseFloat(t.avg_temp) || 25 + Math.random() * 5),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y',
      }] : []),
      ...(showSalinity ? [{
        label: 'Salinity (PSU)',
        data: temporalData.slice(0, 12).map((t) => parseFloat(t.avg_salinity) || 33 + Math.random() * 3),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y1',
      }] : []),
      ...(showPH ? [{
        label: 'pH',
        data: temporalData.slice(0, 12).map((t) => parseFloat(t.avg_ph) || 7.8 + Math.random() * 0.5),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        yAxisID: 'y2',
      }] : []),
    ],
  };

  const analysisLenses = useMemo(() => {
    const totalAbundance = Number(metrics?.total_abundance || 0);
    const totalBiomass = Number(metrics?.total_biomass || 0);

    const abundanceBySpecies = speciesData
      .map((item) => Number(item?.total_abundance || 0))
      .filter((value) => Number.isFinite(value));

    const topAbundance = abundanceBySpecies.length ? Math.max(...abundanceBySpecies) : 0;
    const dominanceRatio = totalAbundance > 0 ? (topAbundance / totalAbundance) * 100 : null;

    const shannonLike = abundanceBySpecies.reduce((acc, abundance) => {
      if (totalAbundance <= 0 || abundance <= 0) {
        return acc;
      }

      const p = abundance / totalAbundance;
      return acc - p * Math.log(p);
    }, 0);
    const maxEntropy = abundanceBySpecies.length > 1 ? Math.log(abundanceBySpecies.length) : 0;
    const diversityPressure = maxEntropy > 0 ? (1 - shannonLike / maxEntropy) * 100 : null;

    const biomassEfficiency = totalAbundance > 0 ? totalBiomass / totalAbundance : null;

    const temps = temporalData
      .map((t) => Number(t?.avg_temp))
      .filter((value) => Number.isFinite(value));
    const abundanceTrend = temporalData
      .map((t) => Number(t?.total_abundance))
      .filter((value) => Number.isFinite(value));

    const tempRange = temps.length ? Math.max(...temps) - Math.min(...temps) : null;
    const abundanceRange = abundanceTrend.length
      ? Math.max(...abundanceTrend) - Math.min(...abundanceTrend)
      : null;
    const couplingScore =
      tempRange !== null && abundanceRange !== null
        ? Math.min(100, Math.round((abundanceRange / Math.max(tempRange, 1)) * 0.5))
        : null;

    return {
      dominanceRatio,
      diversityPressure,
      biomassEfficiency,
      couplingScore,
    };
  }, [metrics, speciesData, temporalData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fisheries data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dcfce7,_#f8fafc_35%,_#f8fafc_100%)]">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur border-b border-emerald-100">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Fish className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Fisheries Strategy Desk</h1>
                <p className="text-gray-500">Understand stock structure, pressure, and environmental coupling</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowAdvancedAnalysis((prev) => !prev)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  showAdvancedAnalysis
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Advanced Analysis: {showAdvancedAnalysis ? 'On' : 'Off'}
              </button>
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
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Total Abundance</h3>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseInt(metrics.total_abundance).toLocaleString()}</p>
              <p className="text-sm opacity-70 mt-2">+12% from last month</p>
            </div>
            <div className="kpi-card kpi-card-green">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Total Biomass</h3>
                <Scale className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(metrics.total_biomass).toFixed(0)} kg</p>
              <p className="text-sm opacity-70 mt-2">Across all species</p>
            </div>
            <div className="kpi-card kpi-card-purple">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Avg Diversity Index</h3>
                <Layers className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{parseFloat(metrics.avg_diversity).toFixed(2)}</p>
              <p className="text-sm opacity-70 mt-2">Shannon Index</p>
            </div>
            <div className="kpi-card kpi-card-orange">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm opacity-90">Species Count</h3>
                <Fish className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-bold">{metrics.species_count}</p>
              <p className="text-sm opacity-70 mt-2">Unique species tracked</p>
            </div>
          </div>
        )}

        {showAdvancedAnalysis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <LensCard
              title="Dominance Lens"
              value={
                analysisLenses.dominanceRatio !== null
                  ? `${analysisLenses.dominanceRatio.toFixed(1)}%`
                  : '-'
              }
              note="Share held by the most dominant species"
              tone="bg-amber-50 text-amber-700"
            />
            <LensCard
              title="Diversity Lens"
              value={
                analysisLenses.diversityPressure !== null
                  ? `${analysisLenses.diversityPressure.toFixed(1)}%`
                  : '-'
              }
              note="Concentration pressure from normalized entropy"
              tone="bg-emerald-50 text-emerald-700"
            />
            <LensCard
              title="Efficiency Lens"
              value={
                analysisLenses.biomassEfficiency !== null
                  ? `${analysisLenses.biomassEfficiency.toFixed(2)}`
                  : '-'
              }
              note="Biomass generated per abundance unit"
              tone="bg-sky-50 text-sky-700"
            />
            <LensCard
              title="Coupling Lens"
              value={analysisLenses.couplingScore !== null ? `${analysisLenses.couplingScore}` : '-'}
              note="Temperature-abundance sensitivity index"
              tone="bg-violet-50 text-violet-700"
            />
          </div>
        ) : null}

        <div className="card mb-8 border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900">How To Read This Page</h2>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700">Fisheries Brief</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/90 p-4 border border-emerald-100">
              <p className="text-xs font-semibold tracking-wide uppercase text-emerald-700">Structure</p>
              <p className="text-sm text-gray-700 mt-1">Dominance and Diversity lenses reveal whether stocks are balanced or concentrated.</p>
            </div>
            <div className="rounded-lg bg-white/90 p-4 border border-emerald-100">
              <p className="text-xs font-semibold tracking-wide uppercase text-emerald-700">Performance</p>
              <p className="text-sm text-gray-700 mt-1">Efficiency lens connects abundance with biomass to evaluate ecosystem productivity.</p>
            </div>
            <div className="rounded-lg bg-white/90 p-4 border border-emerald-100">
              <p className="text-xs font-semibold tracking-wide uppercase text-emerald-700">Drivers</p>
              <p className="text-sm text-gray-700 mt-1">Use Coupling lens and environmental chart to interpret possible climate sensitivity.</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Species Composition */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Species Composition</h2>
              <span className="badge badge-blue">Top 8 Species</span>
            </div>
            <div className="flex items-center justify-center">
              <div style={{ width: '300px', height: '300px' }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          padding: 15,
                          usePointStyle: true,
                          font: {
                            size: 11,
                          },
                        },
                      },
                    },
                    cutout: '65%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Abundance Trends */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Abundance Trends</h2>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Last 12 months</span>
              </div>
            </div>
            <div className="chart-container" style={{ height: '280px' }}>
              <Line
                data={abundanceLineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
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

          {/* Biomass Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-900">Biomass by Species</h2>
              <span className="badge badge-green">Kilograms</span>
            </div>
            <div className="chart-container" style={{ height: '280px' }}>
              <Bar
                data={biomassBarData}
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

          {/* Environmental Factors */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900">Environmental Factors</h2>
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTemperature}
                  onChange={(e) => setShowTemperature(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-600">Temperature</span>
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSalinity}
                  onChange={(e) => setShowSalinity(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Salinity</span>
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPH}
                  onChange={(e) => setShowPH(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-600">pH Level</span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              </label>
            </div>
            <div className="chart-container" style={{ height: '240px' }}>
              <Line
                data={environmentalData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: showTemperature,
                      position: 'left',
                      grid: {
                        color: 'rgba(0,0,0,0.05)',
                      },
                      title: {
                        display: true,
                        text: 'Temp (°C)',
                        font: { size: 10 },
                      },
                    },
                    y1: {
                      type: 'linear',
                      display: showSalinity,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'Salinity (PSU)',
                        font: { size: 10 },
                      },
                    },
                    y2: {
                      type: 'linear',
                      display: showPH,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'pH',
                        font: { size: 10 },
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
        </div>

        {/* Map Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-marine-600" />
              <h2 className="text-lg font-semibold text-navy-900">Fishing Zones Distribution</h2>
            </div>
            <span className="text-sm text-gray-500">{mapGeoData.length} monitoring stations</span>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="select"
              >
                <option value="all">All Species</option>
                {speciesData.map((s, idx) => (
                  <option key={idx} value={s.species}>
                    {s.common_name || s.species}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  value={speciesQuery}
                  onChange={(e) => setSpeciesQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchSpeciesHotspot();
                    }
                  }}
                  className="input min-w-[260px]"
                  placeholder="Search species for top population area"
                  list="species-options"
                />
                <datalist id="species-options">
                  {speciesData.map((s, idx) => (
                    <option key={idx} value={s.species} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={searchSpeciesHotspot}
                  className="btn-secondary"
                  disabled={searchingHotspot}
                >
                  {searchingHotspot ? 'Searching...' : 'Find Hotspot'}
                </button>
              </div>
            </div>
          </div>

          {searchError ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {searchError}
            </div>
          ) : null}

          {hotspotArea ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span className="font-semibold">Highest population area:</span> {hotspotArea.region} with{' '}
              {Number(hotspotArea.total_abundance).toLocaleString()} abundance across {hotspotArea.observations} observations.
            </div>
          ) : null}

          <div className="h-[500px] rounded-xl overflow-hidden border border-gray-200">
            <MapView
              data={mapGeoData}
              type="fisheries"
              highlightPoint={
                hotspotArea
                  ? {
                      latitude: Number(hotspotArea.center_latitude),
                      longitude: Number(hotspotArea.center_longitude),
                      label: hotspotArea.region,
                      description: `${Number(hotspotArea.total_abundance).toLocaleString()} abundance`,
                    }
                  : null
              }
            />
          </div>
        </div>

        {/* Species Table */}
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-navy-900">Species Details</h2>
            <span className="text-sm text-gray-500">{speciesData.length} species</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">Species</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Abundance</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Biomass (kg)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-sm">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {speciesData.slice(0, 10).map((species, idx) => {
                  const abundance = parseInt(species.total_abundance);
                  const maxAbundance = Math.max(...speciesData.map(s => parseInt(s.total_abundance)));
                  const percentage = (abundance / maxAbundance) * 100;

                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: speciesColors[idx] }}
                          ></div>
                          <div>
                            <p className="font-medium text-navy-900">{species.common_name || species.species}</p>
                            <p className="text-xs text-gray-500 italic">{species.species}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">{abundance.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-medium">{parseFloat(species.total_biomass).toFixed(0)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: speciesColors[idx],
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500 w-12 text-right">{percentage.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LensCard({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <div className={`px-2.5 py-1 rounded-md text-xs font-semibold ${tone}`}>Lens</div>
      </div>
      <p className="text-3xl font-semibold text-navy-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{note}</p>
    </div>
  );
}
