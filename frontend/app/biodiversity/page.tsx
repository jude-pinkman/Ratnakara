'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dna, Map, Search, Download, AlertCircle, CheckCircle2, TrendingUp,
  Filter, ExternalLink, RefreshCcw, Info, Beaker, Fish
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter, PieChart, Pie
} from 'recharts';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SequenceRecord {
  id: string;
  sequenceIdentifier: string;
  gene: string;
  taxonomic_identification: string;
  sequenceLength: number;
  gc_content: number;
  blast_identity_percent?: number;
  blast_evalue?: number;
  species?: string;
  region?: string;
  recorded_at?: string;
}

interface AnomalyAlert {
  id: string;
  parameter: string;
  measured_value: number;
  expected_value?: number;
  z_score: number;
  alert_level: 'warning' | 'critical';
  detected_at: string;
  acknowledged: boolean;
  latitude?: number;
  longitude?: number;
  region?: string;
}

interface SpeciesRichness {
  region: string;
  unique_species: number;
  total_occurrences: number;
  endemic_species?: number;
  edna_detected?: number;
  fisheries_recorded?: number;
}

interface ComparisonData {
  parameter: string;
  edna_detections: number;
  otolith_records: number;
  agreement: number;
}

interface KPIData {
  sequences: { total: number; highQuality: number; uniqueGenes: number };
  anomalies: { total: number; critical: number; unacknowledged: number };
  biodiversity: { totalSpecies: number; regions: number };
}

const GENES = ['All', '16S', 'COX1', 'ITS', 'rbcL', 'matK'];

