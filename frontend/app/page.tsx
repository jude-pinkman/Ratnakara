'use client';

import Link from 'next/link';
import {
  Waves,
  Fish,
  Dna,
  TreeDeciduous,
  TrendingUp,
  GitBranch,
  Globe2,
  ArrowRight,
  Clock3,
  ShieldCheck,
  Radar,
} from 'lucide-react';

const modules = [
  {
    title: 'Ocean Signals',
    href: '/ocean',
    icon: Waves,
    description: 'Simple view of temperature, wind, and wave changes.',
  },
  {
    title: 'Fisheries Lens',
    href: '/fisheries',
    icon: Fish,
    description: 'Fish stock and species activity with easy trend summaries.',
  },
  {
    title: 'eDNA Evidence',
    href: '/edna',
    icon: Dna,
    description: 'DNA-based biodiversity signals explained with confidence scores.',
  },
  {
    title: 'Biodiversity Tree',
    href: '/biodiversity',
    icon: TreeDeciduous,
    description: 'Species groups and biodiversity structure in one place.',
  },
];

const analytics = [
  {
    title: 'Forecasting',
    href: '/forecast',
    icon: TrendingUp,
    description: 'Future trend preview with beginner-friendly interpretation.',
  },
  {
    title: 'Correlations',
    href: '/correlations',
    icon: GitBranch,
    description: 'Shows which variables move together and which do not.',
  },
  {
    title: 'Digital Twin',
    href: '/digital-twin',
    icon: Globe2,
    description: 'Try what-if scenarios like warming, overfishing, and pollution.',
  },
  {
    title: 'Live Explorer',
    href: '/explorer',
    icon: Radar,
    description: 'Interactive map to quickly explore real-time data points.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen px-5 pb-16 pt-24 md:px-8 md:pt-28">
      <div className="mx-auto max-w-7xl">
        <section className="surface reveal-in relative overflow-hidden p-7 md:p-12">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-teal-100 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />

          <div className="relative">
            <p className="eyebrow mb-4">Student Presentation Ready</p>
            <h1 className="max-w-4xl text-4xl leading-tight text-slate-900 md:text-6xl">
              Present ocean science clearly in 5 minutes.
            </h1>
            <p className="muted mt-6 max-w-2xl text-base md:text-lg">
              This project is organized for first-year students: start from the dashboard,
              explain trends with simple visuals, and then open advanced tools only if needed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start 3-Step Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
              >
                API Documentation
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricTile value="Step 1" label="Open dashboard overview" icon={Clock3} />
              <MetricTile value="Step 2" label="Show topic-specific pages" icon={Radar} />
              <MetricTile value="Step 3" label="Run one what-if scenario" icon={ShieldCheck} />
              <MetricTile value="Tip" label="Keep advanced mode optional" icon={TrendingUp} />
            </div>
          </div>
        </section>

        <section className="reveal-in-delay mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow mb-2">Explore by Topic</p>
                <h2 className="text-3xl text-slate-900">Project Sections</h2>
              </div>
              <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:text-teal-800">
                Start from dashboard
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.title} href={item.href} className="surface-soft group p-5 transition hover:bg-white">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                    </div>
                    <h3 className="text-xl text-slate-900">{item.title}</h3>
                    <p className="muted mt-2 text-sm">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="surface h-full p-6">
              <p className="eyebrow mb-2">Presentation Flow</p>
              <h2 className="text-2xl text-slate-900">Tools for Class Demo</h2>
              <p className="muted mt-2 text-sm">
                Use these after the dashboard to answer "what is happening", "why", and "what if".
              </p>

              <div className="mt-5 space-y-3">
                {analytics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Icon className="h-4 w-4 text-teal-700" />
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      </div>
                      <p className="text-xs text-slate-600">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricTile({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-teal-700">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-semibold">{value}</p>
      </div>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}
