'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, Filter, Layers, TrendingUp, MapPin, Fish, Loader2 } from 'lucide-react';
import axios from 'axios';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  species?: string;
  common_name?: string;
  abundance?: number;
  biomass?: number;
  region?: string;
  locality?: string;
  count?: number;
  title?: string;
  description?: string;
  popup?: string;
}

export default function DynamicMarineMap() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataType, setSelectedDataType] = useState<'fisheries' | 'edna' | 'species'>('species');
  const [allData, setAllData] = useState<MarkerData[]>([]);
  const [filteredData, setFilteredData] = useState<MarkerData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [highlightPoint, setHighlightPoint] = useState<any>(null);

  // Load data based on selected type
  useEffect(() => {
    loadData();
  }, [selectedDataType]);

  const loadData = async () => {
    setLoading(true);
    try {
      let data: MarkerData[] = [];

      if (selectedDataType === 'species') {
        // Load species locations (Indian species)
        const res = await axios.get('http://localhost:3001/api/species-locations');
        if (res.data.success && res.data.data && res.data.data.species) {
          // Flatten all species locations - limit to first 500 for performance
          data = res.data.data.species.slice(0, 100).flatMap((sp: any) =>
            sp.locations.slice(0, 5).map((loc: any, idx: number) => ({
              id: `${sp.scientificName}-${idx}`,
              latitude: loc.latitude,
              longitude: loc.longitude,
              species: sp.scientificName,
              locality: loc.locality,
              count: loc.count,
              region: 'India',
              location: loc.locality,
              station_name: loc.locality,
            }))
          );
        }
      } else if (selectedDataType === 'fisheries') {
        // Load fisheries data
        const res = await axios.get('http://localhost:3001/api/fisheries/geospatial');
        if (res.data.success && res.data.data) {
          data = res.data.data.map((item: any, idx: number) => ({
            id: `fish-${idx}`,
            latitude: item.latitude,
            longitude: item.longitude,
            species: item.species,
            common_name: item.common_name,
            abundance: item.abundance,
            biomass: item.biomass,
            region: item.region,
            location: item.region,
          }));
        }
      } else if (selectedDataType === 'edna') {
        // Load eDNA data
        const res = await axios.get('http://localhost:3001/api/edna');
        if (res.data.success && res.data.data) {
          data = res.data.data.map((item: any, idx: number) => ({
            id: `edna-${idx}`,
            latitude: item.latitude,
            longitude: item.longitude,
            species: item.species,
            concentration: item.concentration,
            confidence: item.confidence,
            region: item.source,
            location: item.source,
          }));
        }
      }

      setAllData(data);
      setFilteredData(data);
      
      // Calculate stats
      const uniqueSpecies = new Set(data.map(d => d.species).filter(Boolean));
      const uniqueRegions = new Set(data.map(d => d.region).filter(Boolean));
      setStats({
        totalMarkers: data.length,
        uniqueSpecies: uniqueSpecies.size,
        uniqueRegions: uniqueRegions.size,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredData(allData);
      setHighlightPoint(null);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allData.filter(item =>
      item.species?.toLowerCase().includes(query) ||
      item.common_name?.toLowerCase().includes(query) ||
      item.locality?.toLowerCase().includes(query) ||
      item.region?.toLowerCase().includes(query)
    );

    setFilteredData(filtered);

    // Find highest abundance/count point
    if (filtered.length > 0) {
      const topPoint = filtered.reduce((max, item) => {
        const value = item.abundance || item.count || 0;
        const maxValue = max.abundance || max.count || 0;
        return value > maxValue ? item : max;
      });

      setHighlightPoint({
        latitude: topPoint.latitude,
        longitude: topPoint.longitude,
        label: topPoint.species || topPoint.locality || 'Hotspot',
        description: `${topPoint.description || ''} - Top location`,
      });
    } else {
      setHighlightPoint(null);
    }
  };

  // Top species by count
  const topSpecies = useMemo(() => {
    const speciesCount = new Map<string, number>();
    allData.forEach(item => {
      if (item.species) {
        const count = speciesCount.get(item.species) || 0;
        speciesCount.set(item.species, count + (item.count || item.abundance || 1));
      }
    });

    return Array.from(speciesCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([species, count]) => ({ species, count }));
  }, [allData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <MapPin className="w-10 h-10 text-blue-600" />
            🇮🇳 Dynamic Marine Species Map
          </h1>
          <p className="text-gray-600">
            Real-time visualization of marine species across Indian waters with live search and filtering
          </p>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Markers</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalMarkers}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-green-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Species</p>
                  <p className="text-2xl font-bold text-green-600">{stats.uniqueSpecies}</p>
                </div>
                <Fish className="w-8 h-8 text-green-200" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-purple-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Regions</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.uniqueRegions}</p>
                </div>
                <Layers className="w-8 h-8 text-purple-200" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-orange-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Filtered</p>
                  <p className="text-2xl font-bold text-orange-600">{filteredData.length}</p>
                </div>
                <Filter className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Data Type Selector */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Data Layer
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'species', label: '🐟 Species Locations', count: '1000+' },
                  { value: 'fisheries', label: '🎣 Fisheries Data', count: '120' },
                  { value: 'edna', label: '🧬 eDNA Samples', count: '90' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDataType(option.value as any)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedDataType === option.value
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs opacity-75">{option.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Search & Filter
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search species, region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilteredData(allData);
                      setHighlightPoint(null);
                    }}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Top Species */}
            <div className="bg-white rounded-lg shadow-lg p-6 max-h-96 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Top Species
              </h3>
              <div className="space-y-2">
                {topSpecies.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item.species);
                      handleSearch();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{item.species}</span>
                      <span className="text-xs text-blue-600 font-semibold">{item.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '800px' }}>
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  Live Map - {filteredData.length} markers
                  {searchQuery && ` (filtered by "${searchQuery}")`}
                </h2>
              </div>
              <div className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                ) : filteredData.length > 0 ? (
                  <MapView
                    data={filteredData}
                    type={selectedDataType}
                    highlightPoint={highlightPoint}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="text-center">
                      <Fish className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No data found</p>
                      <p className="text-sm text-gray-500">Try a different search or data layer</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