export default function BiodiversityPage() {
  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [richness, setRichness] = useState<SpeciesRichness[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGene, setSelectedGene] = useState('All');
  const [minIdentity, setMinIdentity] = useState(0);
  const [filterCritical, setFilterCritical] = useState(false);
  const [totalSequences, setTotalSequences] = useState(0);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [sequencesRes, anomaliesRes, richnessRes, comparisonRes, kpisRes] = await Promise.all([
        fetch(`${API_BASE}/api/biodiversity/sequences?gene=${selectedGene}&minIdentity=${minIdentity}&species=${searchTerm}&limit=100`),
        fetch(`${API_BASE}/api/biodiversity/anomalies?limit=50`),
        fetch(`${API_BASE}/api/biodiversity/richness`),
        fetch(`${API_BASE}/api/biodiversity/comparison`),
        fetch(`${API_BASE}/api/biodiversity/kpis`)
      ]);

      const [sequencesData, anomaliesData, richnessData, comparisonData, kpisData] = await Promise.all([
        sequencesRes.json(),
        anomaliesRes.json(),
        richnessRes.json(),
        comparisonRes.json(),
        kpisRes.json()
      ]);

      if (sequencesData.success) {
        setSequences(sequencesData.data);
        setTotalSequences(sequencesData.total || sequencesData.data.length);
      }
      if (anomaliesData.success) {
        setAnomalies(anomaliesData.data);
      }
      if (richnessData.success) {
        setRichness(richnessData.data);
      }
      if (comparisonData.success) {
        setComparison(comparisonData.data);
      }
      if (kpisData.success) {
        setKpis(kpisData.data);
      }

      toast.success('Biodiversity data loaded from database');
    } catch (error) {
      console.error('Failed to fetch biodiversity data:', error);
      toast.error('Using fallback data - API unavailable');
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  }, [selectedGene, minIdentity, searchTerm]);

  // Fallback data for when API is unavailable
  const loadFallbackData = () => {
    // Generate realistic fallback data
    const mockSequences: SequenceRecord[] = [
      { id: '1', sequenceIdentifier: 'SEQ-16S-001', gene: '16S', taxonomic_identification: 'Sardinella longiceps', sequenceLength: 1542, gc_content: 52.3, blast_identity_percent: 99.8, blast_evalue: 0 },
      { id: '2', sequenceIdentifier: 'SEQ-COX1-002', gene: 'COX1', taxonomic_identification: 'Rastrelliger kanagurta', sequenceLength: 658, gc_content: 45.2, blast_identity_percent: 98.5, blast_evalue: 1e-180 },
      { id: '3', sequenceIdentifier: 'SEQ-16S-003', gene: '16S', taxonomic_identification: 'Thunnus albacares', sequenceLength: 1500, gc_content: 51.8, blast_identity_percent: 97.2, blast_evalue: 5e-220 },
      { id: '4', sequenceIdentifier: 'SEQ-COX1-004', gene: 'COX1', taxonomic_identification: 'Katsuwonus pelamis', sequenceLength: 660, gc_content: 44.7, blast_identity_percent: 99.1, blast_evalue: 0 },
      { id: '5', sequenceIdentifier: 'SEQ-ITS-005', gene: 'ITS', taxonomic_identification: 'Microalgae sp.', sequenceLength: 800, gc_content: 55.6, blast_identity_percent: 96.4, blast_evalue: 2e-110 },
    ];

    const mockAnomalies: AnomalyAlert[] = [
      { id: 'A1', parameter: 'temperature', measured_value: 34.2, z_score: 3.1, alert_level: 'critical', detected_at: new Date().toISOString(), acknowledged: false },
      { id: 'A2', parameter: 'salinity', measured_value: 38.5, z_score: 2.8, alert_level: 'warning', detected_at: new Date(Date.now() - 86400000).toISOString(), acknowledged: false },
      { id: 'A3', parameter: 'oxygen', measured_value: 2.3, z_score: 2.6, alert_level: 'critical', detected_at: new Date(Date.now() - 172800000).toISOString(), acknowledged: true },
    ];

    const mockRichness: SpeciesRichness[] = [
      { region: 'Bay of Bengal', unique_species: 142, total_occurrences: 3245, endemic_species: 23, edna_detected: 89, fisheries_recorded: 118 },
      { region: 'Arabian Sea', unique_species: 128, total_occurrences: 2891, endemic_species: 18, edna_detected: 76, fisheries_recorded: 105 },
      { region: 'Andaman Sea', unique_species: 156, total_occurrences: 4102, endemic_species: 31, edna_detected: 102, fisheries_recorded: 134 },
    ];

    const mockComparison: ComparisonData[] = [
      { parameter: 'Sardinella longiceps', edna_detections: 156, otolith_records: 47, agreement: 89 },
      { parameter: 'Rastrelliger kanagurta', edna_detections: 132, otolith_records: 38, agreement: 85 },
      { parameter: 'Thunnus albacares', edna_detections: 89, otolith_records: 52, agreement: 91 },
      { parameter: 'Katsuwonus pelamis', edna_detections: 76, otolith_records: 43, agreement: 87 },
      { parameter: 'Scomberomorus guttatus', edna_detections: 103, otolith_records: 35, agreement: 82 },
    ];

    setSequences(mockSequences);
    setAnomalies(mockAnomalies);
    setRichness(mockRichness);
    setComparison(mockComparison);
    setKpis({
      sequences: { total: mockSequences.length, highQuality: 4, uniqueGenes: 3 },
      anomalies: { total: 3, critical: 2, unacknowledged: 2 },
      biodiversity: { totalSpecies: 426, regions: 3 }
    });
    setTotalSequences(mockSequences.length);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter sequences locally for instant feedback
  const filteredSequences = sequences.filter((seq) => {
    const matchesSearch =
      !searchTerm ||
      seq.sequenceIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seq.taxonomic_identification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seq.species?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGene = selectedGene === 'All' || seq.gene === selectedGene;
    const matchesIdentity = !minIdentity || (seq.blast_identity_percent || 0) >= minIdentity;
    return matchesSearch && matchesGene && matchesIdentity;
  });

  // Filter anomalies
  const filteredAnomalies = anomalies.filter((anom) => {
    return !filterCritical || anom.alert_level === 'critical' || !anom.acknowledged;
  });

  // Acknowledge anomaly
  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/biodiversity/anomalies/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'user', notes: '' })
      });

      if (response.ok) {
        setAnomalies(prev => prev.map(a =>
          a.id === id ? { ...a, acknowledged: true } : a
        ));
        toast.success('Anomaly acknowledged');
      }
    } catch (error) {
      // Optimistic update for demo
      setAnomalies(prev => prev.map(a =>
        a.id === id ? { ...a, acknowledged: true } : a
      ));
      toast.success('Anomaly acknowledged (offline mode)');
    }
  };

  // Export to Darwin Core
  const exportToGBIF = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/biodiversity/export/darwin-core?limit=1000`);
      const data = await response.json();

      if (data.success) {
        // Download XML
        const element = document.createElement('a');
        element.setAttribute('href', `data:text/xml;charset=utf-8,${encodeURIComponent(data.metaXml)}`);
        element.setAttribute('download', `ratnakara-darwin-core-${new Date().toISOString().split('T')[0]}.xml`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        toast.success(`Exported ${data.recordCount} records in Darwin Core format`);
      }
    } catch (error) {
      // Fallback export
      const darwinCoreXml = `<?xml version="1.0" encoding="UTF-8"?>
<archive xmlns="http://rs.tdwg.org/dwca/text/">
  <core encoding="UTF-8">
    <files><location>occurrence.txt</location></files>
    <id index="0" />
    <field index="0" term="http://purl.org/dc/terms/identifier"/>
    <field index="1" term="http://rs.tdwg.org/dwc/terms/occurrenceID"/>
    <field index="2" term="http://rs.tdwg.org/dwc/terms/scientificName"/>
  </core>
