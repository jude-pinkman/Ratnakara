'use client';

import { useEffect, useState, useRef } from 'react';
import { taxonomyAPI } from '@/lib/api';
import { Search, ChevronRight, ChevronDown, TreeDeciduous, BarChart2, Layers, Filter, Download } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ExportButton } from '@/components/ExportButton';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type TabType = 'hierarchy' | 'distribution' | 'search';

function TreeNode({ name, children, level, onNodeClick }: { name: string; children: any; level: number; onNodeClick?: (name: string, level: number) => void }) {
  const [isOpen, setIsOpen] = useState(level < 2);

  const hasChildren = children && (typeof children === 'object') && Object.keys(children).length > 0;

  const levelColors = [
    'text-marine-600 bg-marine-50 border-marine-200',
    'text-emerald-600 bg-emerald-50 border-emerald-200',
    'text-purple-600 bg-purple-50 border-purple-200',
    'text-orange-600 bg-orange-50 border-orange-200',
    'text-pink-600 bg-pink-50 border-pink-200',
    'text-teal-600 bg-teal-50 border-teal-200',
    'text-blue-600 bg-blue-50 border-blue-200',
  ];

  const colorClass = levelColors[level % levelColors.length];

  if (Array.isArray(children)) {
    return (
      <div className="ml-6 my-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} text-sm font-medium`}>
          <Layers className="w-4 h-4" />
          {name}
        </div>
        <div className="ml-6 mt-2 space-y-2">
          {children.map((item: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onNodeClick?.(item.species, level)}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-marine-300 hover:shadow-sm hover:bg-marine-50 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                {item.species?.charAt(0) || 'S'}
              </div>
              <div>
                <span className="font-semibold text-navy-800">{item.species}</span>
                {item.common_name && (
                  <span className="text-gray-500 ml-2 text-sm">({item.common_name})</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-1">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all`}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )
        ) : (
          <span className="w-5" />
        )}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} text-sm font-medium`}>
          {name}
        </div>
        {hasChildren && (
          <span className="text-xs text-gray-400 ml-2">
            ({Object.keys(children).length})
          </span>
        )}
      </div>

      {isOpen && hasChildren && (
        <div className="animate-fade-in">
          {Object.entries(children).map(([key, value]) => (
            <TreeNode key={key} name={key} children={value} level={level + 1} onNodeClick={onNodeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyPage() {
  const [tree, setTree] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [allTaxonomy, setAllTaxonomy] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('hierarchy');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Drill-down filters
  const [selectedKingdom, setSelectedKingdom] = useState<string>('all');
  const [selectedPhylum, setSelectedPhylum] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<string>('all');

  // Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null);

  // Refs
  const distributionChartRef = useRef<HTMLDivElement>(null);
  const phylumChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [treeRes, statsRes, allRes] = await Promise.all([
          taxonomyAPI.getTree(),
          taxonomyAPI.getStats(),
          taxonomyAPI.getAll(),
        ]);

        setTree(treeRes.data.data);
        setStats(statsRes.data.data);
        setAllTaxonomy(allRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch taxonomy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await taxonomyAPI.search(searchQuery);
      setSearchResults(res.data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Apply drill-down filters
  const filteredTaxonomy = allTaxonomy.filter((item) => {
    if (selectedKingdom !== 'all' && item.kingdom !== selectedKingdom) return false;
    if (selectedPhylum !== 'all' && item.phylum !== selectedPhylum) return false;
    if (selectedClass !== 'all' && item.class_name !== selectedClass) return false;
    if (selectedOrder !== 'all' && item.order_name !== selectedOrder) return false;
    return true;
  });

  // Get unique values for filters
  const kingdoms = ['all', ...new Set(allTaxonomy.map((t) => t.kingdom))];
  const phylums = ['all', ...new Set(
    selectedKingdom === 'all'
      ? allTaxonomy.map((t) => t.phylum)
      : allTaxonomy.filter((t) => t.kingdom === selectedKingdom).map((t) => t.phylum)
  )];
  const classes = ['all', ...new Set(
    selectedPhylum === 'all'
      ? allTaxonomy.map((t) => t.class_name)
      : allTaxonomy.filter((t) => t.phylum === selectedPhylum).map((t) => t.class_name)
  )];
  const orders = ['all', ...new Set(
    selectedClass === 'all'
      ? allTaxonomy.map((t) => t.order_name)
      : allTaxonomy.filter((t) => t.class_name === selectedClass).map((t) => t.order_name)
  )];

  // Chart data
  const distributionData = {
    labels: ['Kingdoms', 'Phyla', 'Classes', 'Orders', 'Families', 'Genera', 'Species'],
    datasets: [
      {
        label: 'Count',
        data: stats ? [
          stats.kingdoms,
          stats.phylums,
          stats.classes,
          stats.orders,
          stats.families,
          stats.genera,
          stats.species,
        ] : [],
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderRadius: 8,
      },
    ],
  };

  const phylumDistribution = filteredTaxonomy.reduce((acc: any, item: any) => {
    acc[item.phylum] = (acc[item.phylum] || 0) + 1;
    return acc;
  }, {});

  const phylumChartData = {
    labels: Object.keys(phylumDistribution),
    datasets: [
      {
        data: Object.values(phylumDistribution),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(20, 184, 166, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const classDistribution = filteredTaxonomy.reduce((acc: any, item: any) => {
    acc[item.class_name] = (acc[item.class_name] || 0) + 1;
    return acc;
  }, {});

  const resetFilters = () => {
    setSelectedKingdom('all');
    setSelectedPhylum('all');
    setSelectedClass('all');
    setSelectedOrder('all');
    setSelectedItemDetail(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading taxonomy data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-gray-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <TreeDeciduous className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Taxonomic Classification</h1>
              <p className="text-gray-500">Explore marine species hierarchy and distribution</p>
            </div>
          </div>

          {/* Drill-down Filters */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">Drill-Down Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Kingdom</label>
                <select
                  value={selectedKingdom}
                  onChange={(e) => {
                    setSelectedKingdom(e.target.value);
                    setSelectedPhylum('all');
                    setSelectedClass('all');
                    setSelectedOrder('all');
                  }}
                  className="select text-sm w-full"
                >
                  {kingdoms.map((k) => (
                    <option key={k} value={k}>
                      {k === 'all' ? 'All Kingdoms' : k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phylum</label>
                <select
                  value={selectedPhylum}
                  onChange={(e) => {
                    setSelectedPhylum(e.target.value);
                    setSelectedClass('all');
                    setSelectedOrder('all');
                  }}
                  className="select text-sm w-full"
                >
                  {phylums.map((p) => (
                    <option key={p} value={p}>
                      {p === 'all' ? 'All Phyla' : p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedOrder('all');
                  }}
                  className="select text-sm w-full"
                >
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'All Classes' : c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Order</label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="select text-sm w-full"
                >
                  {orders.map((o) => (
                    <option key={o} value={o}>
                      {o === 'all' ? 'All Orders' : o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={resetFilters}
                  className="btn-secondary text-sm w-full"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {(selectedKingdom !== 'all' || selectedPhylum !== 'all' || selectedClass !== 'all' || selectedOrder !== 'all') && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">
                  {filteredTaxonomy.length} species match filters • <button onClick={resetFilters} className="text-blue-600 hover:text-blue-800 underline">Clear all</button>
                </span>
              </div>
            )}
          </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'hierarchy'
                ? 'text-marine-600 border-marine-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Hierarchy
            </span>
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'distribution'
                ? 'text-marine-600 border-marine-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              Distribution
            </span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'search'
                ? 'text-marine-600 border-marine-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </span>
          </button>
        </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Kingdoms', value: stats.kingdoms, color: 'kpi-card' },
              { label: 'Phyla', value: stats.phylums, color: 'kpi-card-green' },
              { label: 'Classes', value: stats.classes, color: 'kpi-card-purple' },
              { label: 'Orders', value: stats.orders, color: 'kpi-card-orange' },
              { label: 'Families', value: stats.families, color: 'kpi-card-teal' },
              { label: 'Genera', value: stats.genera, color: 'kpi-card' },
              { label: 'Species', value: stats.species, color: 'kpi-card-green' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                className={`${stat.color} text-center`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm opacity-90 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-8 pb-8">
        {activeTab === 'hierarchy' && tree && (
          <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-navy-900">Hierarchical Classification</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {filteredTaxonomy.length} species {selectedKingdom !== 'all' && 'filtered'}
                </span>
                <ExportButton
                  data={filteredTaxonomy}
                  filename="taxonomy-filtered"
                  formats={['csv', 'excel', 'json']}
                />
              </div>
            </div>
            <div className="overflow-auto max-h-[600px]">
              {Object.entries(tree).map(([kingdom, children]) => (
                <TreeNode
                  key={kingdom}
                  name={kingdom}
                  children={children}
                  level={0}
                  onNodeClick={(species, level) => {
                    const item = allTaxonomy.find((t) => t.species === species);
                    setSelectedItemDetail(item);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'distribution' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-xl font-semibold text-navy-900 mb-6">Taxonomic Level Distribution</h2>
              <div ref={distributionChartRef} className="chart-container" style={{ height: '350px' }}>
                <Bar
                  data={distributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              </div>
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <h2 className="text-xl font-semibold text-navy-900 mb-6">Species by Phylum</h2>
              <div ref={phylumChartRef} className="chart-container flex items-center justify-center" style={{ height: '350px' }}>
                <div style={{ width: '280px', height: '280px' }}>
                  <Doughnut
                    data={phylumChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } },
                      cutout: '60%',
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Class Distribution */}
            <motion.div className="card lg:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-navy-900">Class Distribution Overview</h2>
                <ExportButton
                  data={Object.entries(classDistribution).map(([name, count]) => ({ class_name: name, count }))}
                  filename="taxonomy-classes"
                  formats={['csv', 'excel', 'json']}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(classDistribution).map(([className, count]: [string, any], idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-marine-300 transition-all cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-navy-900">{count}</p>
                    <p className="text-sm text-gray-600 truncate">{className}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'search' && (
          <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search species, genus, family..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input pl-12"
                />
              </div>
              <button onClick={handleSearch} disabled={searching} className="btn-primary">
                {searching ? 'Searching...' : 'Search'}
              </button>
              {searchResults.length > 0 && (
                <ExportButton
                  data={searchResults}
                  filename="taxonomy-search-results"
                  formats={['csv', 'excel', 'json']}
                />
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">Found {searchResults.length} results</p>
                {searchResults.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedItemDetail(item)}
                    className="p-4 rounded-xl border border-gray-200 hover:border-marine-300 hover:shadow-sm hover:bg-orange-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {item.species?.charAt(0) || 'S'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-navy-900">
                          {item.species}
                          {item.common_name && (
                            <span className="text-gray-500 font-normal ml-2">({item.common_name})</span>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="badge badge-blue">{item.kingdom}</span>
                          <span className="badge badge-green">{item.phylum}</span>
                          <span className="badge badge-purple">{item.class_name}</span>
                          <span className="badge badge-orange">{item.order_name}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Family: {item.family} | Genus: {item.genus}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a search term to find species</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Species Detail Panel */}
        {selectedItemDetail && (
          <motion.div
            className="card mt-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedItemDetail.species?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-900">{selectedItemDetail.species}</h3>
                  {selectedItemDetail.common_name && (
                    <p className="text-sm text-orange-700 italic">({selectedItemDetail.common_name})</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="text-orange-600 hover:text-orange-800 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Kingdom', value: selectedItemDetail.kingdom },
                { label: 'Phylum', value: selectedItemDetail.phylum },
                { label: 'Class', value: selectedItemDetail.class_name },
                { label: 'Order', value: selectedItemDetail.order_name },
                { label: 'Family', value: selectedItemDetail.family },
                { label: 'Genus', value: selectedItemDetail.genus },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-orange-600 font-semibold">{item.label}</p>
                  <p className="text-sm font-medium text-navy-900 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
