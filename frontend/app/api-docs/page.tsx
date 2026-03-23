'use client';

import { useState } from 'react';
import { FileCode2, Copy, Check, ChevronDown, ChevronRight, ExternalLink, Zap, Map, TrendingUp, Bell, Dna, Fish, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: { name: string; type: string; required?: boolean; description: string }[];
  body?: Record<string, any>;
  response?: Record<string, any>;
}

interface ApiCategory {
  category: string;
  icon: any;
  color: string;
  description: string;
  endpoints: ApiEndpoint[];
}

const apiEndpoints: ApiCategory[] = [
  {
    category: 'Unified Insights',
    icon: Zap,
    color: 'amber',
    description: 'AI-powered data integration and insights generation',
    endpoints: [
      {
        method: 'GET', path: '/api/insights/unified',
        description: 'Get unified data connecting Ocean + Fisheries + eDNA by location and time',
        params: [
          { name: 'lat', type: 'number', description: 'Latitude for location filter' },
          { name: 'lng', type: 'number', description: 'Longitude for location filter' },
          { name: 'radius', type: 'number', description: 'Search radius in km (default: 50)' },
          { name: 'startDate', type: 'ISO Date', description: 'Filter from date' },
          { name: 'endDate', type: 'ISO Date', description: 'Filter to date' },
          { name: 'region', type: 'string', description: 'Filter by region name' },
          { name: 'limit', type: 'number', description: 'Max results (default: 500)' },
        ],
        response: { success: true, data: [{ latitude: 15.5, longitude: 80.2, temperature: 28.5, species: "..." }], count: 500, schema: "darwin_core_v2" }
      },
      {
        method: 'GET', path: '/api/insights/location/:lat/:lng',
        description: 'Get aggregated data for a specific location with radius',
        params: [
          { name: 'radius', type: 'number', description: 'Search radius in km (default: 25)' },
        ],
        response: { success: true, location: {}, data: { ocean: {}, fisheries: {}, edna: {}, topSpecies: [] } }
      },
      {
        method: 'GET', path: '/api/insights/generate',
        description: 'Generate AI insights from correlation analysis',
        params: [
          { name: 'region', type: 'string', description: 'Filter by region' },
          { name: 'species', type: 'string', description: 'Filter by species' },
        ],
        response: { success: true, insights: [{ insight: "...", type: "correlation", confidence: 92, recommendation: "..." }] }
      },
      {
        method: 'GET', path: '/api/insights/heatmap',
        description: 'Get gridded data for heatmap visualization',
        params: [
          { name: 'parameter', type: 'string', description: 'temperature|salinity|ph|oxygen|abundance|biodiversity' },
          { name: 'gridSize', type: 'number', description: 'Grid cell size in degrees (default: 0.5)' },
        ]
      },
      {
        method: 'GET', path: '/api/insights/timeline',
        description: 'Get temporal data for trends visualization',
        params: [
          { name: 'parameter', type: 'string', description: 'Parameter to analyze' },
          { name: 'resolution', type: 'string', description: 'day|week|month|year' },
          { name: 'region', type: 'string', description: 'Filter by region' },
        ]
      },
      {
        method: 'GET', path: '/api/insights/regions',
        description: 'Get summary statistics by region'
      },
      {
        method: 'GET', path: '/api/insights/species-environment',
        description: 'Get species-environment relationship analysis',
        params: [
          { name: 'species', type: 'string', description: 'Filter by species' },
        ]
      },
    ],
  },
  {
    category: 'Geospatial',
    icon: Map,
    color: 'cyan',
    description: 'Location-based queries and map data',
    endpoints: [
      {
        method: 'GET', path: '/api/geo/stations',
        description: 'Get all monitoring stations',
        params: [
          { name: 'type', type: 'string', description: 'all|ocean|fisheries|edna' },
        ]
      },
      {
        method: 'GET', path: '/api/geo/clusters',
        description: 'Get clustered map markers based on zoom level',
        params: [
          { name: 'zoom', type: 'number', description: 'Map zoom level (default: 6)' },
          { name: 'bounds', type: 'string', description: 'Viewport bounds: minLat,minLng,maxLat,maxLng' },
          { name: 'type', type: 'string', description: 'Data type filter' },
        ]
      },
      {
        method: 'GET', path: '/api/geo/point/:lat/:lng',
        description: 'Get all data near a specific point',
        params: [
          { name: 'radius', type: 'number', description: 'Search radius in km (default: 10)' },
        ]
      },
      {
        method: 'GET', path: '/api/geo/heatmap/:parameter',
        description: 'Get heatmap data for a specific parameter',
        params: [
          { name: 'gridSize', type: 'number', description: 'Grid size in degrees' },
          { name: 'bounds', type: 'string', description: 'Viewport bounds' },
        ]
      },
      {
        method: 'GET', path: '/api/geo/regions',
        description: 'Get regional boundaries and statistics'
      },
      {
        method: 'GET', path: '/api/geo/search',
        description: 'Search locations by name or coordinates',
        params: [
          { name: 'q', type: 'string', required: true, description: 'Search query' },
          { name: 'type', type: 'string', description: 'Filter by type' },
        ]
      },
    ],
  },
  {
    category: 'Biodiversity',
    icon: Dna,
    color: 'purple',
    description: 'DNA sequences, species richness, and Darwin Core data',
    endpoints: [
      {
        method: 'GET', path: '/api/biodiversity/sequences',
        description: 'Get DNA sequence library',
        params: [
          { name: 'gene', type: 'string', description: '16S|COX1|ITS|rbcL|matK|All' },
          { name: 'species', type: 'string', description: 'Filter by species' },
          { name: 'minIdentity', type: 'number', description: 'Minimum BLAST identity %' },
          { name: 'limit', type: 'number', description: 'Results per page' },
          { name: 'offset', type: 'number', description: 'Pagination offset' },
        ]
      },
      {
        method: 'GET', path: '/api/biodiversity/anomalies',
        description: 'Get environmental anomalies detected by Z-score analysis',
        params: [
          { name: 'parameter', type: 'string', description: 'Filter by parameter' },
          { name: 'alertLevel', type: 'string', description: 'warning|critical' },
          { name: 'acknowledged', type: 'boolean', description: 'Filter by acknowledgment' },
        ]
      },
      { method: 'POST', path: '/api/biodiversity/anomalies/:id/acknowledge', description: 'Acknowledge an anomaly', body: { acknowledgedBy: 'string', notes: 'string' } },
      { method: 'GET', path: '/api/biodiversity/richness', description: 'Get species richness by region' },
      { method: 'GET', path: '/api/biodiversity/comparison', description: 'Compare eDNA vs traditional detection methods' },
      { method: 'GET', path: '/api/biodiversity/kpis', description: 'Get biodiversity KPI summary' },
      { method: 'GET', path: '/api/biodiversity/genes', description: 'Get list of available gene markers' },
      {
        method: 'GET', path: '/api/biodiversity/export/darwin-core',
        description: 'Export data in Darwin Core format for GBIF',
        params: [
          { name: 'region', type: 'string', description: 'Filter by region' },
          { name: 'startDate', type: 'ISO Date', description: 'Filter from date' },
          { name: 'endDate', type: 'ISO Date', description: 'Filter to date' },
          { name: 'limit', type: 'number', description: 'Max records (default: 1000)' },
        ]
      },
    ],
  },
  {
    category: 'Alerts',
    icon: Bell,
    color: 'red',
    description: 'Real-time monitoring and alert management',
    endpoints: [
      { method: 'GET', path: '/api/alerts/active', description: 'Get all active alerts', params: [{ name: 'severity', type: 'string', description: 'warning|critical' }, { name: 'parameter', type: 'string', description: 'Filter by parameter' }, { name: 'acknowledged', type: 'boolean', description: 'Filter by status' }] },
      { method: 'GET', path: '/api/alerts/summary', description: 'Get alert summary statistics' },
      { method: 'GET', path: '/api/alerts/by-region', description: 'Get alerts grouped by region' },
      { method: 'GET', path: '/api/alerts/by-parameter', description: 'Get alerts grouped by parameter' },
      { method: 'POST', path: '/api/alerts/:id/acknowledge', description: 'Acknowledge an alert', body: { acknowledgedBy: 'string', notes: 'string' } },
      { method: 'POST', path: '/api/alerts/acknowledge-batch', description: 'Acknowledge multiple alerts', body: { ids: ['uuid[]'], acknowledgedBy: 'string' } },
      { method: 'GET', path: '/api/alerts/configs', description: 'Get alert configurations' },
      { method: 'POST', path: '/api/alerts/check', description: 'Manually trigger alert check' },
      { method: 'GET', path: '/api/alerts/trends', description: 'Get alert trends over time', params: [{ name: 'days', type: 'number', description: 'Lookback period (default: 30)' }] },
    ],
  },
  {
    category: 'Ocean Data',
    icon: Droplets,
    color: 'blue',
    description: 'Oceanographic monitoring data',
    endpoints: [
      { method: 'GET', path: '/api/ocean', description: 'Retrieve all ocean data with optional filters', params: [{ name: 'region', type: 'string', description: 'Filter by region' }, { name: 'minTemp', type: 'number', description: 'Minimum temperature' }, { name: 'maxTemp', type: 'number', description: 'Maximum temperature' }] },
      { method: 'GET', path: '/api/ocean/kpis', description: 'Get key performance indicators' },
      { method: 'GET', path: '/api/ocean/trends', description: 'Get monthly temperature/salinity trends' },
      { method: 'GET', path: '/api/ocean/geospatial', description: 'Get geospatial station data' },
    ],
  },
  {
    category: 'Fisheries',
    icon: Fish,
    color: 'emerald',
    description: 'Fisheries and catch data',
    endpoints: [
      { method: 'GET', path: '/api/fisheries', description: 'Retrieve fisheries data', params: [{ name: 'species', type: 'string', description: 'Filter by species' }, { name: 'region', type: 'string', description: 'Filter by region' }] },
      { method: 'GET', path: '/api/fisheries/metrics', description: 'Get aggregate metrics (abundance, biomass, diversity)' },
      { method: 'GET', path: '/api/fisheries/species-distribution', description: 'Get species distribution by abundance' },
      { method: 'GET', path: '/api/fisheries/temporal', description: 'Get temporal trends by species' },
      { method: 'GET', path: '/api/fisheries/geospatial', description: 'Get fishing zone locations' },
    ],
  },
  {
    category: 'eDNA',
    icon: Dna,
    color: 'violet',
    description: 'Environmental DNA sampling data',
    endpoints: [
      { method: 'GET', path: '/api/edna', description: 'Retrieve eDNA samples' },
      { method: 'GET', path: '/api/edna/concentration-trends', description: 'Get concentration trends by species' },
      { method: 'GET', path: '/api/edna/depth-analysis', description: 'Get depth vs concentration analysis' },
      { method: 'GET', path: '/api/edna/seasonal', description: 'Get seasonal variation data' },
      { method: 'GET', path: '/api/edna/confidence-distribution', description: 'Get detection confidence distribution' },
      { method: 'GET', path: '/api/edna/species-list', description: 'Get list of detected species' },
    ],
  },
  {
    category: 'Forecasting',
    icon: TrendingUp,
    color: 'indigo',
    description: 'ML-powered predictions',
    endpoints: [
      { method: 'GET', path: '/api/forecast', description: 'Get existing forecasts' },
      { method: 'GET', path: '/api/forecast/species-list', description: 'Get species with forecast models' },
      { method: 'GET', path: '/api/forecast/stats', description: 'Get forecast statistics' },
      { method: 'GET', path: '/api/forecast/health', description: 'Check ML service health' },
      { method: 'POST', path: '/api/forecast/predict/lstm', description: 'Generate LSTM time-series prediction', body: { species: 'string', months: 12 } },
      { method: 'POST', path: '/api/forecast/predict/random-forest', description: 'Classify abundance from conditions', body: { temperature: 28.5, salinity: 34.5, ph: 8.1, oxygen: 6.5 } },
      { method: 'POST', path: '/api/forecast/predict/regression', description: 'Predict abundance from features', body: { data: [{ temperature: 28, salinity: 34 }] } },
    ],
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
};

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function APIDocsPage() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Unified Insights', 'Geospatial']);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const copyToClipboard = (path: string) => {
    navigator.clipboard.writeText(`http://localhost:3001${path}`);
    setCopiedPath(path);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const totalEndpoints = apiEndpoints.reduce((sum, cat) => sum + cat.endpoints.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileCode2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">API Documentation</h1>
              <p className="text-gray-500">Complete reference for the Ratnakara Marine Data API</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <p className="text-sm text-indigo-600 font-medium">Total Endpoints</p>
            <p className="text-3xl font-bold text-indigo-900 mt-1">{totalEndpoints}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-sm text-green-600 font-medium">Categories</p>
            <p className="text-3xl font-bold text-green-900 mt-1">{apiEndpoints.length}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Base URL</p>
            <p className="text-lg font-mono font-bold text-blue-900 mt-1">localhost:3001</p>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-sm text-purple-600 font-medium">API Version</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">v2.0</p>
          </div>
        </div>

        {/* Response Format */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Standard Response Format</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Success Response:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": { ... },
  "count": 100
}`}
              </pre>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Error Response:</p>
              <pre className="bg-gray-900 text-red-400 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": false,
  "error": "Error message"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Endpoints by Category */}
        <div className="space-y-4">
          {apiEndpoints.map((category) => {
            const colors = colorClasses[category.color];
            const Icon = category.icon;
            const isExpanded = expandedCategories.includes(category.category);

            return (
              <div key={category.category} className={`card ${colors.bg} ${colors.border}`}>
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.text} bg-white/50 flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-gray-900">{category.category}</h2>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${colors.text} bg-white/50`}>
                      {category.endpoints.length} endpoints
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-3">
                        {category.endpoints.map((endpoint, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-lg p-4 border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[endpoint.method]}`}>
                                  {endpoint.method}
                                </span>
                                <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                                <button
                                  onClick={() => copyToClipboard(endpoint.path)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  {copiedPath === endpoint.path ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>

                            {endpoint.params && endpoint.params.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2">PARAMETERS</p>
                                <div className="space-y-1">
                                  {endpoint.params.map((param, pIdx) => (
                                    <div key={pIdx} className="flex items-start gap-2 text-xs">
                                      <code className="px-1.5 py-0.5 bg-gray-100 rounded font-mono text-gray-700">
                                        {param.name}
                                        {param.required && <span className="text-red-500">*</span>}
                                      </code>
                                      <span className="text-gray-400">{param.type}</span>
                                      <span className="text-gray-600">- {param.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {endpoint.body && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2">REQUEST BODY</p>
                                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(endpoint.body, null, 2)}
                                </pre>
                              </div>
                            )}

                            {endpoint.response && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2">EXAMPLE RESPONSE</p>
                                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(endpoint.response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Common Parameters */}
        <div className="card mt-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Common Query Parameters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Parameter</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3 font-mono text-cyan-600">startDate</td>
                  <td className="px-4 py-3 text-gray-600">ISO Date</td>
                  <td className="px-4 py-3 text-gray-600">Filter results from this date onwards</td>
                  <td className="px-4 py-3 font-mono text-xs">2024-01-01</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-mono text-cyan-600">endDate</td>
                  <td className="px-4 py-3 text-gray-600">ISO Date</td>
                  <td className="px-4 py-3 text-gray-600">Filter results until this date</td>
                  <td className="px-4 py-3 font-mono text-xs">2024-12-31</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-mono text-cyan-600">region</td>
                  <td className="px-4 py-3 text-gray-600">String</td>
                  <td className="px-4 py-3 text-gray-600">Filter by geographic region</td>
                  <td className="px-4 py-3 font-mono text-xs">Bay of Bengal</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-mono text-cyan-600">species</td>
                  <td className="px-4 py-3 text-gray-600">String</td>
                  <td className="px-4 py-3 text-gray-600">Filter by species scientific name</td>
                  <td className="px-4 py-3 font-mono text-xs">Sardinella longiceps</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-mono text-cyan-600">limit</td>
                  <td className="px-4 py-3 text-gray-600">Integer</td>
                  <td className="px-4 py-3 text-gray-600">Maximum number of results to return</td>
                  <td className="px-4 py-3 font-mono text-xs">100</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-cyan-600">offset</td>
                  <td className="px-4 py-3 text-gray-600">Integer</td>
                  <td className="px-4 py-3 text-gray-600">Number of results to skip (pagination)</td>
                  <td className="px-4 py-3 font-mono text-xs">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
          <div className="flex flex-wrap gap-3">
            <a href="https://dwc.tdwg.org/terms/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Darwin Core Terms <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://www.gbif.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              GBIF Portal <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://www.marinespecies.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              WoRMS Database <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
