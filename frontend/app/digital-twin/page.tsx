'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  Factory,
  Fish,
  FlaskConical,
  Globe2,
  SlidersHorizontal,
  ThermometerSun,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ednaAPI, fisheriesAPI, oceanAPI, taxonomyAPI } from '@/lib/api';

type SimulationPoint = {
  year: number;
  biodiversityIndex: number;
  fishStockIndex: number;
  oceanTemperature: number;
  climateStress: number;
  fishingStress: number;
  pollutionStress: number;
};

type ScenarioPreset = 'business' | 'policy' | 'worst' | 'custom';

const PRESENT_YEAR = 2026;
const START_YEAR = 2010;
const END_YEAR = 2050;

export default function DigitalTwinPage() {
  const [loading, setLoading] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);

  const [tempIncrease, setTempIncrease] = useState(2);
  const [fishingPressure, setFishingPressure] = useState(50);
  const [pollutionEnabled, setPollutionEnabled] = useState(true);
  const [pollutionSeverity, setPollutionSeverity] = useState(40);
  const [timePosition, setTimePosition] = useState(50);
  const [activePreset, setActivePreset] = useState<ScenarioPreset>('business');

  const [baseTemp, setBaseTemp] = useState(26);
  const [baseBiodiversity, setBaseBiodiversity] = useState(62);
  const [baseFishStock, setBaseFishStock] = useState(68);

  const applyPreset = (preset: Exclude<ScenarioPreset, 'custom'>) => {
    if (preset === 'business') {
      setTempIncrease(1.8);
      setFishingPressure(55);
      setPollutionEnabled(true);
      setPollutionSeverity(35);
      setTimePosition(60);
    }

    if (preset === 'policy') {
      setTempIncrease(1.2);
      setFishingPressure(30);
      setPollutionEnabled(true);
      setPollutionSeverity(15);
      setTimePosition(65);
    }

    if (preset === 'worst') {
      setTempIncrease(3.5);
      setFishingPressure(85);
      setPollutionEnabled(true);
      setPollutionSeverity(80);
      setTimePosition(75);
    }

    setActivePreset(preset);
  };

  useEffect(() => {
    const fetchBaseline = async () => {
      try {
        const [oceanKpis, fisheriesMetrics, ednaStats, taxonomyStats] = await Promise.all([
          oceanAPI.getKPIs(),
          fisheriesAPI.getMetrics(),
          ednaAPI.getStats(),
          taxonomyAPI.getStats(),
        ]);

        const oceanData = oceanKpis.data?.data || {};
        const fisheriesData = fisheriesMetrics.data?.data || {};
        const ednaData = ednaStats.data?.data || {};
        const taxonomyData = taxonomyStats.data?.data || {};

        const avgTemp = Number(oceanData.avg_temperature || 26);
        const speciesCount = Number(fisheriesData.species_count || 14);
        const diversity = Number(fisheriesData.avg_diversity || 2.4);
        const ednaDetected = Number(ednaData.speciesDetected || 25);
        const taxa = Number(taxonomyData.total_taxa || 400);

        const biodiversityIndex = clamp(
          (speciesCount / 40) * 35 +
            (diversity / 4) * 25 +
            (ednaDetected / 60) * 20 +
            Math.min(taxa / 1200, 1) * 20,
          25,
          92,
        );

        const fishStockIndex = clamp((speciesCount / 40) * 55 + (diversity / 4) * 45, 20, 90);

        setBaseTemp(Number.isFinite(avgTemp) ? avgTemp : 26);
        setBaseBiodiversity(biodiversityIndex);
        setBaseFishStock(fishStockIndex);
      } catch (error) {
        console.error('Failed to load Digital Twin baseline data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBaseline();
  }, []);

  const selectedYear = useMemo(() => {
    const span = END_YEAR - START_YEAR;
    return START_YEAR + Math.round((timePosition / 100) * span);
  }, [timePosition]);

  const simulation = useMemo<SimulationPoint[]>(() => {
    const points: SimulationPoint[] = [];

    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      const progressToFuture = Math.max(0, year - PRESENT_YEAR) / (END_YEAR - PRESENT_YEAR);
      const progressFromPast = Math.max(0, PRESENT_YEAR - year) / (PRESENT_YEAR - START_YEAR);

      const climateStress = tempIncrease * (0.07 + progressToFuture * 0.19);
      const fishingStress = (fishingPressure / 100) * (6 + progressToFuture * 18);

      const eventPulse = pollutionEnabled
        ? Math.exp(-Math.abs(year - selectedYear) / 4.5) * (pollutionSeverity / 100) * 24
        : 0;
      const backgroundPollution = pollutionEnabled ? (pollutionSeverity / 100) * (3 + progressToFuture * 6) : 0;
      const pollutionStress = backgroundPollution + eventPulse;

      const biodiversityRecovery = progressFromPast * 2.8;
      const fishRecovery = progressFromPast * 2.2;

      const biodiversityIndex = clamp(
        baseBiodiversity - climateStress - fishingStress - pollutionStress + biodiversityRecovery,
        4,
        100,
      );

      const fishStockIndex = clamp(
        baseFishStock - climateStress * 0.65 - fishingStress * 1.2 - pollutionStress * 0.55 + fishRecovery,
        2,
        100,
      );

      const oceanTemperature = Number((baseTemp + tempIncrease * progressToFuture - progressFromPast * 0.4).toFixed(2));

      points.push({
        year,
        biodiversityIndex: Number(biodiversityIndex.toFixed(2)),
        fishStockIndex: Number(fishStockIndex.toFixed(2)),
        oceanTemperature,
        climateStress: Number(climateStress.toFixed(2)),
        fishingStress: Number(fishingStress.toFixed(2)),
        pollutionStress: Number(pollutionStress.toFixed(2)),
      });
    }

    return points;
  }, [baseBiodiversity, baseFishStock, baseTemp, fishingPressure, pollutionEnabled, pollutionSeverity, selectedYear, tempIncrease]);

  const currentPoint = useMemo(() => {
    return simulation.find((item) => item.year === selectedYear) || simulation[simulation.length - 1];
  }, [selectedYear, simulation]);

  const presentPoint = useMemo(() => {
    return simulation.find((item) => item.year === PRESENT_YEAR) || currentPoint;
  }, [currentPoint, simulation]);

  const biodiversityShift = useMemo(() => {
    if (!currentPoint || !presentPoint) return 0;
    return Number((currentPoint.biodiversityIndex - presentPoint.biodiversityIndex).toFixed(1));
  }, [currentPoint, presentPoint]);

  const fishShift = useMemo(() => {
    if (!currentPoint || !presentPoint) return 0;
    return Number((currentPoint.fishStockIndex - presentPoint.fishStockIndex).toFixed(1));
  }, [currentPoint, presentPoint]);

  const riskLevel = useMemo(() => {
    if (!currentPoint) return 'Medium';

    const score =
      (100 - currentPoint.biodiversityIndex) * 0.45 +
      (100 - currentPoint.fishStockIndex) * 0.35 +
      currentPoint.pollutionStress * 0.2;

    if (score >= 55) return 'High';
    if (score >= 35) return 'Medium';
    return 'Low';
  }, [currentPoint]);

  const impactBars = useMemo(() => {
    if (!currentPoint) return [];
    return [
      { factor: 'Temperature Rise', value: Number(currentPoint.climateStress.toFixed(1)) },
      { factor: 'Overfishing', value: Number(currentPoint.fishingStress.toFixed(1)) },
      { factor: 'Pollution', value: Number(currentPoint.pollutionStress.toFixed(1)) },
    ];
  }, [currentPoint]);

  const timelineData = useMemo(() => {
    return simulation
      .filter(
        (item) =>
          Number.isFinite(item.year) &&
          Number.isFinite(item.biodiversityIndex) &&
          Number.isFinite(item.fishStockIndex) &&
          Number.isFinite(item.oceanTemperature),
      )
      .map((item) => ({
        ...item,
        yearLabel: String(item.year),
      }));
  }, [simulation]);

  const timelineDomain = useMemo<[number, number]>(() => {
    const values = timelineData.flatMap((item) => [
      item.biodiversityIndex,
      item.fishStockIndex,
      item.oceanTemperature,
    ]);

    if (!values.length) {
      return [0, 100];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(4, (max - min) * 0.1);

    return [Math.max(0, min - pad), Math.min(100, max + pad)];
  }, [timelineData]);

  if (loading) {
    return (
      <div className="min-h-screen px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="surface p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <p className="mt-4 text-sm text-slate-600">Initializing digital ocean twin...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="surface p-6 md:p-8">
          <p className="eyebrow mb-2">Simulation Environment</p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl text-slate-900 md:text-4xl">Digital Twin of the Ocean</h1>
              <p className="mt-2 text-sm text-slate-600">
                Run what-if scenarios for climate stress, overfishing, and pollution events across a past-to-future timeline.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdvancedMode((prev) => !prev)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                advancedMode
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              Advanced Analysis: {advancedMode ? 'On' : 'Off'}
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Scenario Presets</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('business')}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activePreset === 'business'
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                Business as Usual
              </button>
              <button
                type="button"
                onClick={() => applyPreset('policy')}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activePreset === 'policy'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                Policy Intervention
              </button>
              <button
                type="button"
                onClick={() => applyPreset('worst')}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activePreset === 'worst'
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                Worst-case Climate Stress
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ControlCard
              icon={ThermometerSun}
              title="Temperature Rise"
              value={`${tempIncrease.toFixed(1)}°C`}
            >
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={tempIncrease}
                onChange={(event) => {
                  setTempIncrease(Number(event.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-rose-500"
              />
            </ControlCard>

            <ControlCard
              icon={Fish}
              title="Fishing Pressure"
              value={`${fishingPressure}%`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={fishingPressure}
                onChange={(event) => {
                  setFishingPressure(Number(event.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-emerald-600"
              />
            </ControlCard>

            <ControlCard
              icon={Factory}
              title="Pollution Severity"
              value={pollutionEnabled ? `${pollutionSeverity}%` : 'Disabled'}
            >
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-slate-600">
                  Enable Pollution Event
                  <input
                    type="checkbox"
                    checked={pollutionEnabled}
                    onChange={(event) => {
                      setPollutionEnabled(event.target.checked);
                      setActivePreset('custom');
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!pollutionEnabled}
                  value={pollutionSeverity}
                  onChange={(event) => {
                    setPollutionSeverity(Number(event.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-full accent-amber-500 disabled:opacity-40"
                />
              </div>
            </ControlCard>

            <ControlCard
              icon={Clock3}
              title="Projection Year"
              value={`${selectedYear}`}
            >
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={timePosition}
                onChange={(event) => {
                  setTimePosition(Number(event.target.value));
                  setActivePreset('custom');
                }}
                className="w-full accent-cyan-600"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>{START_YEAR}</span>
                <span>{PRESENT_YEAR}</span>
                <span>{END_YEAR}</span>
              </div>
            </ControlCard>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Use Cases</p>
                </div>
              </div>
              <ul className="space-y-1 text-sm text-slate-100">
                <li>Climate research</li>
                <li>Policy simulation</li>
                <li>Fisheries regulation planning</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Biodiversity Shift"
            value={`${biodiversityShift > 0 ? '+' : ''}${biodiversityShift}%`}
            note="Compared with present-year baseline"
            tone={biodiversityShift < 0 ? 'rose' : 'emerald'}
          />
          <MetricCard
            title="Fish Stock Shift"
            value={`${fishShift > 0 ? '+' : ''}${fishShift}%`}
            note="Projected stock change under current scenario"
            tone={fishShift < 0 ? 'amber' : 'emerald'}
          />
          <MetricCard
            title="Risk Level"
            value={riskLevel}
            note="Scenario risk classification"
            tone={riskLevel === 'High' ? 'rose' : riskLevel === 'Medium' ? 'amber' : 'emerald'}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <div className="surface p-5 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl text-slate-900">Twin Projection Timeline</h2>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                What-if mode
              </div>
            </div>
            <p className="text-sm text-slate-600">Move controls to see biodiversity and fish stock behavior from past context into future projection.</p>

            <div className="mt-4 h-[360px]">
              {timelineData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                    <XAxis dataKey="yearLabel" stroke="#6d7a75" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} domain={timelineDomain} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: '#d8dfdb',
                        background: '#ffffff',
                      }}
                    />
                    <Legend />
                    <ReferenceLine x={String(selectedYear)} stroke="#0ea5e9" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="biodiversityIndex" stroke="#0f766e" strokeWidth={2.4} dot={false} name="Biodiversity Index" />
                    <Line type="monotone" dataKey="fishStockIndex" stroke="#1f2937" strokeWidth={2.2} dot={false} name="Fish Stock Index" />
                    <Line type="monotone" dataKey="oceanTemperature" stroke="#ea580c" strokeWidth={1.8} dot={false} name="Ocean Temperature (normalized trend)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70">
                  <p className="text-sm text-slate-500">No valid simulation points available for timeline rendering.</p>
                </div>
              )}
            </div>
          </div>

          <div className="surface p-5 lg:col-span-4">
            <h2 className="text-2xl text-slate-900">Impact Breakdown</h2>
            <p className="mt-1 text-sm text-slate-600">Drivers contributing to ecological stress in {selectedYear}</p>

            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactBars}>
                  <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                  <XAxis dataKey="factor" stroke="#6d7a75" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={60} />
                  <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: '#d8dfdb',
                      background: '#ffffff',
                    }}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">Scenario Summary</p>
              <p className="mt-1 text-xs text-slate-600">
                +{tempIncrease.toFixed(1)}°C warming, {fishingPressure}% fishing pressure, pollution {pollutionEnabled ? `on (${pollutionSeverity}%)` : 'off'}.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Preset: {activePreset === 'custom' ? 'Custom' : activePreset === 'business' ? 'Business as Usual' : activePreset === 'policy' ? 'Policy Intervention' : 'Worst-case Climate Stress'}
              </p>
            </div>
          </div>
        </section>

        {advancedMode ? (
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="surface p-5 lg:col-span-7">
              <h2 className="text-2xl text-slate-900">Stress Components Over Time</h2>
              <p className="mt-1 text-sm text-slate-600">Advanced view for model diagnostics and policy sensitivity checks.</p>

              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulation}>
                    <CartesianGrid stroke="#e5ebe8" strokeDasharray="3 3" />
                    <XAxis dataKey="year" stroke="#6d7a75" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6d7a75" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: '#d8dfdb',
                        background: '#ffffff',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="climateStress" stroke="#f97316" strokeWidth={2} dot={false} name="Climate Stress" />
                    <Line type="monotone" dataKey="fishingStress" stroke="#14b8a6" strokeWidth={2} dot={false} name="Fishing Stress" />
                    <Line type="monotone" dataKey="pollutionStress" stroke="#e11d48" strokeWidth={2} dot={false} name="Pollution Stress" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="surface p-5 lg:col-span-5">
              <h2 className="text-2xl text-slate-900">Model Notes</h2>
              <p className="mt-1 text-sm text-slate-600">Interpretation guardrails for researchers and policy teams.</p>

              <div className="mt-4 space-y-3">
                <NoteCard
                  icon={ThermometerSun}
                  title="Temperature Rise Impact"
                  text="Warming increases ecological stress gradually, with stronger influence in long-horizon projections."
                />
                <NoteCard
                  icon={Fish}
                  title="Overfishing Scenario"
                  text="Fishing pressure compounds risk by reducing stock resilience and long-term biodiversity stability."
                />
                <NoteCard
                  icon={FlaskConical}
                  title="Pollution Event"
                  text="Pollution introduces a localized spike around selected year and a background stress floor."
                />
                <NoteCard
                  icon={AlertTriangle}
                  title="Policy Planning"
                  text="Use multiple scenario runs to compare intervention pathways before translating into regulation."
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ControlCard({
  icon: Icon,
  title,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-cyan-700" />
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        <span className="text-sm font-semibold text-slate-900">{value}</span>
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  tone: 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses: Record<'emerald' | 'amber' | 'rose', string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{note}</p>
    </div>
  );
}

function NoteCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}
