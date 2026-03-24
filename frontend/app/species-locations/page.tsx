'use client';

import { useState, useEffect } from 'react';
import { speciesLocationsAPI } from '@/lib/api';
import MapView from '@/components/MapView';

interface SpeciesLocation {
  latitude: number;
  longitude: number;
  locality: string;
  count: number;
}

interface SpeciesData {
  scientificName: string;
  locations: SpeciesLocation[];
  totalRecords: number;
}

export default function SpeciesLocationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapLocations, setMapLocations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await speciesLocationsAPI.getStats();
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };
    loadStats();
  }, []);

  // Update map when species is selected
  useEffect(() => {
    if (selectedSpecies && selectedSpecies.locations) {
      const markers = selectedSpecies.locations.map((loc, idx) => ({
        id: `${selectedSpecies.scientificName}-${idx}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        title: `${selectedSpecies.scientificName}`,
        description: `${loc.locality} (${loc.count} record${loc.count > 1 ? 's' : ''})`,
        popup: `
          <div>
            <strong>${selectedSpecies.scientificName}</strong>
            <p>${loc.locality}</p>
            <p style="font-size: 0.9em; color: #666;">Records: ${loc.count}</p>
          </div>
        `,
        markerColor: '#ef4444',
      }));
      setMapLocations(markers);
    } else {
      setMapLocations([]);
    }
  }, [selectedSpecies]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a species name');
      return;
    }

    setLoading(true);
    setError('');
    setSelectedSpecies(null);

    try {
      const res = await speciesLocationsAPI.search(searchQuery);
      if (res.data.success && res.data.data) {
        setSelectedSpecies(res.data.data);
      } else {
        setError('Species not found in India dataset. Try searching for common marine species names.');
      }
    } catch (err: any) {
      setError(err.message || 'Error searching for species');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marine Species Locations</h1>
          <p className="text-gray-600">
            Search for marine species found in India's coastal and marine zones and explore their distribution across locations.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Species</h3>
              <div className="text-2xl font-bold text-blue-600">{stats.totalSpecies}</div>
              <p className="text-xs text-gray-500 mt-1">India-only locations</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Locations</h3>
              <div className="text-2xl font-bold text-green-600">{stats.totalLocations}</div>
              <p className="text-xs text-gray-500 mt-1">From taxonomy dataset</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Locations/Species</h3>
              <div className="text-2xl font-bold text-purple-600">{stats.averageLocationsPerSpecies}</div>
              <p className="text-xs text-gray-500 mt-1">per species</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search & Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900">Search Species</h2>
                <p className="text-sm text-gray-500 mt-1">Find species in India's marine zones</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Species Name</label>
                  <input
                    placeholder="e.g., Homolax megalops"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {selectedSpecies && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-3 mt-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedSpecies.scientificName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Total Records:</strong> {selectedSpecies.totalRecords}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Locations:</strong> {selectedSpecies.locations.length}
                      </p>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Locations Found:</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedSpecies.locations.map((loc, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 bg-white rounded border border-gray-200"
                          >
                            <p className="font-medium text-gray-900">{loc.locality}</p>
                            <p className="text-gray-600">
                              {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                            </p>
                            <p className="text-gray-500">Records: {loc.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Species */}
                {stats && stats.topSpecies && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Species</h4>
                    <div className="space-y-2">
                      {stats.topSpecies.slice(0, 5).map((sp: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(sp.scientificName);
                            // Trigger search
                            speciesLocationsAPI.search(sp.scientificName).then((res) => {
                              if (res.data.success && res.data.data) {
                                setSelectedSpecies(res.data.data);
                              }
                            });
                          }}
                          className="w-full text-left p-2 text-xs hover:bg-gray-100 rounded transition border border-gray-200"
                        >
                          <p className="font-medium text-gray-900">{sp.scientificName}</p>
                          <p className="text-gray-600">{sp.recordCount} records</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border border-gray-200 h-full">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900">Distribution Map</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedSpecies
                    ? `Showing ${selectedSpecies.locations.length} locations for ${selectedSpecies.scientificName}`
                    : 'Select a species to view its distribution'}
                </p>
              </div>
              <div className="p-6 h-96 md:h-screen max-h-screen">
                {mapLocations.length > 0 ? (
                  <MapView
                    initialCenter={{
                      lat: 15.5,
                      lng: 80,
                    }}
                    zoom={5}
                    markers={mapLocations}
                    height="100%"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">No Locations</p>
                      <p className="text-sm">Search for a species to view locations on the map</p>
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
