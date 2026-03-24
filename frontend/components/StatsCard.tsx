import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'teal';
  subtitle?: string;
  trend?: string;
}

const colorClasses = {
  blue: {
    tone: 'bg-sky-50 text-sky-700',
  },
  green: {
    tone: 'bg-emerald-50 text-emerald-700',
  },
  purple: {
    tone: 'bg-fuchsia-50 text-fuchsia-700',
  },
  orange: {
    tone: 'bg-amber-50 text-amber-700',
  },
  teal: {
    tone: 'bg-teal-50 text-teal-700',
  },
};

export default function StatsCard({ title, value, icon: Icon, color, subtitle, trend }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.tone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-semibold text-slate-900 mb-1">{value}</p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
