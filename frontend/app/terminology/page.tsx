'use client';

const terminologyData = [
  {
    term: 'Temperature',
    definition: 'Water temperature measured in degrees Celsius',
    impact: 'Affects metabolic rates, oxygen solubility, and species distribution',
    range: '24-32°C in Indian coastal waters',
  },
  {
    term: 'Salinity',
    definition: 'Amount of dissolved salts in water, measured in Practical Salinity Units (PSU)',
    impact: 'Influences osmoregulation, buoyancy, and habitat suitability for marine organisms',
    range: '32-37 PSU typical for Indian Ocean',
  },
  {
    term: 'pH Level',
    definition: 'Measure of water acidity/alkalinity on a scale of 0-14',
    impact: 'Ocean acidification affects shell formation, coral reefs, and marine food webs',
    range: '7.8-8.3 for healthy marine ecosystems',
  },
  {
    term: 'Dissolved Oxygen',
    definition: 'Amount of oxygen dissolved in water, measured in mg/L',
    impact: 'Essential for respiration of marine life; hypoxia can cause mass mortality events',
    range: '4.5-8.5 mg/L for optimal marine health',
  },
  {
    term: 'Abundance',
    definition: 'Total number of individual organisms of a species in a given area',
    impact: 'Indicates population health and ecosystem productivity',
    range: 'Varies widely by species and season',
  },
  {
    term: 'Biomass',
    definition: 'Total mass of living organisms in a specific volume or area, measured in kg',
    impact: 'Indicates ecosystem productivity and fishery potential',
    range: 'Depends on trophic level and ecosystem type',
  },
  {
    term: 'Diversity Index',
    definition: 'Statistical measure of species richness and evenness in a community',
    impact: 'Higher diversity indicates healthier, more resilient ecosystems',
    range: '0-1, with higher values indicating greater diversity',
  },
  {
    term: 'eDNA',
    definition: 'Environmental DNA - genetic material shed by organisms into their environment',
    impact: 'Non-invasive biodiversity monitoring and species detection',
    range: 'Concentration varies with species density and water conditions',
  },
  {
    term: 'Confidence Level',
    definition: 'Statistical probability that eDNA detection accurately identifies species presence',
    impact: 'Higher confidence reduces false positives in biodiversity assessments',
    range: '50-99% depending on sample quality and analysis methods',
  },
  {
    term: 'Seasonal Variation',
    definition: 'Changes in oceanographic parameters across different seasons',
    impact: 'Affects breeding cycles, migration patterns, and resource availability',
    range: 'Monsoon season shows highest variability in Indian waters',
  },
  {
    term: 'Correlation Coefficient',
    definition: 'Statistical measure (-1 to +1) of linear relationship between two variables',
    impact: 'Identifies environmental factors most affecting fish populations',
    range: '>0.7 strong, 0.4-0.7 moderate, <0.4 weak correlation',
  },
  {
    term: 'LSTM Forecasting',
    definition: 'Long Short-Term Memory neural networks for time-series prediction',
    impact: 'Predicts future fish populations for sustainable fishery management',
    range: 'Accuracy depends on historical data quality and length',
  },
];

export default function TerminologyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Marine Data Terminology</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {terminologyData.map((item) => (
          <div key={item.term} className="card">
            <h3 className="text-xl font-bold text-ocean-700 mb-3">{item.term}</h3>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Definition</h4>
                <p className="text-sm text-gray-700">{item.definition}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Environmental Impact</h4>
                <p className="text-sm text-gray-700">{item.impact}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Typical Range</h4>
                <p className="text-sm text-gray-700">{item.range}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
