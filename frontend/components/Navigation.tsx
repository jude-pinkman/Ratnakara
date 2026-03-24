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
  GitBranch,
  FileCode2,
  Menu,
  X,
  Compass,
  Map,
  TrendingUp,
  ChevronRight,
  Globe2,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Explorer', path: '/explorer', icon: Map },
  { name: 'Ocean', path: '/ocean', icon: Waves },
  { name: 'Fisheries', path: '/fisheries', icon: Fish },
  { name: 'eDNA', path: '/edna', icon: Dna },
  { name: 'Biodiversity', path: '/biodiversity', icon: TreeDeciduous },
  { name: 'Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'Digital Twin', path: '/digital-twin', icon: Globe2 },
  { name: 'Correlations', path: '/correlations', icon: GitBranch },
  { name: 'API Docs', path: '/api-docs', icon: FileCode2 },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHome = pathname === '/';

  if (isHome) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/30 bg-[#f5f6f4]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-900 text-white shadow-sm">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-teal-800/80">Marine Intelligence</p>
                <p className="text-sm font-semibold text-slate-900">Data Platform</p>
              </div>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {navItems.slice(0, 5).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="rounded-xl px-3.5 py-2 text-sm text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="ml-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Dashboard
              </Link>
            </div>

            <button
              className="rounded-xl border border-slate-300 bg-white p-2 text-slate-800 lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-[#f5f6f4] px-4 py-3 lg:hidden">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 hover:bg-white"
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>
    );
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-[#f8f9f7] lg:flex">
        <div className="flex h-full w-full flex-col p-4">
          <Link href="/" className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-teal-800">Marine Intelligence</p>
              <p className="text-sm font-semibold text-slate-900">Data Platform</p>
            </div>
          </Link>

          <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</div>
          <nav className="space-y-1 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Student Tip</p>
                <p className="text-xs text-slate-500">Begin with the dashboard story</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="block rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open Dashboard First
            </Link>
          </div>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-[#f8f9f7] lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Waves className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Marine Data</span>
          </Link>
          <button
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-800"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="max-h-[68vh] overflow-y-auto border-t border-slate-200 bg-[#f8f9f7] p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="h-14 lg:hidden" />
    </>
  );
}
