import { Router, Request, Response } from 'express';
import { getPostgresPool } from '../db/postgres.js';

const router = Router();

const speciesCatalog = [
  { species: 'Sardinella longiceps', common_name: 'Indian Oil Sardine', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Clupeiformes', family: 'Clupeidae', genus: 'Sardinella' },
  { species: 'Rastrelliger kanagurta', common_name: 'Indian Mackerel', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Rastrelliger' },
  { species: 'Thunnus albacares', common_name: 'Yellowfin Tuna', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Thunnus' },
  { species: 'Katsuwonus pelamis', common_name: 'Skipjack Tuna', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Katsuwonus' },
  { species: 'Scomberomorus guttatus', common_name: 'Narrow-barred Mackerel', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Scombriformes', family: 'Scombridae', genus: 'Scomberomorus' },
  { species: 'Lutjanus argentimaculatus', common_name: 'Mangrove Red Snapper', kingdom: 'Animalia', phylum: 'Chordata', class_name: 'Actinopterygii', order_name: 'Perciformes', family: 'Lutjanidae', genus: 'Lutjanus' },
];

const regionCenters = [
  { region: 'Arabian Sea', lat: 14.9, lng: 71.2 },
  { region: 'Bay of Bengal', lat: 15.8, lng: 87.1 },
  { region: 'Southern Indian Ocean', lat: 8.4, lng: 80.9 },
  { region: 'Andaman Sea', lat: 10.9, lng: 93.8 },
];

const now = new Date();

const mkDate = (daysAgo: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const oceanData = Array.from({ length: 80 }).map((_, i) => {
  const r = regionCenters[i % regionCenters.length];
  const station = `ST-${(i % 8) + 1}`;
  return {
    id: i + 1,
    station_id: station,
    station_name: `Station ${station}`,
    latitude: Number((r.lat + ((i % 5) - 2) * 0.28).toFixed(4)),
    longitude: Number((r.lng + ((i % 7) - 3) * 0.33).toFixed(4)),
    temperature: Number((26.4 + (i % 11) * 0.22 + (r.region === 'Bay of Bengal' ? 0.7 : 0)).toFixed(2)),
    salinity: Number((33.6 + (i % 9) * 0.15).toFixed(2)),
    ph: Number((8.0 + (i % 6) * 0.03).toFixed(2)),
    oxygen: Number((5.5 + (i % 8) * 0.17).toFixed(2)),
    wave_height: Number((1.2 + (i % 10) * 0.08).toFixed(2)),
    wind_speed: Number((6.1 + (i % 12) * 0.37).toFixed(2)),
    region: r.region,
    recorded_at: mkDate(i),
  };
});

const fisheriesData = Array.from({ length: 120 }).map((_, i) => {
  const r = regionCenters[i % regionCenters.length];
  const s = speciesCatalog[i % speciesCatalog.length];
  return {
    id: i + 1,
    species: s.species,
    common_name: s.common_name,
    latitude: Number((r.lat + ((i % 6) - 3) * 0.24).toFixed(4)),
    longitude: Number((r.lng + ((i % 6) - 3) * 0.28).toFixed(4)),
    abundance: 120 + (i % 15) * 26,
    biomass: Number((350 + (i % 14) * 42).toFixed(2)),
    region: r.region,
    recorded_at: mkDate(i * 2),
  };
});

const ednaData = Array.from({ length: 90 }).map((_, i) => {
  const r = regionCenters[i % regionCenters.length];
  const s = speciesCatalog[(i + 2) % speciesCatalog.length];
  return {
    id: i + 1,
    species: s.species,
    latitude: Number((r.lat + ((i % 5) - 2) * 0.21).toFixed(4)),
    longitude: Number((r.lng + ((i % 5) - 2) * 0.27).toFixed(4)),
    concentration: Number((0.6 + (i % 12) * 0.14).toFixed(3)),
    confidence: Number((0.68 + (i % 9) * 0.03).toFixed(2)),
    depth: 10 + (i % 7) * 18,
    source: 'Local dataset',
    recorded_at: mkDate(i * 3),
  };
});

const taxonomyData = speciesCatalog.map((item, i) => ({ id: i + 1, ...item }));

const alertsStore = Array.from({ length: 8 }).map((_, i) => ({
  id: `alert-${i + 1}`,
  severity: i % 3 === 0 ? 'critical' : 'warning',
  parameter: ['temperature', 'oxygen', 'abundance'][i % 3],
  region: regionCenters[i % regionCenters.length].region,
  message: `Threshold exceeded for ${['temperature', 'oxygen', 'abundance'][i % 3]}`,
  acknowledged: false,
  created_at: mkDate(i),
}));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toDay = (iso: string) => iso.split('T')[0];
const monthKey = (iso: string) => iso.slice(0, 7) + '-01T00:00:00.000Z';

const nearestRegion = (lat: number, lng: number) => {
  let best = regionCenters[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  regionCenters.forEach((region) => {
    const d = Math.hypot(region.lat - lat, region.lng - lng);
    if (d < bestDistance) {
      bestDistance = d;
      best = region;
    }
  });
  return best.region;
};

const fetchOtolithDetections = async (regionName: string) => {
  try {
    const pool = getPostgresPool();
    const sql = `
      SELECT
        r.species,
        COUNT(*)::int AS detections,
        t.family,
        t.genus,
        t.order_name,
        t.class
      FROM otolith_records r
      LEFT JOIN taxonomy t ON t.species = r.species
      WHERE r.location ILIKE $1 OR r.location IS NULL
      GROUP BY r.species, t.family, t.genus, t.order_name, t.class
      ORDER BY detections DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(sql, [`%${regionName}%`]);
    return rows;
  } catch {
    return [];
  }
};

const aggregateOceanTrends = () => {
  const byDay = new Map<string, { day: string; t: number[]; w: number[]; ws: number[] }>();
  oceanData.forEach((row) => {
    const day = toDay(row.recorded_at);
    const bucket = byDay.get(day) || { day, t: [], w: [], ws: [] };
    bucket.t.push(row.temperature);
    bucket.w.push(row.wave_height);
    bucket.ws.push(row.wind_speed);
    byDay.set(day, bucket);
  });

  return [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-30)
    .map((b) => ({
      day: b.day,
      avg_temperature: (b.t.reduce((x, y) => x + y, 0) / b.t.length).toFixed(2),
      avg_wave_height: (b.w.reduce((x, y) => x + y, 0) / b.w.length).toFixed(2),
      avg_wind_speed: (b.ws.reduce((x, y) => x + y, 0) / b.ws.length).toFixed(2),
    }));
};

const aggregateFisheriesTemporal = () => {
  const byMonthSpecies = new Map<string, { month: string; species: string; region: string; abundance: number; temp: number; salinity: number; ph: number; n: number }>();
  fisheriesData.forEach((f, i) => {
    const key = `${monthKey(f.recorded_at)}|${f.species}|${f.region}`;
    const current = byMonthSpecies.get(key) || {
      month: monthKey(f.recorded_at),
      species: f.species,
      region: f.region,
      abundance: 0,
      temp: 0,
      salinity: 0,
      ph: 0,
      n: 0,
    };
    const ocean = oceanData[i % oceanData.length];
    current.abundance += f.abundance;
    current.temp += ocean.temperature;
    current.salinity += ocean.salinity;
    current.ph += ocean.ph;
    current.n += 1;
    byMonthSpecies.set(key, current);
  });

  return [...byMonthSpecies.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((x) => ({
      month: x.month,
      species: x.species,
      region: x.region,
      total_abundance: x.abundance,
      avg_temp: (x.temp / x.n).toFixed(2),
      avg_salinity: (x.salinity / x.n).toFixed(2),
      avg_ph: (x.ph / x.n).toFixed(2),
    }));
};

const correlationMatrix = speciesCatalog.map((s, idx) => ({
  species: s.species,
  temp_correlation: (0.15 + idx * 0.08).toFixed(3),
  salinity_correlation: (idx % 2 === 0 ? -0.32 : 0.28).toFixed(3),
  ph_correlation: (0.07 + idx * 0.03).toFixed(3),
  oxygen_correlation: (-0.12 + idx * 0.04).toFixed(3),
}));

const correlationFlat = correlationMatrix.flatMap((row) => [
  { variable_x: 'temperature', variable_y: row.species, correlation_coefficient: row.temp_correlation },
  { variable_x: 'salinity', variable_y: row.species, correlation_coefficient: row.salinity_correlation },
  { variable_x: 'ph', variable_y: row.species, correlation_coefficient: row.ph_correlation },
  { variable_x: 'oxygen', variable_y: row.species, correlation_coefficient: row.oxygen_correlation },
]);

const normalize = (values: number[], invert = false) => {
  const max = Math.max(1, ...values);
  return values.map((v) => {
    const n = (v / max) * 100;
    const out = invert ? 100 - n : n;
    return clamp(out, 0, 100);
  });
};

const getBRI = () => {
  const regions = ['Arabian Sea', 'Bay of Bengal', 'Southern Indian Ocean'];

  const diversity = regions.map((r) => new Set(ednaData.filter((e) => e.latitude && e.longitude && regionCenters.find((c) => c.region === r) && e.species && Math.abs(e.latitude - (regionCenters.find((c) => c.region === r)?.lat || 0)) < 3).map((e) => e.species)).size || 1);

  const decline = regions.map((r) => {
    const items = fisheriesData.filter((f) => f.region === r).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const half = Math.max(1, Math.floor(items.length / 2));
    const older = items.slice(0, half).reduce((s, x) => s + x.abundance, 0) / half;
    const newer = items.slice(half).reduce((s, x) => s + x.abundance, 0) / Math.max(1, items.length - half);
    return older > 0 ? clamp(((older - newer) / older) * 100, 0, 100) : 0;
  });

  const temps = regions.map((r) => {
    const list = oceanData.filter((o) => o.region === r).map((o) => o.temperature);
    return list.reduce((s, x) => s + x, 0) / Math.max(1, list.length);
  });
  const globalTemp = temps.reduce((s, x) => s + x, 0) / Math.max(1, temps.length);
  const tempAnomaly = temps.map((t) => Math.abs(t - globalTemp));

  const pressure = regions.map((r) => {
    const items = fisheriesData.filter((f) => f.region === r);
    const abundance = items.reduce((s, x) => s + x.abundance, 0);
    const biomass = items.reduce((s, x) => s + x.biomass, 0);
    return abundance + biomass * 0.2;
  });

  const diversityRisk = normalize(diversity, true);
  const declineRisk = normalize(decline);
  const tempRisk = normalize(tempAnomaly);
  const pressureRisk = normalize(pressure);

  return regions.map((region, i) => {
    const score = Math.round(
      diversityRisk[i] * 0.3 + declineRisk[i] * 0.25 + tempRisk[i] * 0.25 + pressureRisk[i] * 0.2,
    );
    const category = score >= 70 ? 'Critical' : score >= 40 ? 'Warning' : 'Stable';
    return {
      region,
      score,
      category,
      components: {
        ednaDiversityRisk: Number(diversityRisk[i].toFixed(1)),
        speciesDeclineRisk: Number(declineRisk[i].toFixed(1)),
        temperatureAnomalyRisk: Number(tempRisk[i].toFixed(1)),
        fishingPressureRisk: Number(pressureRisk[i].toFixed(1)),
      },
      raw: {
        ednaDiversity: diversity[i],
        speciesDeclineRate: Number(decline[i].toFixed(2)),
        temperatureAnomaly: Number(tempAnomaly[i].toFixed(3)),
        regionAvgTemp: Number(temps[i].toFixed(2)),
        fishingPressureRaw: Number(pressure[i].toFixed(2)),
      },
    };
  });
};

// Ocean
router.get('/ocean', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 100);
  res.json({ success: true, data: oceanData.slice(0, limit), count: Math.min(limit, oceanData.length) });
});

router.get('/ocean/kpis', (req: Request, res: Response) => {
  const avgTemperature = oceanData.reduce((s, x) => s + x.temperature, 0) / oceanData.length;
  const avgWave = oceanData.reduce((s, x) => s + x.wave_height, 0) / oceanData.length;
  const avgWind = oceanData.reduce((s, x) => s + x.wind_speed, 0) / oceanData.length;
  const stationCount = new Set(oceanData.map((x) => x.station_id)).size;
  res.json({
    success: true,
    data: {
      avg_temperature: Number(avgTemperature.toFixed(2)),
      avg_wave_height: Number(avgWave.toFixed(2)),
      avg_wind_speed: Number(avgWind.toFixed(2)),
      station_count: stationCount,
      total_records: oceanData.length,
      data_coverage: {
        temperature_records: oceanData.length,
        wave_height_records: oceanData.length,
        wind_speed_records: oceanData.length,
      },
    },
  });
});

router.get('/ocean/trends', (req: Request, res: Response) => {
  res.json({ success: true, data: aggregateOceanTrends() });
});

router.get('/ocean/geospatial', (req: Request, res: Response) => {
  res.json({ success: true, data: oceanData });
});

// Fisheries
router.get('/fisheries', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 100);
  res.json({ success: true, data: fisheriesData.slice(0, limit), count: Math.min(limit, fisheriesData.length) });
});

router.get('/fisheries/metrics', (req: Request, res: Response) => {
  const speciesCount = new Set(fisheriesData.map((x) => x.species)).size;
  const totalAbundance = fisheriesData.reduce((s, x) => s + x.abundance, 0);
  const totalBiomass = fisheriesData.reduce((s, x) => s + x.biomass, 0);
  const avgBiomass = totalBiomass / fisheriesData.length;
  res.json({
    success: true,
    data: {
      species_count: speciesCount,
      total_abundance: totalAbundance,
      total_biomass: Number(totalBiomass.toFixed(2)),
      avg_biomass: Number(avgBiomass.toFixed(2)),
      average_biomass: Number(avgBiomass.toFixed(2)),
      trend_indicator: 7.8,
    },
  });
});

router.get('/fisheries/species-distribution', (req: Request, res: Response) => {
  const grouped = new Map<string, { species: string; common_name: string; total_abundance: number; total_biomass: number; count: number }>();
  fisheriesData.forEach((row) => {
    const key = row.species;
    const current = grouped.get(key) || {
      species: row.species,
      common_name: row.common_name,
      total_abundance: 0,
      total_biomass: 0,
      count: 0,
    };
    current.total_abundance += row.abundance;
    current.total_biomass += row.biomass;
    current.count += 1;
    grouped.set(key, current);
  });

  const data = [...grouped.values()]
    .sort((a, b) => b.total_abundance - a.total_abundance)
    .map((x) => ({ ...x, record_count: x.count }));

  res.json({ success: true, data });
});

router.get('/fisheries/temporal', (req: Request, res: Response) => {
  res.json({ success: true, data: aggregateFisheriesTemporal() });
});

router.get('/fisheries/geospatial', (req: Request, res: Response) => {
  res.json({ success: true, data: fisheriesData });
});

router.get('/fisheries/highest-population-area', (req: Request, res: Response) => {
  const rawSpecies = String(req.query.species || '').trim().toLowerCase();

  if (!rawSpecies) {
    return res.status(400).json({ success: false, error: 'species query is required' });
  }

  const matched = fisheriesData.filter((row) => {
    const species = String(row.species || '').toLowerCase();
    const common = String(row.common_name || '').toLowerCase();
    return species.includes(rawSpecies) || common.includes(rawSpecies);
  });

  if (!matched.length) {
    return res.json({ success: true, data: null, areas: [] });
  }

  const grouped = new Map<string, {
    region: string;
    latitudeTotal: number;
    longitudeTotal: number;
    totalAbundance: number;
    observations: number;
    speciesSet: Set<string>;
  }>();

  matched.forEach((row) => {
    const key = row.region || 'Unknown';
    const current = grouped.get(key) || {
      region: key,
      latitudeTotal: 0,
      longitudeTotal: 0,
      totalAbundance: 0,
      observations: 0,
      speciesSet: new Set<string>(),
    };

    current.latitudeTotal += Number(row.latitude || 0);
    current.longitudeTotal += Number(row.longitude || 0);
    current.totalAbundance += Number(row.abundance || 0);
    current.observations += 1;
    if (row.species) current.speciesSet.add(String(row.species));
    grouped.set(key, current);
  });

  const areas = [...grouped.values()]
    .map((item) => ({
      region: item.region,
      center_latitude: Number((item.latitudeTotal / Math.max(1, item.observations)).toFixed(4)),
      center_longitude: Number((item.longitudeTotal / Math.max(1, item.observations)).toFixed(4)),
      total_abundance: item.totalAbundance,
      observations: item.observations,
      matched_species: [...item.speciesSet],
    }))
    .sort((a, b) => b.total_abundance - a.total_abundance);

  return res.json({
    success: true,
    data: areas[0],
    areas,
  });
});

// eDNA
router.get('/edna', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 100);
  res.json({ success: true, data: ednaData.slice(0, limit), count: Math.min(limit, ednaData.length) });
});

router.get('/edna/concentration-trends', (req: Request, res: Response) => {
  const grouped = new Map<string, { species: string; avg_concentration: number; n: number }>();
  ednaData.forEach((row) => {
    const curr = grouped.get(row.species) || { species: row.species, avg_concentration: 0, n: 0 };
    curr.avg_concentration += row.concentration;
    curr.n += 1;
    grouped.set(row.species, curr);
  });
  const data = [...grouped.values()].map((x) => ({
    species: x.species,
    avg_concentration: (x.avg_concentration / x.n).toFixed(3),
    sample_count: x.n,
  }));
  res.json({ success: true, data });
});

router.get('/edna/depth-analysis', (req: Request, res: Response) => {
  const data = ednaData.map((row) => ({ species: row.species, depth: row.depth, avg_concentration: row.concentration }));
  res.json({ success: true, data });
});

router.get('/edna/seasonal', (req: Request, res: Response) => {
  const getSeason = (d: string) => {
    const m = new Date(d).getMonth() + 1;
    if ([3, 4, 5].includes(m)) return 'Spring';
    if ([6, 7, 8].includes(m)) return 'Summer';
    if ([9, 10, 11].includes(m)) return 'Fall';
    return 'Winter';
  };

  const grouped = new Map<string, { season: string; species: string; value: number; n: number }>();
  ednaData.forEach((row) => {
    const season = getSeason(row.recorded_at);
    const key = `${season}|${row.species}`;
    const curr = grouped.get(key) || { season, species: row.species, value: 0, n: 0 };
    curr.value += row.concentration;
    curr.n += 1;
    grouped.set(key, curr);
  });

  const data = [...grouped.values()].map((x) => ({
    season: x.season,
    species: x.species,
    avg_concentration: (x.value / x.n).toFixed(3),
    sample_count: x.n,
  }));

  res.json({ success: true, data });
});

router.get('/edna/confidence-distribution', (req: Request, res: Response) => {
  const bins = [
    { confidence_range: 'High (>=0.90)', test: (v: number) => v >= 0.9 },
    { confidence_range: 'Medium (0.80-0.89)', test: (v: number) => v >= 0.8 && v < 0.9 },
    { confidence_range: 'Low (0.70-0.79)', test: (v: number) => v >= 0.7 && v < 0.8 },
    { confidence_range: 'Very Low (<0.70)', test: (v: number) => v < 0.7 },
  ];

  const data = bins.map((bin) => ({
    confidence_range: bin.confidence_range,
    count: ednaData.filter((x) => bin.test(x.confidence)).length,
  }));

  res.json({ success: true, data });
});

router.get('/edna/species-list', (req: Request, res: Response) => {
  res.json({ success: true, data: [...new Set(ednaData.map((x) => x.species))] });
});

router.get('/edna/stats', (req: Request, res: Response) => {
  const totalSamples = ednaData.length;
  const avgConcentration = ednaData.reduce((s, x) => s + x.concentration, 0) / totalSamples;
  const avgConfidencePct = (ednaData.reduce((s, x) => s + x.confidence, 0) / totalSamples) * 100;
  const speciesDetected = new Set(ednaData.map((x) => x.species)).size;
  res.json({
    success: true,
    data: {
      totalSamples,
      avgConcentration,
      avgConfidencePct: Number(avgConfidencePct.toFixed(1)),
      speciesDetected,
    },
  });
});

// Taxonomy
router.get('/taxonomy', (req: Request, res: Response) => {
  res.json({ success: true, data: taxonomyData });
});

router.get('/taxonomy/tree', (req: Request, res: Response) => {
  const tree: any = {};
  taxonomyData.forEach((item) => {
    tree[item.kingdom] = tree[item.kingdom] || {};
    tree[item.kingdom][item.phylum] = tree[item.kingdom][item.phylum] || {};
    tree[item.kingdom][item.phylum][item.class_name] = tree[item.kingdom][item.phylum][item.class_name] || {};
    tree[item.kingdom][item.phylum][item.class_name][item.order_name] = tree[item.kingdom][item.phylum][item.class_name][item.order_name] || {};
    tree[item.kingdom][item.phylum][item.class_name][item.order_name][item.family] = tree[item.kingdom][item.phylum][item.class_name][item.order_name][item.family] || [];
    tree[item.kingdom][item.phylum][item.class_name][item.order_name][item.family].push({
      species: item.species,
      common_name: item.common_name,
      genus: item.genus,
    });
  });

  res.json({ success: true, data: tree });
});

router.get('/taxonomy/species/:species', (req: Request, res: Response) => {
  const match = taxonomyData.find((x) => x.species.toLowerCase() === String(req.params.species).toLowerCase());
  res.json({ success: true, data: match || null });
});

router.get('/taxonomy/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const data = taxonomyData.filter((x) => x.species.toLowerCase().includes(q) || x.common_name.toLowerCase().includes(q));
  res.json({ success: true, data });
});

router.get('/taxonomy/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      kingdoms: new Set(taxonomyData.map((x) => x.kingdom)).size,
      phylums: new Set(taxonomyData.map((x) => x.phylum)).size,
      classes: new Set(taxonomyData.map((x) => x.class_name)).size,
      orders: new Set(taxonomyData.map((x) => x.order_name)).size,
      families: new Set(taxonomyData.map((x) => x.family)).size,
      genera: new Set(taxonomyData.map((x) => x.genus)).size,
      species: taxonomyData.length,
    },
  });
});

// Correlation
router.get('/correlation', (req: Request, res: Response) => {
  res.json({ success: true, data: correlationFlat });
});

router.get('/correlation/environmental-impact', (req: Request, res: Response) => {
  res.json({ success: true, data: correlationMatrix });
});

router.get('/correlation/scatter/:variable', (req: Request, res: Response) => {
  const variable = String(req.params.variable || 'temperature');
  const data = fisheriesData.slice(0, 100).map((f, idx) => {
    const o = oceanData[idx % oceanData.length];
    return {
      species: f.species,
      temperature: o.temperature,
      salinity: o.salinity,
      ph: o.ph,
      oxygen: o.oxygen,
      abundance: f.abundance,
      x: variable === 'temperature' ? o.temperature : variable === 'salinity' ? o.salinity : variable === 'ph' ? o.ph : o.oxygen,
      y: f.abundance,
    };
  });
  res.json({ success: true, data });
});

router.get('/correlation/species-list', (req: Request, res: Response) => {
  res.json({ success: true, data: speciesCatalog.map((x) => x.species) });
});

// Forecast
router.get('/forecast', (req: Request, res: Response) => {
  const data = speciesCatalog.map((s, i) => ({
    species: s.species,
    month: monthKey(mkDate(i * 15)),
    predicted_abundance: 500 + i * 90,
    confidence: Number((0.75 + i * 0.03).toFixed(2)),
  }));
  res.json({ success: true, data });
});

router.get('/forecast/species-list', (req: Request, res: Response) => {
  res.json({ success: true, data: speciesCatalog.map((x) => x.species) });
});

router.post('/forecast/generate', (req: Request, res: Response) => {
  const species = String(req.body.species || speciesCatalog[0].species);
  const months = Number(req.body.months || 6);
  const data = Array.from({ length: months }).map((_, i) => ({
    month: monthKey(mkDate(-i * 30)),
    predicted_abundance: Math.round(650 + Math.sin(i / 1.8) * 120 + i * 10),
    confidence: Number((0.78 - i * 0.01).toFixed(2)),
  }));
  res.json({ success: true, data: { species, horizonMonths: months, forecast: data.reverse() } });
});

// Geospatial
router.get('/geo/stations', (req: Request, res: Response) => {
  const grouped = new Map<string, any>();
  oceanData.forEach((row) => {
    if (!grouped.has(row.station_id)) {
      grouped.set(row.station_id, {
        station_id: row.station_id,
        lat: row.latitude,
        lng: row.longitude,
        data_points: 0,
      });
    }
    grouped.get(row.station_id).data_points += 1;
  });
  res.json({ success: true, data: [...grouped.values()] });
});

router.get('/geo/clusters', (req: Request, res: Response) => {
  const zoom = Number(req.query.zoom || 6);
  const type = String(req.query.type || 'all');
  const gridSize = Math.max(0.05, 1.2 / Math.pow(2, Math.max(0, zoom - 4)));

  const combined = [
    ...oceanData.map((x) => ({ lat: x.latitude, lng: x.longitude, type: 'ocean', value: x.temperature })),
    ...fisheriesData.map((x) => ({ lat: x.latitude, lng: x.longitude, type: 'fisheries', value: x.abundance })),
    ...ednaData.map((x) => ({ lat: x.latitude, lng: x.longitude, type: 'edna', value: x.concentration })),
  ].filter((x) => type === 'all' || x.type === type);

  const bins = new Map<string, { lat: number[]; lng: number[]; type: string; count: number; value: number }>();
  combined.forEach((row) => {
    const i = Math.floor(row.lat / gridSize);
    const j = Math.floor(row.lng / gridSize);
    const key = `${row.type}|${i}|${j}`;
    const curr = bins.get(key) || { lat: [], lng: [], type: row.type, count: 0, value: 0 };
    curr.lat.push(row.lat);
    curr.lng.push(row.lng);
    curr.count += 1;
    curr.value += Number(row.value || 0);
    bins.set(key, curr);
  });

  const data = [...bins.values()].map((b) => ({
    lat: Number((b.lat.reduce((s, x) => s + x, 0) / b.lat.length).toFixed(4)),
    lng: Number((b.lng.reduce((s, x) => s + x, 0) / b.lng.length).toFixed(4)),
    count: b.count,
    type: b.type,
    data: Number((b.value / Math.max(1, b.count)).toFixed(2)),
  }));

  res.json({ success: true, data, count: data.length, zoomLevel: zoom, gridSize });
});

router.get('/geo/point/:lat/:lng', async (req: Request, res: Response) => {
  const lat = Number(req.params.lat);
  const lng = Number(req.params.lng);
  const radiusKm = Number(req.query.radius || 25);
  const radiusDeg = radiusKm / 111;
  const region = nearestRegion(lat, lng);

  const near = <T extends { latitude: number; longitude: number }>(arr: T[]) =>
    arr.filter((x) => Math.abs(x.latitude - lat) <= radiusDeg && Math.abs(x.longitude - lng) <= radiusDeg);

  const oceanNear = near(oceanData);
  const fishNear = near(fisheriesData);
  const ednaNear = near(ednaData);

  const speciesSummaryMap = new Map<string, {
    species: string;
    sources: string[];
    totalAbundance: number;
    avgConcentration: number;
    n: number;
    detections: number;
    taxonomy?: { family?: string | null; genus?: string | null; order?: string | null; class?: string | null };
  }>();
  fishNear.forEach((f) => {
    const curr = speciesSummaryMap.get(f.species) || { species: f.species, sources: [], totalAbundance: 0, avgConcentration: 0, n: 0, detections: 0 };
    if (!curr.sources.includes('fisheries')) curr.sources.push('fisheries');
    curr.totalAbundance += f.abundance;
    curr.detections += 1;
    speciesSummaryMap.set(f.species, curr);
  });
  ednaNear.forEach((e) => {
    const curr = speciesSummaryMap.get(e.species) || { species: e.species, sources: [], totalAbundance: 0, avgConcentration: 0, n: 0, detections: 0 };
    if (!curr.sources.includes('edna')) curr.sources.push('edna');
    curr.avgConcentration += e.concentration;
    curr.n += 1;
    curr.detections += 1;
    speciesSummaryMap.set(e.species, curr);
  });

  const otolithDetections = await fetchOtolithDetections(region);
  otolithDetections.forEach((row: any) => {
    const species = String(row.species || '');
    if (!species) return;

    const curr = speciesSummaryMap.get(species) || {
      species,
      sources: [],
      totalAbundance: 0,
      avgConcentration: 0,
      n: 0,
      detections: 0,
    };

    if (!curr.sources.includes('otolith')) curr.sources.push('otolith');
    curr.detections += Number(row.detections || 0);
    curr.taxonomy = {
      family: row.family,
      genus: row.genus,
      order: row.order_name,
      class: row.class,
    };
    speciesSummaryMap.set(species, curr);
  });

  const speciesSummary = [...speciesSummaryMap.values()].map((x) => ({
    species: x.species,
    sources: x.sources,
    totalAbundance: x.totalAbundance,
    avgConcentration: x.n ? Number((x.avgConcentration / x.n).toFixed(3)) : 0,
    detections: x.detections,
    taxonomy: x.taxonomy,
  }));

  const avg = (vals: number[]) => vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;

  res.json({
    success: true,
    location: { latitude: lat, longitude: lng, radiusKm },
    stats: {
      ocean: {
        count: oceanNear.length,
        avgTemp: avg(oceanNear.map((x) => x.temperature)),
        avgSalinity: avg(oceanNear.map((x) => x.salinity)),
        avgOxygen: avg(oceanNear.map((x) => x.oxygen)),
      },
      fisheries: {
        count: fishNear.length,
        uniqueSpecies: new Set(fishNear.map((x) => x.species)).size,
        totalAbundance: fishNear.reduce((s, x) => s + x.abundance, 0),
        totalBiomass: Number(fishNear.reduce((s, x) => s + x.biomass, 0).toFixed(2)),
      },
      edna: {
        count: ednaNear.length,
        detectedSpecies: new Set(ednaNear.map((x) => x.species)).size,
        avgConcentration: avg(ednaNear.map((x) => x.concentration)),
      },
      otolith: {
        count: otolithDetections.reduce((sum: number, x: any) => sum + Number(x.detections || 0), 0),
        detectedSpecies: otolithDetections.length,
      },
    },
    speciesSummary,
    recentData: {
      ocean: oceanNear.slice(0, 8),
      fisheries: fishNear.slice(0, 8),
      edna: ednaNear.slice(0, 8),
      otolith: otolithDetections,
    },
  });
});

router.get('/geo/heatmap/:parameter', (req: Request, res: Response) => {
  const parameter = String(req.params.parameter || 'temperature');
  let source: Array<{ lat: number; lng: number; value: number }> = [];

  if (parameter === 'abundance' || parameter === 'biomass') {
    source = fisheriesData.map((f) => ({ lat: f.latitude, lng: f.longitude, value: parameter === 'abundance' ? f.abundance : f.biomass }));
  } else if (parameter === 'edna_concentration') {
    source = ednaData.map((e) => ({ lat: e.latitude, lng: e.longitude, value: e.concentration }));
  } else {
    source = oceanData.map((o) => ({ lat: o.latitude, lng: o.longitude, value: o.temperature }));
  }

  const max = Math.max(1, ...source.map((x) => x.value));
  res.json({
    success: true,
    parameter,
    data: source.map((x) => ({ lat: x.lat, lng: x.lng, value: x.value, intensity: x.value / max })),
  });
});

router.get('/geo/regions', (req: Request, res: Response) => {
  const data = regionCenters.map((r) => {
    const ocean = oceanData.filter((o) => o.region === r.region);
    const fish = fisheriesData.filter((f) => f.region === r.region);
    return {
      name: r.region,
      center: { lat: r.lat, lng: r.lng },
      stats: {
        avgTemp: Number((ocean.reduce((s, x) => s + x.temperature, 0) / Math.max(1, ocean.length)).toFixed(2)),
        avgSalinity: Number((ocean.reduce((s, x) => s + x.salinity, 0) / Math.max(1, ocean.length)).toFixed(2)),
        avgOxygen: Number((ocean.reduce((s, x) => s + x.oxygen, 0) / Math.max(1, ocean.length)).toFixed(2)),
        observationCount: ocean.length + fish.length,
        speciesCount: new Set(fish.map((x) => x.species)).size,
        totalAbundance: fish.reduce((s, x) => s + x.abundance, 0),
      },
    };
  });

  res.json({ success: true, data });
});

router.get('/geo/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const speciesMatches = speciesCatalog
    .filter((s) => s.species.toLowerCase().includes(q) || s.common_name.toLowerCase().includes(q))
    .map((s, idx) => ({
      name: s.species,
      type: 'species',
      region: regionCenters[idx % regionCenters.length].region,
      lat: regionCenters[idx % regionCenters.length].lat,
      lng: regionCenters[idx % regionCenters.length].lng,
    }));
  res.json({ success: true, results: speciesMatches.slice(0, 20) });
});

// Insights
router.get('/insights/generate', (req: Request, res: Response) => {
  res.json({
    success: true,
    insights: [
      {
        insight: 'Bay of Bengal shows elevated temperature and moderate fishing pressure.',
        type: 'trend',
        confidence: 89,
        relatedFactors: ['temperature', 'abundance'],
        recommendation: 'Increase adaptive monitoring frequency in warm months.',
      },
      {
        insight: 'Arabian Sea oxygen trend remains stable with lower biodiversity stress.',
        type: 'correlation',
        confidence: 86,
        relatedFactors: ['oxygen', 'biodiversity'],
      },
      {
        insight: 'Southern Indian Ocean indicates higher biodiversity risk index compared with other regions.',
        type: 'anomaly',
        confidence: 84,
        relatedFactors: ['risk-index', 'species-decline'],
      },
    ],
  });
});

router.get('/insights/unified', (req: Request, res: Response) => {
  res.json({ success: true, data: { ocean: oceanData.slice(0, 30), fisheries: fisheriesData.slice(0, 30), edna: ednaData.slice(0, 30) }, count: 90 });
});

router.get('/insights/location/:lat/:lng', (req: Request, res: Response) => {
  const { lat, lng } = req.params;
  res.json({ success: true, location: { lat: Number(lat), lng: Number(lng) }, data: { ocean: oceanData.slice(0, 5), fisheries: fisheriesData.slice(0, 5), edna: ednaData.slice(0, 5), topSpecies: speciesCatalog.slice(0, 5).map((x) => x.species) } });
});

router.get('/insights/regions', (req: Request, res: Response) => {
  res.json({ success: true, data: regionCenters });
});

// Biodiversity
router.get('/biodiversity/sequences', (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 100);
  const offset = Number(req.query.offset || 0);
  const data = ednaData.slice(offset, offset + limit).map((e) => ({
    id: e.id,
    sequenceIdentifier: `SEQ-${String(e.id).padStart(4, '0')}`,
    gene: e.depth < 30 ? '16S' : e.depth < 100 ? 'COX1' : 'ITS',
    taxonomic_identification: e.species,
    sequenceLength: Math.round(600 + e.confidence * 900),
    gc_content: Number((40 + e.confidence * 20).toFixed(2)),
    blast_identity_percent: Number((88 + e.confidence * 12).toFixed(2)),
    blast_evalue: e.confidence > 0.9 ? 0 : Number((1e-20).toExponential(2)),
    latitude: e.latitude,
    longitude: e.longitude,
    recorded_at: e.recorded_at,
    concentration: e.concentration,
    confidence: e.confidence,
    depth: e.depth,
    source: e.source,
  }));
  res.json({ success: true, data, total: ednaData.length, limit, offset });
});

router.get('/biodiversity/anomalies', (req: Request, res: Response) => {
  const data = ednaData
    .filter((e) => e.concentration > 1.5 || e.confidence < 0.72)
    .slice(0, 40)
    .map((e) => ({
      id: String(e.id),
      parameter: e.concentration > 1.5 ? 'concentration' : 'confidence',
      measured_value: e.concentration > 1.5 ? e.concentration : e.confidence,
      z_score: e.concentration > 1.5 ? 2.8 : 2.4,
      alert_level: e.concentration > 1.5 ? 'critical' : 'warning',
      detected_at: e.recorded_at,
      latitude: e.latitude,
      longitude: e.longitude,
      region: 'India Marine Zone',
      acknowledged: false,
    }));
  res.json({ success: true, data, count: data.length });
});

router.post('/biodiversity/anomalies/:id/acknowledge', (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, acknowledgedAt: new Date().toISOString(), acknowledgedBy: req.body.acknowledgedBy || 'user' });
});

router.get('/biodiversity/richness', (req: Request, res: Response) => {
  const data = regionCenters.map((r) => {
    const edna = ednaData.filter((e) => Math.abs(e.latitude - r.lat) < 3 && Math.abs(e.longitude - r.lng) < 3);
    const fish = fisheriesData.filter((f) => f.region === r.region);
    return {
      region: r.region,
      unique_species: new Set([...edna.map((e) => e.species), ...fish.map((f) => f.species)]).size,
      total_occurrences: edna.length + fish.length,
      endemic_species: Math.max(1, Math.floor(edna.length / 10)),
      edna_detected: edna.length,
      fisheries_recorded: fish.length,
    };
  });
  res.json({ success: true, data });
});

router.get('/biodiversity/comparison', (req: Request, res: Response) => {
  const data = speciesCatalog.map((s, idx) => ({
    parameter: s.species,
    edna_detections: ednaData.filter((e) => e.species === s.species).length,
    otolith_records: fisheriesData.filter((f) => f.species === s.species).length,
    agreement: 82 + (idx % 4) * 4,
  }));
  res.json({ success: true, data });
});

router.get('/biodiversity/kpis', (req: Request, res: Response) => {
  const totalSpecies = new Set([...ednaData.map((e) => e.species), ...fisheriesData.map((f) => f.species)]).size;
  const highQuality = ednaData.filter((e) => e.confidence >= 0.9).length;
  const anomalies = ednaData.filter((e) => e.concentration > 1.5 || e.confidence < 0.72).length;

  res.json({
    success: true,
    data: {
      sequences: {
        total: ednaData.length,
        highQuality,
        uniqueGenes: 3,
      },
      anomalies: {
        total: anomalies,
        critical: ednaData.filter((e) => e.concentration > 1.5).length,
        unacknowledged: anomalies,
      },
      biodiversity: {
        totalSpecies,
        regions: 3,
      },
    },
  });
});

router.get('/biodiversity/genes', (req: Request, res: Response) => {
  const data = taxonomyData.map((t) => ({
    species: t.species,
    kingdom: t.kingdom,
    phylum: t.phylum,
    class_name: t.class_name,
    order_name: t.order_name,
    family: t.family,
    genus: t.genus,
    edna_detections: ednaData.filter((e) => e.species === t.species).length,
    fisheries_records: fisheriesData.filter((f) => f.species === t.species).length,
  }));
  res.json({ success: true, data });
});

router.get('/biodiversity/export/darwin-core', (req: Request, res: Response) => {
  const data = ednaData.slice(0, 200).map((e) => ({
    occurrenceID: e.id,
    scientificName: e.species,
    decimalLatitude: e.latitude,
    decimalLongitude: e.longitude,
    eventDate: e.recorded_at,
    basisOfRecord: 'eDNA',
  }));

  const metaXml = `<?xml version="1.0" encoding="UTF-8"?><archive xmlns="http://rs.tdwg.org/dwca/text/"><core encoding="UTF-8"><files><location>occurrence.txt</location></files><id index="0" /></core></archive>`;
  res.json({ success: true, format: 'darwin_core', recordCount: data.length, metaXml, data });
});

router.get('/biodiversity/risk-index', (req: Request, res: Response) => {
  const data = getBRI();
  res.json({
    success: true,
    data,
    scale: '0-100',
    categories: { stable: '<40', warning: '40-69', critical: '>=70' },
    weights: { ednaDiversity: 0.3, speciesDeclineRate: 0.25, temperatureAnomaly: 0.25, fishingPressure: 0.2 },
    generatedAt: new Date().toISOString(),
  });
});

// Alerts
router.get('/alerts/active', (req: Request, res: Response) => {
  const severity = String(req.query.severity || 'all');
  const data = alertsStore.filter((a) => severity === 'all' || a.severity === severity);
  res.json({ success: true, data, count: data.length });
});

router.get('/alerts/summary', (req: Request, res: Response) => {
  const critical = alertsStore.filter((a) => a.severity === 'critical').length;
  const warning = alertsStore.filter((a) => a.severity === 'warning').length;
  res.json({ success: true, data: { total: alertsStore.length, critical, warning, acknowledged: 0, unacknowledged: alertsStore.length } });
});

router.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, acknowledged: true, acknowledgedBy: req.body.acknowledgedBy || 'user' });
});

export default router;
