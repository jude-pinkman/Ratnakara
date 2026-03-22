'use client';

const apiEndpoints = [
  {
    category: 'Ocean Data',
    endpoints: [
      { method: 'GET', path: '/api/ocean', description: 'Retrieve all ocean data with optional filters' },
      { method: 'GET', path: '/api/ocean/kpis', description: 'Get key performance indicators' },
      { method: 'GET', path: '/api/ocean/trends', description: 'Get monthly trends' },
      { method: 'GET', path: '/api/ocean/geospatial', description: 'Get geospatial station data' },
    ],
  },
  {
    category: 'Fisheries Data',
    endpoints: [
      { method: 'GET', path: '/api/fisheries', description: 'Retrieve fisheries data with filters' },
      { method: 'GET', path: '/api/fisheries/metrics', description: 'Get aggregate metrics' },
      { method: 'GET', path: '/api/fisheries/species-distribution', description: 'Get species distribution data' },
      { method: 'GET', path: '/api/fisheries/temporal', description: 'Get temporal trends by species' },
      { method: 'GET', path: '/api/fisheries/geospatial', description: 'Get fishing zone locations' },
    ],
  },
  {
    category: 'eDNA Data',
    endpoints: [
      { method: 'GET', path: '/api/edna', description: 'Retrieve eDNA samples with filters' },
      { method: 'GET', path: '/api/edna/concentration-trends', description: 'Get concentration by species' },
      { method: 'GET', path: '/api/edna/depth-analysis', description: 'Get depth vs concentration analysis' },
      { method: 'GET', path: '/api/edna/seasonal', description: 'Get seasonal trends' },
      { method: 'GET', path: '/api/edna/confidence-distribution', description: 'Get confidence level distribution' },
      { method: 'GET', path: '/api/edna/species-list', description: 'Get list of detected species' },
    ],
  },
  {
    category: 'Taxonomy',
    endpoints: [
      { method: 'GET', path: '/api/taxonomy', description: 'Get all taxonomic records' },
      { method: 'GET', path: '/api/taxonomy/tree', description: 'Get hierarchical taxonomy tree' },
      { method: 'GET', path: '/api/taxonomy/species/:species', description: 'Get details for specific species' },
      { method: 'GET', path: '/api/taxonomy/search?q={query}', description: 'Search taxonomy database' },
      { method: 'GET', path: '/api/taxonomy/stats', description: 'Get taxonomy statistics' },
    ],
  },
  {
    category: 'Correlations',
    endpoints: [
      { method: 'GET', path: '/api/correlation', description: 'Get correlation data' },
      { method: 'GET', path: '/api/correlation/environmental-impact', description: 'Get environmental correlation coefficients' },
      { method: 'GET', path: '/api/correlation/scatter/:variable', description: 'Get scatter plot data for specific variable' },
      { method: 'GET', path: '/api/correlation/species-list', description: 'Get species with correlation data' },
    ],
  },
  {
    category: 'Forecasting',
    endpoints: [
      { method: 'GET', path: '/api/forecast', description: 'Get existing forecasts' },
      { method: 'GET', path: '/api/forecast/species-list', description: 'Get species with forecast data' },
      { method: 'POST', path: '/api/forecast/generate', description: 'Generate new forecast for species' },
    ],
  },
  {
    category: 'Chatbot',
    endpoints: [
      { method: 'POST', path: '/api/chatbot', description: 'Ask chatbot a question', body: { question: 'string' } },
    ],
  },
];

export default function APIDocsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">API Documentation</h1>

      <div className="card mb-6">
        <h2 className="text-2xl font-semibold mb-4">Base URL</h2>
        <code className="bg-gray-100 px-4 py-2 rounded block">
          http://localhost:3001
        </code>
      </div>

      <div className="card mb-6">
        <h2 className="text-2xl font-semibold mb-4">Response Format</h2>
        <p className="text-gray-700 mb-2">All endpoints return JSON in the following format:</p>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
{`{
  "success": true,
  "data": { ... }
}`}
        </pre>
      </div>

      {apiEndpoints.map((category) => (
        <div key={category.category} className="card mb-6">
          <h2 className="text-2xl font-semibold mb-4">{category.category}</h2>

          <div className="space-y-4">
            {category.endpoints.map((endpoint, idx) => (
              <div key={idx} className="border-l-4 border-ocean-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      endpoint.method === 'GET'
                        ? 'bg-blue-100 text-blue-700'
                        : endpoint.method === 'POST'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono">{endpoint.path}</code>
                </div>
                <p className="text-gray-700 text-sm">{endpoint.description}</p>
                {endpoint.body && (
                  <pre className="bg-gray-50 p-2 rounded text-xs mt-2">
                    {JSON.stringify(endpoint.body, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <h2 className="text-2xl font-semibold mb-4">Common Query Parameters</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Parameter</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">startDate</td>
                <td className="px-4 py-2 text-sm">ISO Date</td>
                <td className="px-4 py-2 text-sm">Filter results from this date</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">endDate</td>
                <td className="px-4 py-2 text-sm">ISO Date</td>
                <td className="px-4 py-2 text-sm">Filter results until this date</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">region</td>
                <td className="px-4 py-2 text-sm">String</td>
                <td className="px-4 py-2 text-sm">Filter by geographic region</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">species</td>
                <td className="px-4 py-2 text-sm">String</td>
                <td className="px-4 py-2 text-sm">Filter by species name</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
