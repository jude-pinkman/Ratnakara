interface OceanKPIsProps {
  kpis: {
    avg_temp: string;
    avg_salinity: string;
    avg_ph: string;
    avg_oxygen: string;
    min_temp: string;
    max_temp: string;
    total_records: string;
  };
}

export default function OceanKPIs({ kpis }: OceanKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="kpi-card">
        <h3 className="text-sm opacity-90 mb-2">Avg Temperature</h3>
        <p className="text-3xl font-bold">{parseFloat(kpis.avg_temp).toFixed(2)}°C</p>
        <p className="text-xs mt-2 opacity-80">
          Range: {parseFloat(kpis.min_temp).toFixed(1)}°C - {parseFloat(kpis.max_temp).toFixed(1)}°C
        </p>
      </div>

      <div className="kpi-card">
        <h3 className="text-sm opacity-90 mb-2">Avg Salinity</h3>
        <p className="text-3xl font-bold">{parseFloat(kpis.avg_salinity).toFixed(2)} PSU</p>
        <p className="text-xs mt-2 opacity-80">Practical Salinity Units</p>
      </div>

      <div className="kpi-card">
        <h3 className="text-sm opacity-90 mb-2">Avg pH Level</h3>
        <p className="text-3xl font-bold">{parseFloat(kpis.avg_ph).toFixed(2)}</p>
        <p className="text-xs mt-2 opacity-80">Ocean Acidity</p>
      </div>

      <div className="kpi-card">
        <h3 className="text-sm opacity-90 mb-2">Avg Oxygen</h3>
        <p className="text-3xl font-bold">{parseFloat(kpis.avg_oxygen).toFixed(2)} mg/L</p>
        <p className="text-xs mt-2 opacity-80">Dissolved Oxygen</p>
      </div>
    </div>
  );
}
