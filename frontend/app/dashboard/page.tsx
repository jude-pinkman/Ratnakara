'use client';

import { useEffect, useState } from 'react';
import { oceanAPI, fisheriesAPI, taxonomyAPI } from '@/lib/api';
import {
  Waves,
  Fish,
  Dna,
  TreeDeciduous,
  TrendingUp,
  Activity,
  Database,
  Zap,
  ArrowRight,
  BarChart3,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';

export default function DashboardPage() {
  const [oceanKPIs, setOceanKPIs] = useState<any>(null);
  const [fisheriesMetrics, setFisheriesMetrics] = useState<any>(null);
  const [taxonomyStats, setTaxonomyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oceanRes, fisheriesRes, taxonomyRes] = await Promise.all([
          oceanAPI.getKPIs(),
          fisheriesAPI.getMetrics(),
          taxonomyAPI.getStats(),
        ]);

        setOceanKPIs(oceanRes.data.data);
        setFisheriesMetrics(fisheriesRes.data.data);
        setTaxonomyStats(taxonomyRes.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const modules = [
    {
      name: 'Ocean Data',
      description: 'Temperature, salinity, pH monitoring',
      href: '/ocean',
      icon: Waves,
      color: 'from-marine-500 to-marine-600',
      stats: oceanKPIs ? `${parseFloat(oceanKPIs.avg_temp).toFixed(1)}°C avg` : '-',
    },
    {
      name: 'Fisheries',
      description: 'Abundance and biomass tracking',
      href: '/fisheries',
      icon: Fish,
      color: 'from-emerald-500 to-emerald-600',
      stats: fisheriesMetrics ? `${fisheriesMetrics.species_count} species` : '-',
    },
    {
      name: 'eDNA Analysis',
      description: 'Environmental DNA biodiversity',
      href: '/edna',
      icon: Dna,
      color: 'from-purple-500 to-purple-600',
      stats: '960+ samples',
    },
    {
      name: 'Taxonomy',
      description: 'Species classification browser',
      href: '/taxonomy',
      icon: TreeDeciduous,
      color: 'from-orange-500 to-orange-600',
      stats: taxonomyStats ? `${taxonomyStats.species} species` : '-',
    },
  ];

  const quickLinks = [
    { name: 'Visualization', href: '/visualization', icon: BarChart3 },
    { name: 'Correlations', href: '/correlations', icon: Activity },
    { name: 'Terminology', href: '/terminology', icon: Database },
    { name: 'API Docs', href: '/api-docs', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy-900">Dashboard Overview</h1>
              <p className="text-gray-500">Welcome to the Marine Data Analytics Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Avg Ocean Temperature</h3>
              <Waves className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {oceanKPIs ? `${parseFloat(oceanKPIs.avg_temp).toFixed(1)}°C` : '-'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-xs opacity-80">Normal range</span>
            </div>
          </div>

          <div className="kpi-card kpi-card-green">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Total Fish Abundance</h3>
              <Fish className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {fisheriesMetrics ? parseInt(fisheriesMetrics.total_abundance).toLocaleString() : '-'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-xs opacity-80">+12% this month</span>
            </div>
          </div>

          <div className="kpi-card kpi-card-purple">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Species Tracked</h3>
              <Dna className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {fisheriesMetrics ? fisheriesMetrics.species_count : '-'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Globe className="w-4 h-4 opacity-70" />
              <span className="text-xs opacity-80">Across 5 regions</span>
            </div>
          </div>

          <div className="kpi-card kpi-card-orange">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm opacity-90">Taxonomic Records</h3>
              <TreeDeciduous className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {taxonomyStats ? taxonomyStats.species : '-'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Database className="w-4 h-4 opacity-70" />
              <span className="text-xs opacity-80">Full classification</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Data Modules */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-navy-900">Data Modules</h2>
                <span className="text-sm text-gray-500">4 active modules</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link key={module.name} href={module.href}>
                      <div className="group p-4 rounded-xl border border-gray-200 hover:border-marine-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-navy-900 group-hover:text-marine-600 transition-colors">
                              {module.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                            <p className="text-sm font-medium text-marine-600 mt-2">{module.stats}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-marine-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card mt-6">
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Access</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.name} href={link.href}>
                      <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-marine-50 border border-transparent hover:border-marine-200 transition-all cursor-pointer group">
                        <Icon className="w-6 h-6 text-gray-400 group-hover:text-marine-600 transition-colors" />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-marine-700">
                          {link.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="card h-fit">
            <h2 className="text-lg font-semibold text-navy-900 mb-6">System Status</h2>
            <div className="space-y-4">
              {[
                { name: 'Ocean Sensors', status: 'Active', uptime: '99.9%' },
                { name: 'Fisheries Monitoring', status: 'Active', uptime: '99.7%' },
                { name: 'eDNA Analysis', status: 'Active', uptime: '99.8%' },
                { name: 'ML Forecasting', status: 'Active', uptime: '98.5%' },
                { name: 'API Services', status: 'Active', uptime: '99.9%' },
              ].map((system, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">{system.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{system.uptime}</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                      {system.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-marine-50 to-teal-50 border border-marine-100">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-marine-600" />
                <span className="font-semibold text-marine-900">Platform Health</span>
              </div>
              <p className="text-sm text-marine-700">
                All systems are running smoothly with 99.5% average uptime this month.
              </p>
            </div>
          </div>
        </div>

        {/* AI Chatbot */}
        <Chatbot />
      </div>
    </div>
  );
}
