'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { oceanAPI, fisheriesAPI, taxonomyAPI, ednaAPI, correlationAPI } from '@/lib/api';
import {
  Waves,
  Fish,
  Dna,
  TreeDeciduous,
  TrendingUp,
  ArrowRight,
  Activity,
  ShieldCheck,
  Scale,
  Gauge,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';

type NullableNumber = number | null;

export default function DashboardPage() {
  const [oceanKPIs, setOceanKPIs] = useState<any>(null);
  const [oceanTrends, setOceanTrends] = useState<any[]>([]);
  const [fisheriesMetrics, setFisheriesMetrics] = useState<any>(null);
  const [taxonomyStats, setTaxonomyStats] = useState<any>(null);
  const [ednaSamples, setEdnaSamples] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);

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

  const avgConfidence = useMemo(() => {
    if (!ednaSamples.length) return null;
    const value =
      ednaSamples.reduce((sum: number, sample: any) => sum + parseFloat(sample.confidence || 0), 0) /
      ednaSamples.length;
    return Math.round(value * 100);
  }, [ednaSamples]);

  const topCorrelations = useMemo(() => {
    return [...correlations]
      .sort(
        (a: any, b: any) =>
          Math.abs(parseFloat(b.correlation_coefficient || 0)) -
          Math.abs(parseFloat(a.correlation_coefficient || 0)),
      )
      .slice(0, 6);
  }, [correlations]);

  const trendDiagnostics = useMemo(() => {
    const tempSeries = oceanTrends
      .map((item: any) => Number(item?.avg_temperature))
      .filter((value: number) => Number.isFinite(value));

    const waveSeries = oceanTrends
      .map((item: any) => Number(item?.avg_wave_height))
      .filter((value: number) => Number.isFinite(value));

    const windSeries = oceanTrends
      .map((item: any) => Number(item?.avg_wind_speed))
      .filter((value: number) => Number.isFinite(value));

    const recentTemps = tempSeries.slice(-3);
    const previousTemps = tempSeries.slice(-6, -3);

    const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

    const recentMean = mean(recentTemps);
    const previousMean = mean(previousTemps);
    const momentum =
      recentMean !== null && previousMean !== null && previousMean !== 0
        ? ((recentMean - previousMean) / previousMean) * 100
        : null;

    const waveMean = mean(waveSeries);
    const waveVariance =
      waveSeries.length > 1 && waveMean !== null
        ? waveSeries.reduce((acc, value) => acc + (value - waveMean) ** 2, 0) / waveSeries.length
        : null;
    const waveVolatility =
      waveVariance !== null && waveMean && waveMean !== 0
        ? (Math.sqrt(waveVariance) / waveMean) * 100
        : null;

    const windPeak = windSeries.length ? Math.max(...windSeries) : null;

    const deltaSeries = oceanTrends.map((item: any, index: number) => {
      const current = Number(item?.avg_temperature);
      const previous = Number(oceanTrends[index - 1]?.avg_temperature);

      return {
        day: item?.day,
        delta: Number.isFinite(current) && Number.isFinite(previous) ? Number((current - previous).toFixed(2)) : 0,
      };
    }).slice(1);

    return {
      momentum,
      waveVolatility,
      windPeak,
      deltaSeries,
    };
  }, [oceanTrends]);

  const trendYDomain = useMemo<[number, number]>(() => {
    const values = oceanTrends
      .flatMap((item: any) => [
        Number(item?.avg_temperature),
        Number(item?.avg_wave_height),
        Number(item?.avg_wind_speed),
      ])
      .filter((value: number) => Number.isFinite(value));

    if (!values.length) {
      return [0, 1];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const pad = Math.max(1, Math.abs(min) * 0.1);
      return [Math.max(0, min - pad), max + pad];
    }

    const pad = (max - min) * 0.12;
    return [Math.max(0, min - pad), max + pad];
  }, [oceanTrends]);

  const coverageQuality = useMemo(() => {
    const coverage = oceanKPIs?.data_coverage;
    const total = Number(oceanKPIs?.total_records || 0);

    if (!coverage || !total) {
      return null;
    }

    const tempScore = (Number(coverage.temperature_records || 0) / total) * 100;
    const waveScore = (Number(coverage.wave_height_records || 0) / total) * 100;
    const windScore = (Number(coverage.wind_speed_records || 0) / total) * 100;

    return Math.round((tempScore + waveScore + windScore) / 3);
  }, [oceanKPIs]);

  const correlationBalance = useMemo(() => {
    if (!correlations.length) {
      return { positive: 0, negative: 0, neutral: 0 };
    }

    return correlations.reduce(
      (acc: { positive: number; negative: number; neutral: number }, item: any) => {
        const coeff = Number(item?.correlation_coefficient || 0);

        if (coeff >= 0.25) {
          acc.positive += 1;
        } else if (coeff <= -0.25) {
          acc.negative += 1;
        } else {
          acc.neutral += 1;
        }

        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 },
    );
  }, [correlations]);

  if (loading) {
    return (
      <div className="min-h-screen px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="surface p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="mt-4 text-sm text-slate-600">Preparing marine insights...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="surface reveal-in p-6 md:p-8">
          <p className="eyebrow mb-2">Classroom Overview</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl text-slate-900 md:text-4xl">Ocean Health Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Start here during your presentation. Explain the 4 key cards first, then open one chart.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdvancedMode((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  advancedMode
                    ? 'border-teal-300 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                Advanced View: {advancedMode ? 'On' : 'Off'}
              </button>
              <QuickLink href="/explorer" label="Open Live Map" />
              <QuickLink href="/api-docs" label="API Docs (Optional)" />
            </div>
          </div>
        </section>

        <section className="surface-soft p-4 md:p-5">
          <h2 className="text-base font-semibold text-slate-900">How to explain this page</h2>
          <p className="mt-2 text-sm text-slate-600">
            1) Show current averages, 2) describe one visible trend, 3) switch on Advanced View only for deeper Q&amp;A.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Waves}
            label="Avg Temperature"
            value={formatNumber(oceanKPIs?.avg_temperature, 1)}
            suffix="°C"
            note={`${oceanKPIs?.station_count || 0} active stations`}
          />
          <StatCard
            icon={Waves}
            label="Avg Wave Height"
            value={formatNumber(oceanKPIs?.avg_wave_height, 1)}
            suffix="m"
            note={`${oceanKPIs?.total_records || 0} ocean records`}
          />
          <StatCard
            icon={Fish}
            label="Species Tracked"
            value={fisheriesMetrics?.species_count || '-'}
            suffix=""
            note={fisheriesMetrics?.avg_biomass ? `${Math.round(fisheriesMetrics.avg_biomass)} avg biomass` : 'No biomass metric'}
          />
          <StatCard
            icon={Dna}
            label="eDNA Confidence"
            value={avgConfidence ?? '-'}
            suffix={avgConfidence !== null ? '%' : ''}
            note={`${ednaSamples.length} samples loaded`}
          />
        </section>

        {advancedMode ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AnalysisLensCard
              icon={TrendingUp}
              title="Momentum Lens"
              value={trendDiagnostics.momentum !== null ? `${formatNumber(trendDiagnostics.momentum, 1)}%` : '-'}
              note="3-sample temperature change versus previous window"
              tone="text-emerald-700 bg-emerald-50"
            />
            <AnalysisLensCard
              icon={Activity}
              title="Stability Lens"
              value={trendDiagnostics.waveVolatility !== null ? `${formatNumber(trendDiagnostics.waveVolatility, 1)}%` : '-'}
              note="Wave volatility index (coefficient of variation)"
              tone="text-sky-700 bg-sky-50"
            />
            <AnalysisLensCard
              icon={ShieldCheck}
              title="Data Quality Lens"
              value={coverageQuality !== null ? `${coverageQuality}` : '-'}
              note="Composite completeness score across key ocean metrics"
              tone="text-teal-700 bg-teal-50"
            />
            <AnalysisLensCard
              icon={Scale}
              title="Relationship Lens"
              value={`${correlationBalance.positive}/${correlationBalance.negative}/${correlationBalance.neutral}`}
              note="Positive / Negative / Neutral coefficient distribution"
              tone="text-violet-700 bg-violet-50"
            />
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-12">
          <div className="surface p-5 lg:col-span-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl text-slate-900">Ocean Trend Line</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Last samples</span>
            </div>
            {oceanTrends.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={oceanTrends}>
                  <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#6d7a75" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} domain={trendYDomain} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: '#d8dfdb',
                      background: '#ffffff',
                    }}
                  />
                  <Line type="monotone" dataKey="avg_temperature" stroke="#0f766e" strokeWidth={2.3} dot={false} name="Temperature" />
                  <Line type="monotone" dataKey="avg_wave_height" stroke="#0369a1" strokeWidth={2} dot={false} name="Wave Height" />
                  <Line type="monotone" dataKey="avg_wind_speed" stroke="#1f2937" strokeWidth={2} dot={false} name="Wind Speed" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No trend data available yet." />
            )}
          </div>

          <div className="surface p-5 lg:col-span-4">
            <h2 className="text-2xl text-slate-900">Coverage Snapshot</h2>
            <p className="mt-1 text-sm text-slate-600">Measurement completeness by variable</p>

            <div className="mt-5 space-y-3">
              <CoverageRow
                label="Temperature"
                current={oceanKPIs?.data_coverage?.temperature_records || 0}
                total={oceanKPIs?.total_records || 0}
              />
              <CoverageRow
                label="Wave Height"
                current={oceanKPIs?.data_coverage?.wave_height_records || 0}
                total={oceanKPIs?.total_records || 0}
              />
              <CoverageRow
                label="Wind Speed"
                current={oceanKPIs?.data_coverage?.wind_speed_records || 0}
                total={oceanKPIs?.total_records || 0}
              />
            </div>

            <div className="mt-5 rounded-xl bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-900">Taxonomy records</p>
              <p className="mt-1 text-2xl font-semibold text-teal-800">{taxonomyStats?.total_taxa || 0}</p>
              <p className="mt-1 text-xs text-teal-800/80">Continuously synchronized from source pipeline</p>
            </div>
          </div>
        </section>

        {advancedMode ? (
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="surface p-5 lg:col-span-7">
              <h2 className="text-2xl text-slate-900">Rate-of-Change Analysis</h2>
              <p className="mt-1 text-sm text-slate-600">Day-to-day temperature delta to expose turning points quickly</p>

              {trendDiagnostics.deltaSeries.length ? (
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendDiagnostics.deltaSeries}>
                      <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                      <XAxis dataKey="day" stroke="#6d7a75" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: '#d8dfdb',
                          background: '#ffffff',
                        }}
                      />
                      <Bar dataKey="delta" fill="#334155" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState message="Not enough trend points for change-rate analysis." />
              )}
            </div>

            <div className="surface p-5 lg:col-span-5">
              <h2 className="text-2xl text-slate-900">Extremes Watch</h2>
              <p className="mt-1 text-sm text-slate-600">Operational guardrails based on observed peaks and confidence</p>

              <div className="mt-5 space-y-3">
                <ExtremesRow
                  icon={Gauge}
                  label="Peak Wind"
                  value={trendDiagnostics.windPeak !== null ? `${formatNumber(trendDiagnostics.windPeak, 1)} m/s` : '-'}
                  description="Highest wind speed in current trend window"
                />
                <ExtremesRow
                  icon={Dna}
                  label="eDNA Confidence"
                  value={avgConfidence !== null ? `${avgConfidence}%` : '-'}
                  description="Average confidence level across sampled molecular detections"
                />
                <ExtremesRow
                  icon={Fish}
                  label="Biomass Intensity"
                  value={fisheriesMetrics?.avg_biomass ? `${Math.round(fisheriesMetrics.avg_biomass)}` : '-'}
                  description="Mean fisheries biomass signal from available records"
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-12">
          <div className="surface p-5 lg:col-span-5">
            <h2 className="text-2xl text-slate-900">Most Significant Correlations</h2>
            <p className="mt-1 text-sm text-slate-600">Highest absolute coefficients across species factors</p>

            {topCorrelations.length ? (
              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCorrelations.map((item: any) => ({
                    species: item.species,
                    coeff: parseFloat(item.correlation_coefficient || 0),
                  }))}>
                    <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                    <XAxis dataKey="species" stroke="#6d7a75" tick={{ fontSize: 11 }} interval={0} angle={-24} textAnchor="end" height={65} />
                    <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: '#d8dfdb',
                        background: '#ffffff',
                      }}
                    />
                    <Bar dataKey="coeff" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No correlation records available." />
            )}
          </div>

          <div className="surface p-5 lg:col-span-7">
            <h2 className="text-2xl text-slate-900">Key Relationships</h2>
            <p className="mt-1 text-sm text-slate-600">Top records ranked by correlation magnitude</p>

            {topCorrelations.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.13em] text-slate-500">
                      <th className="px-2 py-3">Species</th>
                      <th className="px-2 py-3">Temp</th>
                      <th className="px-2 py-3">Abundance</th>
                      <th className="px-2 py-3">Coeff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCorrelations.map((corr: any, index: number) => {
                      const coeff = parseFloat(corr.correlation_coefficient || 0);
                      return (
                        <tr key={`${corr.species}-${index}`} className="border-b border-slate-100">
                          <td className="px-2 py-3 font-medium text-slate-900">{corr.species}</td>
                          <td className="px-2 py-3 text-slate-700">{formatNumber(corr.temperature, 1)}°C</td>
                          <td className="px-2 py-3 text-slate-700">{corr.abundance || '-'}</td>
                          <td className="px-2 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coeff >= 0.4
                              ? 'bg-emerald-100 text-emerald-800'
                              : coeff <= -0.4
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                              }`}>
                              {formatNumber(coeff, 3)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No relationship data available." />
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionTile href="/ocean" icon={Waves} title="Ocean" description="Deep station and variable drill-down" />
          <ActionTile href="/fisheries" icon={Fish} title="Fisheries" description="Species-level abundance trends" />
          <ActionTile href="/edna" icon={Dna} title="eDNA" description="Confidence and concentration views" />
          <ActionTile href="/taxonomy" icon={TreeDeciduous} title="Taxonomy" description="Classification and hierarchy" />
        </section>
      </div>
    </div>
  );
}

function formatNumber(value: NullableNumber | string, decimals: number) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return '-';
  }

  return Number(value).toFixed(decimals);
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
    >
      {label}
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix: string;
  note: string;
}) {
  return (
    <div className="surface-soft reveal-in p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-semibold text-slate-900">
        {value}
        {suffix ? <span className="ml-1 text-lg text-slate-600">{suffix}</span> : null}
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function CoverageRow({ label, current, total }: { label: string; current: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-teal-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="surface-soft group p-4 transition hover:bg-white">
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
          <Icon className="h-4 w-4" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function AnalysisLensCard({
  icon: Icon,
  title,
  value,
  note,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="surface-soft p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function ExtremesRow({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
