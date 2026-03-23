import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { query } from '../db/connection.js';
import { BatchInsert } from '../data/utils/batchInsert.js';
import { ImportLogger } from '../data/utils/logger.js';

const router = Router();

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

interface ParsedRecord {
  [key: string]: any;
}

// Helper function to detect data type based on column name
function detectDataType(columnName: string, value: any): string {
  const lowerName = columnName.toLowerCase();

  if (lowerName.includes('temp') || lowerName.includes('temperature')) return 'ocean_data';
  if (lowerName.includes('salinity') || lowerName.includes('ph') || lowerName.includes('oxygen')) return 'ocean_data';
  if (lowerName.includes('abundance') || lowerName.includes('biomass') || lowerName.includes('species')) return 'fisheries_data';
  if (lowerName.includes('edna') || lowerName.includes('dna') || lowerName.includes('concentration')) return 'edna_data';

  return 'unknown';
}

// Parse CSV file
function parseCSV(fileBuffer: Buffer): ParsedRecord[] {
  const content = fileBuffer.toString('utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

// Parse Excel file
function parseExcel(fileBuffer: Buffer): ParsedRecord[] {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(worksheet);
  return records as ParsedRecord[];
}

// Normalize column names to snake_case
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// Analyze and categorize records
async function analyzeRecords(
  records: ParsedRecord[]
): Promise<{
  oceanRecords: any[];
  fisheriesRecords: any[];
  ednaRecords: any[];
  summary: any;
}> {
  const oceanRecords: any[] = [];
  const fisheriesRecords: any[] = [];
  const ednaRecords: any[] = [];
  const columnTypes = new Set<string>();

  // Normalize headers and analyze each record
  const normalizedRecords = records.map((record: any) => {
    const normalized: any = {};
    Object.keys(record).forEach((key) => {
      const normalizedKey = normalizeColumnName(key);
      normalized[normalizedKey] = record[key];
    });
    return normalized;
  });

  // Categorize records based on columns
  normalizedRecords.forEach((record: any) => {
    const recordColumns = Object.keys(record);

    // Check for ocean data indicators
    if (
      recordColumns.some((col) =>
        ['temperature', 'temp', 'salinity', 'ph', 'oxygen', 'depth', 'latitude', 'longitude'].includes(col)
      )
    ) {
      oceanRecords.push({
        location: record.location || record.station || 'Station',
        latitude: parseFloat(record.latitude) || 0,
        longitude: parseFloat(record.longitude) || 0,
        temperature: parseFloat(record.temperature) || parseFloat(record.temp) || 0,
        salinity: parseFloat(record.salinity) || null,
        ph: parseFloat(record.ph) || null,
        oxygen: parseFloat(record.oxygen) || null,
        depth: parseFloat(record.depth) || null,
        recorded_at: record.recorded_at || record.date || new Date().toISOString(),
        region: record.region || record.zone || 'Unknown',
      });
      columnTypes.add('ocean');
    }

    // Check for fisheries data indicators
    if (
      recordColumns.some((col) =>
        ['abundance', 'biomass', 'species', 'common_name', 'diversity'].includes(col)
      )
    ) {
      fisheriesRecords.push({
        species: record.species || 'Unknown',
        common_name: record.common_name || record.species || 'Unknown',
        abundance: parseInt(record.abundance) || 0,
        biomass: parseFloat(record.biomass) || 0,
        location: record.location || record.zone || 'Zone',
        latitude: parseFloat(record.latitude) || 0,
        longitude: parseFloat(record.longitude) || 0,
        region: record.region || record.zone || 'Unknown',
        recorded_at: record.recorded_at || record.date || new Date().toISOString(),
        diversity_index: parseFloat(record.diversity) || parseFloat(record.diversity_index) || null,
      });
      columnTypes.add('fisheries');
    }

    // Check for eDNA data indicators
    if (
      recordColumns.some((col) =>
        ['edna', 'dna', 'concentration', 'confidence', 'depth'].includes(col)
      )
    ) {
      ednaRecords.push({
        species: record.species || 'Unknown',
        concentration: parseFloat(record.concentration) || parseFloat(record.avg_concentration) || 0,
        depth: parseFloat(record.depth) || 0,
        location: record.location || record.site || 'Site',
        latitude: parseFloat(record.latitude) || 0,
        longitude: parseFloat(record.longitude) || 0,
        confidence: parseFloat(record.confidence) || 95,
        season: record.season || 'Unknown',
        recorded_at: record.recorded_at || record.date || new Date().toISOString(),
        region: record.region || record.zone || 'Unknown',
      });
      columnTypes.add('edna');
    }
  });

  return {
    oceanRecords: oceanRecords.slice(0, 1000), // Limit to 1000 records
    fisheriesRecords: fisheriesRecords.slice(0, 1000),
    ednaRecords: ednaRecords.slice(0, 1000),
    summary: {
      totalRecords: records.length,
      oceanCount: oceanRecords.length,
      fisheriesCount: fisheriesRecords.length,
      ednaCount: ednaRecords.length,
      detectedTypes: Array.from(columnTypes),
    },
  };
}

// Insert ocean data with Darwin Core standardization
async function insertOceanData(records: any[]): Promise<{ legacy: number; darwinCore: number }> {
  if (records.length === 0) return { legacy: 0, darwinCore: 0 };
  const logger = new ImportLogger('upload');
  return await BatchInsert.insertOceanDataWithDarwinCore(records, logger, false, 'file-upload');
}

// Insert fisheries data with Darwin Core standardization
async function insertFisheriesData(records: any[]): Promise<{ legacy: number; darwinCore: number }> {
  if (records.length === 0) return { legacy: 0, darwinCore: 0 };
  const logger = new ImportLogger('upload');
  return await BatchInsert.insertFisheriesDataWithDarwinCore(records, logger, false, 'file-upload');
}

// Insert eDNA data with Darwin Core standardization
async function insertEdnaData(records: any[]): Promise<{ legacy: number; darwinCore: number }> {
  if (records.length === 0) return { legacy: 0, darwinCore: 0 };
  const logger = new ImportLogger('upload');
  return await BatchInsert.insertEdnaDataWithDarwinCore(records, logger, false, 'file-upload');
}

// Upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Parse file based on type
    let records: ParsedRecord[] = [];

    if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      records = parseExcel(req.file.buffer);
    } else {
      records = parseCSV(req.file.buffer);
    }

    if (records.length === 0) {
      return res.status(400).json({ success: false, error: 'No data found in file' });
    }

    // Analyze and categorize records
    const { oceanRecords, fisheriesRecords, ednaRecords, summary } = await analyzeRecords(records);

    // Insert data into database (both legacy tables AND Darwin Core tables)
    const insertResults = {
      ocean: { legacy: 0, darwinCore: 0 },
      fisheries: { legacy: 0, darwinCore: 0 },
      edna: { legacy: 0, darwinCore: 0 },
    };

    if (oceanRecords.length > 0) {
      insertResults.ocean = await insertOceanData(oceanRecords);
    }

    if (fisheriesRecords.length > 0) {
      insertResults.fisheries = await insertFisheriesData(fisheriesRecords);
    }

    if (ednaRecords.length > 0) {
      insertResults.edna = await insertEdnaData(ednaRecords);
    }

    const totalLegacy = insertResults.ocean.legacy + insertResults.fisheries.legacy + insertResults.edna.legacy;
    const totalDarwinCore = insertResults.ocean.darwinCore + insertResults.fisheries.darwinCore + insertResults.edna.darwinCore;

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        recordsParsed: records.length,
        analysis: {
          summary,
          insertResults: {
            ocean: insertResults.ocean.legacy,
            fisheries: insertResults.fisheries.legacy,
            edna: insertResults.edna.legacy,
            darwinCore: {
              ocean: insertResults.ocean.darwinCore,
              fisheries: insertResults.fisheries.darwinCore,
              edna: insertResults.edna.darwinCore,
              total: totalDarwinCore,
            },
          },
          totalInserted: totalLegacy,
          totalDarwinCoreInserted: totalDarwinCore,
        },
        insights: {
          message: `Successfully imported ${totalLegacy} records (${totalDarwinCore} standardized to Darwin Core)`,
          details: [
            ...(insertResults.ocean.legacy > 0
              ? [`${insertResults.ocean.legacy} ocean monitoring records (${insertResults.ocean.darwinCore} Darwin Core)`]
              : []),
            ...(insertResults.fisheries.legacy > 0
              ? [`${insertResults.fisheries.legacy} fisheries records (${insertResults.fisheries.darwinCore} Darwin Core)`]
              : []),
            ...(insertResults.edna.legacy > 0
              ? [`${insertResults.edna.legacy} eDNA records (${insertResults.edna.darwinCore} Darwin Core)`]
              : []),
          ],
          standardization: 'Darwin Core compliant - ready for GBIF publication',
        },
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process upload',
    });
  }
});

// Health check for upload service
router.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, service: 'upload', status: 'ok' });
});

export default router;
