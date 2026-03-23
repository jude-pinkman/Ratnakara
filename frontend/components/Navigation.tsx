'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Waves,
  Fish,
  Dna,
  TreeDeciduous,
  LayoutDashboard,
  BarChart3,
  GitBranch,
  BookOpen,
  FileCode2,
  Menu,
  X,
  ChevronRight,
  Compass,
  Map,
  TrendingUp,
  Upload,
  Brain,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Explorer', path: '/explorer', icon: Map },
  { name: 'Ocean Data', path: '/ocean', icon: Waves },
  { name: 'Fisheries', path: '/fisheries', icon: Fish },
  { name: 'eDNA Analysis', path: '/edna', icon: Dna },
  { name: 'Biodiversity', path: '/biodiversity', icon: TreeDeciduous },
  { name: 'Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'Correlations', path: '/correlations', icon: GitBranch },
  { name: 'Upload', path: '/upload', icon: Upload },
  { name: 'API Docs', path: '/api-docs', icon: FileCode2 },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHome = pathname === '/';

  if (isHome) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Marine Data Platform</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              {navItems.slice(0, 6).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="ml-4 px-6 py-2.5 rounded-lg text-sm font-semibold bg-white text-marine-700 hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                Get Started
              </Link>
            </div>

            <button
              className="lg:hidden p-2 rounded-lg bg-white/10 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-navy-900/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex sidebar">
        <div className="flex flex-col h-full w-full">
          {/* Logo */}
          <div className="p-6 border-b border-navy-700">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center shadow-glow">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">Marine Data</span>
                <p className="text-xs text-gray-400">Analytics Platform</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 overflow-y-auto dark-scroll">
            <div className="px-4 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Main Menu
              </span>
            </div>
            <div className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-navy-700">
            <div className="bg-gradient-to-br from-marine-600 to-teal-600 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Compass className="w-8 h-8 text-white" />
                <div>
                  <p className="text-sm font-semibold text-white">Explore Data</p>
                  <p className="text-xs text-white/70">AI-Powered Insights</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="block text-center py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-all"
              >
                View Analytics
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-navy-900 border-b border-navy-700">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-marine-500 to-teal-500 flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">Marine Data</span>
          </Link>
          <button
            className="p-2 rounded-lg bg-navy-800 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="bg-navy-800 border-t border-navy-700 max-h-[70vh] overflow-y-auto">
            <div className="p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-marine-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-navy-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Mobile spacer */}
      <div className="lg:hidden h-16" />
    </>
  );
}
