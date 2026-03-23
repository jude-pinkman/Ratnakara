'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Search, Filter, Layers, Info, TrendingUp, Fish,
  Droplets, Dna, AlertTriangle, ChevronRight, X, RefreshCcw
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Dynamically import the map component (no SSR for Leaflet)
const InteractiveMap = dynamic(() => import('../../components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading map...</p>
      </div>
    </div>
  )
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MapMarker {
  lat: number;
  lng: number;
  type: 'ocean' | 'fisheries' | 'edna' | 'mixed';
  data?: any;
}

interface LocationData {
  location: { latitude: number; longitude: number; radiusKm: number };
  stats: {
    ocean: { count: number; avgTemp: number | null; avgSalinity: number | null; avgOxygen: number | null };
    fisheries: { count: number; uniqueSpecies: number; totalAbundance: number; totalBiomass: number };
    edna: { count: number; detectedSpecies: number; avgConcentration: number | null };
  };
  speciesSummary: Array<{ species: string; sources: string[]; totalAbundance: number; avgConcentration: number }>;
  recentData: {
    ocean: any[];
    fisheries: any[];
    edna: any[];
  };
}

interface InsightData {
  insight: string;
  type: 'correlation' | 'trend' | 'anomaly' | 'prediction';
  confidence: number;
  relatedFactors: string[];
  recommendation?: string;
}

interface RegionData {
  name: string;
  center: { lat: number; lng: number };
  stats: {
    avgTemp: number;
    avgSalinity: number;
    avgOxygen: number;
    observationCount: number;
    speciesCount: number;
    totalAbundance: number;
  };
}

const DATA_TYPES = [
  { id: 'all', label: 'All Data', icon: Layers, color: 'bg-gray-500' },
  { id: 'ocean', label: 'Ocean', icon: Droplets, color: 'bg-cyan-500' },
  { id: 'fisheries', label: 'Fisheries', icon: Fish, color: 'bg-emerald-500' },
  { id: 'edna', label: 'eDNA', icon: Dna, color: 'bg-purple-500' }
];

const HEATMAP_PARAMS = [
  { id: 'temperature', label: 'Temperature', unit: '°C' },
  { id: 'salinity', label: 'Salinity', unit: 'PSU' },
  { id: 'oxygen', label: 'Dissolved O₂', unit: 'mg/L' },
  { id: 'abundance', label: 'Fish Abundance', unit: 'count' },
  { id: 'edna_concentration', label: 'eDNA Concentration', unit: '/L' }
];

const PIE_COLORS = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export default function ExplorerPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [heatmapParam, setHeatmapParam] = useState('temperature');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(5);

  // Fetch cluster data based on type and zoom
  const fetchClusters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/geo/clusters?type=${selectedType}&zoom=${zoom}`);
      const result = await response.json();

      if (result.success) {
        setMarkers(result.data.map((c: any) => ({
          lat: c.lat,
          lng: c.lng,
          type: c.type,
          data: { count: c.count, ...c.data }
        })));
      }
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      // Use mock data if API fails
      setMarkers(generateMockMarkers());
    } finally {
      setLoading(false);
    }
  }, [selectedType, zoom]);

  // Fetch heatmap data
  const fetchHeatmap = useCallback(async () => {
    if (!showHeatmap) {
      setHeatmapData([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/geo/heatmap/${heatmapParam}?gridSize=0.5`);
      const result = await response.json();

      if (result.success) {
        setHeatmapData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
      setHeatmapData(generateMockHeatmap());
    }
  }, [heatmapParam, showHeatmap]);

  // Fetch location-specific data
  const fetchLocationData = useCallback(async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/geo/point/${lat}/${lng}?radius=25`);
      const result = await response.json();

      if (result.success) {
        setLocationData(result);
      }
    } catch (error) {
      console.error('Failed to fetch location data:', error);
      setLocationData(generateMockLocationData(lat, lng));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/insights/generate`);
      const result = await response.json();

      if (result.success) {
        setInsights(result.insights);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setInsights(generateMockInsights());
    }
  }, []);

  // Fetch regions
  const fetchRegions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/geo/regions`);
      const result = await response.json();

      if (result.success) {
        setRegions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      setRegions(generateMockRegions());
    }
  }, []);

  // Search locations
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/geo/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Mock data generators
  const generateMockMarkers = (): MapMarker[] => {
    const types: Array<'ocean' | 'fisheries' | 'edna'> = ['ocean', 'fisheries', 'edna'];
    return Array.from({ length: 50 }, (_, i) => ({
      lat: 8 + Math.random() * 15,
      lng: 68 + Math.random() * 25,
      type: types[i % 3],
      data: {
        count: Math.floor(Math.random() * 100) + 10,
        avgTemp: 25 + Math.random() * 8,
        avgOxygen: 4 + Math.random() * 4,
        speciesCount: Math.floor(Math.random() * 30) + 5,
        totalAbundance: Math.floor(Math.random() * 10000) + 1000
      }
    }));
  };

  const generateMockHeatmap = () => {
    return Array.from({ length: 100 }, () => ({
      lat: 8 + Math.random() * 15,
      lng: 68 + Math.random() * 25,
      value: 20 + Math.random() * 15,
      intensity: Math.random()
    }));
  };

  const generateMockLocationData = (lat: number, lng: number): LocationData => ({
    location: { latitude: lat, longitude: lng, radiusKm: 25 },
    stats: {
      ocean: { count: 45, avgTemp: 27.5, avgSalinity: 34.2, avgOxygen: 6.1 },
      fisheries: { count: 120, uniqueSpecies: 23, totalAbundance: 15000, totalBiomass: 2500 },
      edna: { count: 35, detectedSpecies: 18, avgConcentration: 245.5 }
    },
    speciesSummary: [
      { species: 'Sardinella longiceps', sources: ['fisheries', 'edna'], totalAbundance: 5000, avgConcentration: 320 },
      { species: 'Rastrelliger kanagurta', sources: ['fisheries', 'edna'], totalAbundance: 3500, avgConcentration: 280 },
      { species: 'Thunnus albacares', sources: ['fisheries'], totalAbundance: 1200, avgConcentration: 0 },
      { species: 'Katsuwonus pelamis', sources: ['fisheries', 'edna'], totalAbundance: 2800, avgConcentration: 190 },
      { species: 'Scomberomorus guttatus', sources: ['edna'], totalAbundance: 0, avgConcentration: 410 }
    ],
    recentData: { ocean: [], fisheries: [], edna: [] }
  });

  const generateMockInsights = (): InsightData[] => [
    {
      insight: 'Strong positive correlation (r=0.78) between temperature and fish abundance in Bay of Bengal.',
      type: 'correlation',
      confidence: 92,
      relatedFactors: ['temperature', 'abundance', 'seasonal_variation'],
      recommendation: 'Monitor temperature changes closely during fishing seasons.'
    },
    {
      insight: 'Oxygen levels in Arabian Sea showing 8% decline over past 6 months. Potential hypoxia risk.',
      type: 'anomaly',
      confidence: 88,
      relatedFactors: ['dissolved_oxygen', 'climate_change'],
      recommendation: 'Implement continuous monitoring in affected areas.'
    },
    {
      insight: 'eDNA detection rate for Sardinella longiceps increased 25% during monsoon season.',
      type: 'trend',
      confidence: 85,
      relatedFactors: ['seasonality', 'breeding_cycles'],
      recommendation: 'Focus sampling efforts during monsoon for better coverage.'
    }
  ];

  const generateMockRegions = (): RegionData[] => [
    { name: 'Bay of Bengal', center: { lat: 15, lng: 87 }, stats: { avgTemp: 28.5, avgSalinity: 33.8, avgOxygen: 5.8, observationCount: 1250, speciesCount: 145, totalAbundance: 125000 } },
    { name: 'Arabian Sea', center: { lat: 15, lng: 70 }, stats: { avgTemp: 27.2, avgSalinity: 36.1, avgOxygen: 6.2, observationCount: 980, speciesCount: 128, totalAbundance: 98000 } },
    { name: 'Andaman Sea', center: { lat: 10, lng: 95 }, stats: { avgTemp: 29.1, avgSalinity: 32.5, avgOxygen: 5.5, observationCount: 450, speciesCount: 156, totalAbundance: 45000 } }
  ];

  // Effects
  useEffect(() => {
    fetchClusters();
    fetchInsights();
    fetchRegions();
  }, [fetchClusters, fetchInsights, fetchRegions]);

  useEffect(() => {
    fetchHeatmap();
  }, [fetchHeatmap]);

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    fetchLocationData(lat, lng);
    setSidebarOpen(true);
    toast.success(`Location selected: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
  };

  // Handle marker click
  const handleMarkerClick = (marker: MapMarker) => {
    handleMapClick(marker.lat, marker.lng);
  };

  // Handle search result click
  const handleSearchResultClick = (result: any) => {
    setSelectedLocation({ lat: result.lat, lng: result.lng });
    fetchLocationData(result.lat, result.lng);
    setSearchQuery('');
    setSearchResults([]);
    setSidebarOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">Marine Data Explorer</h1>
              <p className="text-sm text-gray-500">Interactive location-based data discovery</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8 relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations, species, or coordinates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto"
                >
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{result.name}</p>
                          <p className="text-xs text-gray-500">{result.region} • {result.type}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => {
              fetchClusters();
              fetchHeatmap();
              toast.success('Data refreshed');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Map Controls */}
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2">
          {DATA_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center transition-all
                  ${selectedType === type.id
                    ? `${type.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
                title={type.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}

          <div className="h-px w-8 bg-gray-200 my-2" />

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${showHeatmap ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
            title="Toggle Heatmap"
          >
            <Layers className="w-5 h-5" />
          </button>

          {showHeatmap && (
            <select
              value={heatmapParam}
              onChange={(e) => setHeatmapParam(e.target.value)}
              className="w-10 h-10 rounded-lg bg-gray-100 text-xs text-center cursor-pointer"
              title="Heatmap Parameter"
            >
              {HEATMAP_PARAMS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <InteractiveMap
            markers={markers}
            heatmapData={showHeatmap ? heatmapData : []}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            showLegend={true}
            parameter={heatmapParam}
          />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Quick Stats Overlay */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
            <div className="text-xs font-semibold text-gray-700 mb-2">Quick Stats</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <p className="font-bold text-cyan-600">{markers.filter(m => m.type === 'ocean').length}</p>
                <p className="text-gray-500">Ocean</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-600">{markers.filter(m => m.type === 'fisheries').length}</p>
                <p className="text-gray-500">Fish</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-purple-600">{markers.filter(m => m.type === 'edna').length}</p>
                <p className="text-gray-500">eDNA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white border-l border-gray-200 overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">
                    {selectedLocation ? 'Location Details' : 'AI Insights'}
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedLocation(null);
                      setLocationData(null);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Location Data */}
                {selectedLocation && locationData && (
                  <div className="space-y-4">
                    {/* Coordinates */}
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-100">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-cyan-600" />
                        <span className="text-sm font-medium text-cyan-900">Selected Location</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lng.toFixed(4)}°E
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Radius: {locationData.location.radiusKm} km
                      </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-cyan-50 rounded-lg p-3 text-center">
                        <Droplets className="w-4 h-4 text-cyan-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-cyan-900">{locationData.stats.ocean.count}</p>
                        <p className="text-xs text-cyan-600">Ocean Records</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <Fish className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-emerald-900">{locationData.stats.fisheries.uniqueSpecies}</p>
                        <p className="text-xs text-emerald-600">Species</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <Dna className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-purple-900">{locationData.stats.edna.detectedSpecies}</p>
                        <p className="text-xs text-purple-600">eDNA Species</p>
                      </div>
                    </div>

                    {/* Environmental Conditions */}
                    {locationData.stats.ocean.avgTemp && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Environmental Conditions</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Temperature</p>
                            <p className="font-semibold text-gray-900">{locationData.stats.ocean.avgTemp.toFixed(1)}°C</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Salinity</p>
                            <p className="font-semibold text-gray-900">{locationData.stats.ocean.avgSalinity?.toFixed(1)} PSU</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Oxygen</p>
                            <p className="font-semibold text-gray-900">{locationData.stats.ocean.avgOxygen?.toFixed(1)} mg/L</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Abundance</p>
                            <p className="font-semibold text-gray-900">{locationData.stats.fisheries.totalAbundance.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Species Composition */}
                    {locationData.speciesSummary.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Top Species</h3>
                        <div style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={locationData.speciesSummary.slice(0, 6)}
                                dataKey="totalAbundance"
                                nameKey="species"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ name }) => name.split(' ')[1]?.substring(0, 8) || name.substring(0, 8)}
                                labelLine={false}
                              >
                                {locationData.speciesSummary.slice(0, 6).map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 space-y-1">
                          {locationData.speciesSummary.slice(0, 5).map((sp, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                                <span className="text-gray-700 italic">{sp.species}</span>
                              </div>
                              <div className="flex gap-2">
                                {sp.sources.includes('fisheries') && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">F</span>
                                )}
                                {sp.sources.includes('edna') && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">E</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Insights (when no location selected) */}
                {!selectedLocation && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                      <Info className="w-4 h-4" />
                      <span className="text-sm">Click anywhere on the map to explore data</span>
                    </div>

                    <h3 className="font-medium text-gray-900">AI-Generated Insights</h3>
                    <div className="space-y-3">
                      {insights.map((insight, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`
                            p-3 rounded-lg border-l-4
                            ${insight.type === 'anomaly' ? 'bg-red-50 border-red-500' :
                              insight.type === 'correlation' ? 'bg-blue-50 border-blue-500' :
                              insight.type === 'trend' ? 'bg-green-50 border-green-500' :
                              'bg-purple-50 border-purple-500'}
                          `}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className={`
                              text-xs font-medium px-2 py-0.5 rounded
                              ${insight.type === 'anomaly' ? 'bg-red-200 text-red-800' :
                                insight.type === 'correlation' ? 'bg-blue-200 text-blue-800' :
                                insight.type === 'trend' ? 'bg-green-200 text-green-800' :
                                'bg-purple-200 text-purple-800'}
                            `}>
                              {insight.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">{insight.confidence}% conf.</span>
                          </div>
                          <p className="text-sm text-gray-700">{insight.insight}</p>
                          {insight.recommendation && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              💡 {insight.recommendation}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Regional Overview */}
                    <h3 className="font-medium text-gray-900 mt-6">Regional Overview</h3>
                    <div className="space-y-2">
                      {regions.map((region, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleMapClick(region.center.lat, region.center.lng)}
                          className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{region.name}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-gray-500">Temp:</span>
                              <span className="ml-1 font-medium">{region.stats.avgTemp?.toFixed(1) || 'N/A'}°C</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Species:</span>
                              <span className="ml-1 font-medium">{region.stats.speciesCount || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Records:</span>
                              <span className="ml-1 font-medium">{region.stats.observationCount?.toLocaleString() || 'N/A'}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-l-lg p-2 shadow-md z-20"
        >
          <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
