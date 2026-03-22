'use client';

import { useEffect, useState } from 'react';
import { correlationAPI } from '@/lib/api';
import CorrelationChart from '@/components/CorrelationChart';

export default function CorrelationsPage() {
  const [environmentalImpact, setEnvironmentalImpact] = useState<any[]>([]);
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedVariable, setSelectedVariable] = useState<string>('temperature');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [impactRes, speciesRes] = await Promise.all([
          correlationAPI.getEnvironmentalImpact(),
          correlationAPI.getSpeciesList(),
        ]);

        setEnvironmentalImpact(impactRes.data.data);
        setSpeciesList(speciesRes.data.data);
        if (speciesRes.data.data.length > 0) {
          setSelectedSpecies(speciesRes.data.data[0].species);
        }
      } catch (error) {
        console.error('Failed to fetch correlation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading correlation data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Environmental Correlations</h1>

      <div className="card mb-6">
        <h2 className="text-2xl font-semibold mb-4">Correlation Coefficients</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Species</th>
                <th className="px-4 py-2 text-left">Temp Correlation</th>
                <th className="px-4 py-2 text-left">Salinity Correlation</th>
                <th className="px-4 py-2 text-left">pH Correlation</th>
                <th className="px-4 py-2 text-left">Oxygen Correlation</th>
              </tr>
            </thead>
            <tbody>
              {environmentalImpact.slice(0, 10).map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{item.species}</td>
                  <td className="px-4 py-2">
                    <span className={parseFloat(item.temp_correlation) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(item.temp_correlation || 0).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={parseFloat(item.salinity_correlation) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(item.salinity_correlation || 0).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={parseFloat(item.ph_correlation) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(item.ph_correlation || 0).toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={parseFloat(item.oxygen_correlation) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseFloat(item.oxygen_correlation || 0).toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-semibold mb-4">Scatter Plot Analysis</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Select Species</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={selectedSpecies}
              onChange={(e) => setSelectedSpecies(e.target.value)}
            >
              {speciesList.map((s) => (
                <option key={s.species} value={s.species}>
                  {s.species}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Variable</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
            >
              <option value="temperature">Temperature</option>
              <option value="salinity">Salinity</option>
              <option value="ph">pH</option>
              <option value="oxygen">Oxygen</option>
            </select>
          </div>
        </div>

        <CorrelationChart species={selectedSpecies} variable={selectedVariable} />
      </div>
    </div>
  );
}
