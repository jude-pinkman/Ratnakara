'use client';

import { useEffect, useState } from 'react';
import { oceanAPI, fisheriesAPI, taxonomyAPI, ednaAPI, correlationAPI } from '@/lib/api';
import {
  Waves, Fish, Dna, TreeDeciduous, TrendingUp, Upload, Download,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Dataset "${file.name}" uploaded! Processing...`);
      // TODO: Implement backend upload endpoint
    }
  };

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
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
              <Upload className="w-4 h-4" />
              Upload Dataset
              <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            icon={Waves}
            label="Avg Temperature"
            value={oceanKPIs?.avg_temp ? parseFloat(oceanKPIs.avg_temp).toFixed(1) : '-'}
            unit="°C"
            trend={5}
          />
          <KPICard
            icon={Waves}
            label="Avg Salinity"
            value={oceanKPIs?.avg_salinity ? parseFloat(oceanKPIs.avg_salinity).toFixed(1) : '-'}
            unit="PSU"
            trend={-2}
          />
          <KPICard
            icon={Fish}
            label="Total Fish Abundance"
            value={fisheriesMetrics?.total_abundance ? (fisheriesMetrics.total_abundance / 1000).toFixed(1) : '-'}
            unit="K"
            trend={8}
          />
          <KPICard
            icon={TreeDeciduous}
            label="Species Tracked"
            value={fisheriesMetrics?.species_count || '-'}
            unit="species"
            trend={0}
          />
        </div>

        {/* Ocean Data Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ocean Temperature Trends</h2>
              <Waves className="w-5 h-5 text-blue-600" />
            </div>
            {oceanTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={oceanTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  <Line type="monotone" dataKey="avg_temp" stroke="#3b82f6" name="Temperature (°C)" strokeWidth={2} />
                  <Line type="monotone" dataKey="avg_salinity" stroke="#10b981" name="Salinity" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No trend data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Water Quality</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">pH Level</span>
                  <span className="text-lg font-bold text-gray-900">{oceanKPIs?.avg_ph ? parseFloat(oceanKPIs.avg_ph).toFixed(2) : '-'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Oxygen Level</span>
                  <span className="text-lg font-bold text-gray-900">{oceanKPIs?.avg_oxygen ? parseFloat(oceanKPIs.avg_oxygen).toFixed(2) : '-'} mg/L</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Healthy Range</p>
                    <p className="text-xs text-blue-700 mt-1">All parameters within optimal ranges for marine life</p>
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
                  <span className="text-lg font-bold text-blue-600">{(fisheriesMetrics.total_biomass / 1000).toFixed(1)}K tons</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-gray-700">Avg Biomass/Species</span>
                  <span className="text-lg font-bold text-purple-600">{Math.round(fisheriesMetrics.total_biomass / fisheriesMetrics.species_count)} tons</span>
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
            <h2 className="text-xl font-bold text-gray-900">Environmental Correlations</h2>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          {correlations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Species</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Temp (°C)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Salinity</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Abundance</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Oxygen</th>
                  </tr>
                </thead>
                <tbody>
                  {correlations.slice(0, 5).map((corr: any, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{corr.species}</td>
                      <td className="py-3 px-4 text-gray-600">{parseFloat(corr.temperature).toFixed(1)}</td>
                      <td className="py-3 px-4 text-gray-600">{parseFloat(corr.salinity).toFixed(1)}</td>
                      <td className="py-3 px-4 text-gray-600">{corr.abundance}</td>
                      <td className="py-3 px-4 text-gray-600">{parseFloat(corr.oxygen).toFixed(1)}</td>
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
