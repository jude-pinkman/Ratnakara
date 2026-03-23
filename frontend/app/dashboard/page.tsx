'use client';

import { useEffect, useState } from 'react';
import { oceanAPI, fisheriesAPI, taxonomyAPI, ednaAPI, correlationAPI } from '@/lib/api';
import {
  Waves, Fish, Dna, TreeDeciduous, TrendingUp, Download,
  AlertCircle, CheckCircle2, Info, ArrowUp, ArrowDown,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [oceanKPIs, setOceanKPIs] = useState<any>(null);
  const [oceanTrends, setOceanTrends] = useState<any[]>([]);
  const [fisheriesMetrics, setFisheriesMetrics] = useState<any>(null);
  const [fisheriesTrends, setFisheriesTrends] = useState<any[]>([]);
  const [taxonomyStats, setTaxonomyStats] = useState<any>(null);
  const [ednaSamples, setEdnaSamples] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oceanKPI, oceanTr, fisheriesM, edna, taxa, corr] = await Promise.all([
          oceanAPI.getKPIs(),
          oceanAPI.getTrends(),
          fisheriesAPI.getMetrics(),
          ednaAPI.getAll(),
          taxonomyAPI.getStats(),
          correlationAPI.getAll(),
        ]);

        setOceanKPIs(oceanKPI.data.data);
        setOceanTrends(oceanTr.data.data || []);
        setFisheriesMetrics(fisheriesM.data.data);
        setEdnaSamples(edna.data.data || []);
        setTaxonomyStats(taxa.data.data);
        setCorrelations(corr.data.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const KPICard = ({ icon: Icon, label, value, unit, trend }: any) => (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {value || '-'} <span className="text-lg text-gray-500">{unit}</span>
          </p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2 text-xs">
          {trend > 0 ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-600" />}
          <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(trend)}% vs last month
          </span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marine Analytics Hub</h1>
              <p className="text-gray-500 mt-1">Real-time oceanographic and fisheries data analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            icon={Waves}
            label="Avg Temperature"
            value={oceanKPIs?.avg_temperature ? parseFloat(oceanKPIs.avg_temperature).toFixed(1) : '-'}
            unit="°C"
          />
          <KPICard
            icon={Waves}
            label="Avg Wave Height"
            value={oceanKPIs?.avg_wave_height ? parseFloat(oceanKPIs.avg_wave_height).toFixed(1) : '-'}
            unit="m"
          />
          <KPICard
            icon={Waves}
            label="Avg Wind Speed"
            value={oceanKPIs?.avg_wind_speed ? parseFloat(oceanKPIs.avg_wind_speed).toFixed(1) : '-'}
            unit="m/s"
          />
          <KPICard
            icon={Fish}
            label="Species Tracked"
            value={fisheriesMetrics?.species_count || '-'}
            unit="species"
          />
        </div>

        {/* Ocean Data Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ocean Conditions Trends</h2>
              <Waves className="w-5 h-5 text-blue-600" />
            </div>
            {oceanTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={oceanTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  <Line type="monotone" dataKey="avg_temperature" stroke="#3b82f6" name="Temperature (°C)" strokeWidth={2} />
                  <Line type="monotone" dataKey="avg_wave_height" stroke="#06b6d4" name="Wave Height (m)" strokeWidth={2} />
                  <Line type="monotone" dataKey="avg_wind_speed" stroke="#f59e0b" name="Wind Speed (m/s)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No trend data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Data Availability</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Temperature Records</span>
                  <span className="text-lg font-bold text-gray-900">{oceanKPIs?.data_coverage?.temperature_records || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((oceanKPIs?.data_coverage?.temperature_records || 0) / (oceanKPIs?.total_records || 1) * 100).toFixed(0)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Wave Height Records</span>
                  <span className="text-lg font-bold text-gray-900">{oceanKPIs?.data_coverage?.wave_height_records || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${((oceanKPIs?.data_coverage?.wave_height_records || 0) / (oceanKPIs?.total_records || 1) * 100).toFixed(0)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Wind Speed Records</span>
                  <span className="text-lg font-bold text-gray-900">{oceanKPIs?.data_coverage?.wind_speed_records || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${((oceanKPIs?.data_coverage?.wind_speed_records || 0) / (oceanKPIs?.total_records || 1) * 100).toFixed(0)}%` }}></div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">All Systems Operational</p>
                    <p className="text-xs text-green-700 mt-1">{oceanKPIs?.total_records || 0} total records from {oceanKPIs?.station_count || 0} stations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fisheries & eDNA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Fish Species Distribution</h2>
              <Fish className="w-5 h-5 text-emerald-600" />
            </div>
            {fisheriesMetrics?.species_count ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="font-medium text-gray-700">Species Found</span>
                  <span className="text-2xl font-bold text-emerald-600">{fisheriesMetrics.species_count}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-gray-700">Total Biomass</span>
                  <span className="text-lg font-bold text-blue-600">{(fisheriesMetrics.avg_biomass / 1000).toFixed(1)}K tons</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-gray-700">Avg Biomass/Species</span>
                  <span className="text-lg font-bold text-purple-600">{Math.round(fisheriesMetrics.avg_biomass / fisheriesMetrics.species_count)} tons</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No fisheries data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">eDNA Analysis</h2>
              <Dna className="w-5 h-5 text-purple-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-gray-700">Total Samples</span>
                <span className="text-2xl font-bold text-purple-600">{ednaSamples.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                <span className="font-medium text-gray-700">Avg Concentration</span>
                <span className="text-lg font-bold text-pink-600">
                  {ednaSamples.length > 0
                    ? (ednaSamples.reduce((sum: number, s: any) => sum + parseFloat(s.concentration || 0), 0) / ednaSamples.length).toFixed(1)
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <span className="font-medium text-gray-700">Avg Confidence</span>
                <span className="text-lg font-bold text-indigo-600">
                  {ednaSamples.length > 0
                    ? (ednaSamples.reduce((sum: number, s: any) => sum + parseFloat(s.confidence || 0), 0) / ednaSamples.length * 100).toFixed(0)
                    : '-'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Correlations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Species-Temperature Correlations</h2>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          {correlations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Species</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Temp (°C)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Abundance</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {correlations.slice(0, 5).map((corr: any, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{corr.species}</td>
                      <td className="py-3 px-4 text-gray-600">{parseFloat(corr.temperature).toFixed(1)}</td>
                      <td className="py-3 px-4 text-gray-600">{corr.abundance}</td>
                      <td className="py-3 px-4 text-gray-600">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          corr.correlation_coefficient > 0.5 ? 'bg-green-100 text-green-800' :
                          corr.correlation_coefficient < -0.5 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {parseFloat(corr.correlation_coefficient).toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No correlation data available</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/ocean" className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600">Ocean Data</h3>
                <p className="text-sm text-gray-500 mt-1">Detailed oceanographic analysis</p>
              </div>
              <Waves className="w-8 h-8 text-blue-600 opacity-20 group-hover:opacity-100 transition" />
            </div>
          </a>
          <a href="/fisheries" className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-emerald-300 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-emerald-600">Fisheries</h3>
                <p className="text-sm text-gray-500 mt-1">Species distribution & biomass</p>
              </div>
              <Fish className="w-8 h-8 text-emerald-600 opacity-20 group-hover:opacity-100 transition" />
            </div>
          </a>
          <a href="/edna" className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-purple-300 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 group-hover:text-purple-600">eDNA Analysis</h3>
                <p className="text-sm text-gray-500 mt-1">Biodiversity from DNA</p>
              </div>
              <Dna className="w-8 h-8 text-purple-600 opacity-20 group-hover:opacity-100 transition" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
