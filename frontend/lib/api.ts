import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const oceanAPI = {
  getAll: (params?: any) => api.get('/api/ocean', { params }),
  getKPIs: () => api.get('/api/ocean/kpis'),
  getTrends: () => api.get('/api/ocean/trends'),
  getGeospatial: () => api.get('/api/ocean/geospatial'),
};

export const fisheriesAPI = {
  getAll: (params?: any) => api.get('/api/fisheries', { params }),
  getMetrics: (params?: any) => api.get('/api/fisheries/metrics', { params }),
  getSpeciesDistribution: (params?: any) => api.get('/api/fisheries/species-distribution', { params }),
  getTemporal: (params?: any) => api.get('/api/fisheries/temporal', { params }),
  getGeospatial: (params?: any) => api.get('/api/fisheries/geospatial', { params }),
  getHighestPopulationArea: (species: string) =>
    api.get('/api/fisheries/highest-population-area', { params: { species } }),
};

export const ednaAPI = {
  getAll: (params?: any) => api.get('/api/edna', { params }),
  getConcentrationTrends: (params?: any) => api.get('/api/edna/concentration-trends', { params }),
  getDepthAnalysis: (params?: any) => api.get('/api/edna/depth-analysis', { params }),
  getSeasonal: (params?: any) => api.get('/api/edna/seasonal', { params }),
  getConfidenceDistribution: (params?: any) => api.get('/api/edna/confidence-distribution', { params }),
  getSpeciesList: (params?: any) => api.get('/api/edna/species-list', { params }),
  getStats: () => api.get('/api/edna/stats'),
};

export const taxonomyAPI = {
  getAll: () => api.get('/api/taxonomy'),
  getTree: () => api.get('/api/taxonomy/tree'),
  getSpecies: (species: string) => api.get(`/api/taxonomy/species/${species}`),
  search: (query: string) => api.get('/api/taxonomy/search', { params: { q: query } }),
  getStats: () => api.get('/api/taxonomy/stats'),
};

export const correlationAPI = {
  getAll: (params?: any) => api.get('/api/correlation', { params }),
  getEnvironmentalImpact: () => api.get('/api/correlation/environmental-impact'),
  getScatter: (variable: string, params?: any) =>
    api.get(`/api/correlation/scatter/${variable}`, { params }),
  getSpeciesList: () => api.get('/api/correlation/species-list'),
};

export const forecastAPI = {
  getAll: (params?: any) => api.get('/api/forecast', { params }),
  getSpeciesList: () => api.get('/api/forecast/species-list'),
  generate: (species: string, months: number) =>
    api.post('/api/forecast/generate', { species, months }),
};

export const chatbotAPI = {
  ask: (question: string) => api.post('/api/chatbot', { question }),
};

export const otolithAPI = {
  getDetectedSpecies: () => api.get('/api/otolith/detected-species'),
};

export const speciesLocationsAPI = {
  getAll: () => api.get('/api/species-locations'),
  search: (query: string) => api.get('/api/species-locations/search', { params: { q: query } }),
  getByName: (species: string) => api.get(`/api/species-locations/by-name/${species.replace(/ /g, '_')}`),
  getNearby: (lat: number, lng: number, radiusKm?: number) =>
    api.get(`/api/species-locations/nearby/${lat}/${lng}`, { params: { radius: radiusKm || 100 } }),
  getStats: () => api.get('/api/species-locations/stats'),
};

export default api;