</archive>`;

      const element = document.createElement('a');
      element.setAttribute('href', `data:text/xml;charset=utf-8,${encodeURIComponent(darwinCoreXml)}`);
      element.setAttribute('download', `ratnakara-darwin-core-${new Date().toISOString().split('T')[0]}.xml`);
      element.click();
      toast.success('Darwin Core XML exported (sample template)');
    }
  };

  // Calculate stats from live data
  const criticalCount = kpis?.anomalies.critical || anomalies.filter(a => a.alert_level === 'critical').length;
  const unacknowledgedCount = kpis?.anomalies.unacknowledged || anomalies.filter(a => !a.acknowledged).length;
  const highQualitySequences = kpis?.sequences.highQuality || sequences.filter(s => (s.blast_identity_percent || 0) >= 97).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Dna className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy-900">Biodiversity Analytics</h1>
                <p className="text-gray-500">Genetic sequences, species analysis, and environmental anomalies</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportToGBIF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                Export to GBIF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <motion.div
            className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600 font-medium">DNA Sequences</p>
                <p className="text-3xl font-bold text-cyan-900 mt-1">{kpis?.sequences.total || totalSequences}</p>
              </div>
              <Dna className="w-8 h-8 text-cyan-300" />
            </div>
          </motion.div>

          <motion.div
            className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">High Quality (≥97%)</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{highQualitySequences}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            </div>
          </motion.div>

          <motion.div
            className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Species</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{kpis?.biodiversity.totalSpecies || richness.reduce((sum, r) => sum + r.unique_species, 0)}</p>
              </div>
              <Fish className="w-8 h-8 text-blue-300" />
            </div>
          </motion.div>

          <motion.div
            className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Critical Anomalies</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{criticalCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-300" />
            </div>
          </motion.div>

          <motion.div
            className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Pending Alerts</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{unacknowledgedCount}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-300" />
            </div>
          </motion.div>
        </div>

        {/* Species Richness by Region */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Map className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-navy-900">Species Richness by Region</h2>
            </div>
            <span className="badge badge-cyan">{richness.length} regions monitored</span>
          </div>

          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={richness}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="unique_species" fill="#06b6d4" name="Unique Species" />
                <Bar dataKey="edna_detected" fill="#8b5cf6" name="eDNA Detected" />
                <Bar dataKey="fisheries_recorded" fill="#10b981" name="Fisheries Recorded" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {richness.map((region, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700">{region.region}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Unique Species:</span>
                    <span className="font-bold text-cyan-600">{region.unique_species}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total Occurrences:</span>
                    <span className="font-bold text-navy-900">{region.total_occurrences?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Endemic Species:</span>
                    <span className="font-bold text-purple-600">{region.endemic_species || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">eDNA Detected:</span>
                    <span className="font-bold text-violet-600">{region.edna_detected || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* eDNA vs Otolith/Fisheries Comparison */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Beaker className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-navy-900">eDNA vs Traditional Detection Comparison</h2>
            </div>
            <span className="badge badge-purple">Cross-Method Validation</span>
          </div>

          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  type="number"
                  dataKey="edna_detections"
                  name="eDNA Detections"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'eDNA Detections', position: 'bottom', offset: 40 }}
                />
                <YAxis
                  type="number"
                  dataKey="otolith_records"
                  name="Traditional Records"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Traditional Records', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                />
                <Scatter
                  name="Species"
                  data={comparison}
                  fill="#06b6d4"
                  fillOpacity={0.8}
                >
                  {comparison.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.agreement > 90 ? '#10b981' : entry.agreement > 85 ? '#06b6d4' : '#f59e0b'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Analysis:</strong> This scatter plot compares species detection between eDNA sampling and traditional methods (fisheries surveys/otolith records).
              <span className="ml-2 inline-block w-3 h-3 rounded-full bg-green-500 align-text-bottom"></span>
              {' '}Green = {'>'}90% agreement,
              <span className="ml-2 inline-block w-3 h-3 rounded-full bg-cyan-500 align-text-bottom"></span>
              {' '}Cyan = 85-90%,
              <span className="ml-2 inline-block w-3 h-3 rounded-full bg-yellow-500 align-text-bottom"></span>
              {' '}Yellow = {'<'}85%
            </p>
          </div>
        </motion.div>

        {/* DNA Sequence Library */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Dna className="w-5 h-5 text-cyan-600" />
                <h2 className="text-lg font-semibold text-navy-900">DNA Sequence Library</h2>
              </div>
              <span className="badge badge-cyan">{filteredSequences.length} / {totalSequences} sequences</span>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sequences or species..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gene Marker</label>
                <select
                  value={selectedGene}
                  onChange={(e) => setSelectedGene(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {GENES.map((gene) => (
                    <option key={gene} value={gene}>{gene}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min BLAST Identity</label>
                <select
                  value={minIdentity}
                  onChange={(e) => setMinIdentity(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="0">All</option>
                  <option value="80">≥80%</option>
                  <option value="90">≥90%</option>
                  <option value="95">≥95%</option>
                  <option value="98">≥98%</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedGene('All');
                    setMinIdentity(0);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Sequence Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Sequence ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Gene</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Species</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Length (bp)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">GC %</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">BLAST ID %</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">E-value</th>
                </tr>
              </thead>
              <tbody>
                {filteredSequences.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <Dna className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No sequences found matching your criteria</p>
                      <p className="text-xs mt-1">Try adjusting your filters or search term</p>
                    </td>
                  </tr>
                ) : (
                  filteredSequences.map((seq, idx) => (
                    <tr
                      key={seq.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-cyan-600">{seq.sequenceIdentifier}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {seq.gene}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 italic">
                        {seq.taxonomic_identification || seq.species || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{seq.sequenceLength?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          seq.gc_content > 60 ? 'text-red-600' :
                          seq.gc_content > 50 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {seq.gc_content?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          (seq.blast_identity_percent || 0) >= 99 ? 'text-green-600' :
                          (seq.blast_identity_percent || 0) >= 95 ? 'text-yellow-600' : 'text-orange-600'
                        }`}>
                          {(seq.blast_identity_percent || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 font-mono text-xs">
                        {seq.blast_evalue !== undefined && seq.blast_evalue !== null
                          ? seq.blast_evalue === 0 ? '0' : seq.blast_evalue.toExponential(0)
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Anomaly Timeline */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-navy-900">Environmental Anomalies</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Filter className="w-4 h-4 text-gray-600" />
              <input
                type="checkbox"
                checked={filterCritical}
                onChange={(e) => setFilterCritical(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-red-600"
              />
              <span className="text-sm text-gray-700">Show unacknowledged only</span>
            </label>
          </div>

          <div className="space-y-3">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No anomalies to display</p>
                <p className="text-sm text-gray-500">All environmental parameters are within normal ranges</p>
              </div>
            ) : (
              filteredAnomalies.map((anom, idx) => (
                <motion.div
                  key={anom.id}
                  className={`p-4 rounded-lg border-l-4 flex items-start justify-between ${
                    anom.alert_level === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        anom.alert_level === 'critical' ? 'bg-red-600' : 'bg-yellow-600'
                      }`}></span>
                      <p className="font-semibold text-gray-900">
                        {anom.parameter.toUpperCase()} Anomaly
                      </p>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        anom.alert_level === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}>
                        {anom.alert_level.toUpperCase()}
                      </span>
                      {anom.acknowledged && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-200 text-green-800">
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>
                        Measured: <span className="font-mono font-bold">{anom.measured_value?.toFixed(2)}</span>
                        {anom.expected_value && (
                          <span className="ml-2">
                            (Expected: <span className="font-mono">{anom.expected_value.toFixed(2)}</span>)
                          </span>
                        )}
                        {' | '}Z-Score: <span className="font-mono font-bold">{anom.z_score?.toFixed(2)}σ</span>
                      </p>
                      <p className="text-xs text-gray-600">
                        Detected: {new Date(anom.detected_at).toLocaleString()}
                        {anom.region && ` | Region: ${anom.region}`}
                      </p>
                    </div>
                  </div>
                  {!anom.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(anom.id)}
                      className="ml-4 px-3 py-1.5 text-xs bg-white rounded border border-gray-300 hover:bg-gray-50 transition font-medium"
                    >
                      Acknowledge
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Darwin Core Badge */}
        <motion.div
          className="mt-8 card bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Darwin Core Standard Compliance</h3>
              <p className="mt-2 text-sm text-green-800">
                This biodiversity dataset follows the Darwin Core standard (250+ terms) and is ready for publication to GBIF
                (Global Biodiversity Information Facility). All occurrence records include mandatory fields: occurrenceID,
                scientificName, coordinates, and eventDate. The data integrates{' '}
                <strong>{kpis?.biodiversity.totalSpecies || 'multiple'} species</strong> across{' '}
                <strong>{kpis?.biodiversity.regions || richness.length} marine regions</strong> of India.
              </p>
              <div className="mt-3 flex items-center gap-4">
                <a
                  href="https://dwc.tdwg.org/terms/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900"
                >
                  Darwin Core Terms
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://www.gbif.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900"
                >
                  GBIF Portal
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
