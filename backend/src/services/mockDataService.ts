const emptyArray = () => [] as any[];

export const mockDataService = {
  getOceanData: emptyArray,
  getOceanKPIs: emptyArray,
  getOceanTrends: emptyArray,
  getOceanGeospatial: emptyArray,
  getFisheriesMetrics: emptyArray,
  getFisheriesSpeciesDistribution: emptyArray,
  getFisheriesTemporal: emptyArray,
  getFisheriesGeospatial: emptyArray,
  getEdnaConcentrationTrends: emptyArray,
  getEdnaDepthAnalysis: emptyArray,
  getEdnaSeasonal: emptyArray,
  getEdnaConfidenceDistribution: emptyArray,
  getEdnaSpeciesList: emptyArray,
  getTaxonomy: emptyArray,
  getCorrelations: emptyArray,
  getForecasts: emptyArray,
  getBiodiversitySequences: emptyArray,
  getBiodiversityAnomalies: emptyArray,
  getBiodiversityRichness: emptyArray,
  getBiodiversityComparison: emptyArray,
  getBiodiversityKPIs: emptyArray
};

export default mockDataService;
