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
    gradient: 'from-marine-500 to-marine-600',
    shadow: 'hover:shadow-marine-500/25',
  },
  green: {
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'hover:shadow-emerald-500/25',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    shadow: 'hover:shadow-purple-500/25',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    shadow: 'hover:shadow-orange-500/25',
  },
  teal: {
    gradient: 'from-teal-500 to-teal-600',
    shadow: 'hover:shadow-teal-500/25',
  },
};

export default function StatsCard({ title, value, icon: Icon, color, subtitle, trend }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={`bg-gradient-to-br ${colors.gradient} text-white rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${colors.shadow} hover:-translate-y-1`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium opacity-90">{title}</h3>
        </div>
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-medium">
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-xs opacity-80">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
