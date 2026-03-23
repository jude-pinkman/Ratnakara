import { query } from '../../db/connection.js';
import { ImportLogger } from '../utils/logger.js';
import { DnaSequenceRecord } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * DNA Sequence Importer for FASTA and CSV formats
 * Extracts sequence metadata, calculates GC content, stores raw sequences
 */
export class DnaSequenceImporter {
  /**
   * Import DNA sequences from FASTA format
   */
  static async importFastaBatch(
    fastaText: string,
    logger: ImportLogger,
    dryRun: boolean = false
  ): Promise<number> {
    try {
      const sequences = this.parseFasta(fastaText);
      logger.logInfo(`Parsed ${sequences.length} sequences from FASTA`);

      if (dryRun) {
        logger.logInfo(`DRY RUN: Would insert ${sequences.length} sequences`);
        return sequences.length;
      }

      let inserted = 0;
      const batchSize = 50;

      for (let i = 0; i < sequences.length; i += batchSize) {
        const batch = sequences.slice(i, i + batchSize);

        try {
          const result = await this.insertDnaSequenceBatch(batch, logger);
          inserted += result;

          logger.logProgress();
        } catch (batchError) {
          logger.logError(
            `DNA sequence batch ${Math.floor(i / batchSize) + 1} failed: ${batchError}`
          );
        }
      }

      logger.logInfo(`DNA sequence import complete: ${inserted} sequences inserted`);
      return inserted;
    } catch (error) {
      logger.logError(`FASTA import failed: ${error}`);
      throw error;
    }
  }

  /**
   * Parse FASTA format file into sequence records
   * Format:
   * >sequence_id gene=16S species=Sardinella_longiceps
   * ATGCTAGCTAG...
   */
  private static parseFasta(
    fastaText: string
  ): DnaSequenceRecord[] {
    const sequences: DnaSequenceRecord[] = [];
    const lines = fastaText.split('\n');

    let currentRecord: DnaSequenceRecord | null = null;
    let currentSequence = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('>')) {
        // Save previous record
        if (currentRecord) {
          currentRecord.fasta_sequence = currentSequence;
          currentRecord.sequenceLength = currentSequence.length;
          currentRecord.gc_content = this.calculateGcContent(currentSequence);
          currentRecord.nucleotide_counts = this.countNucleotides(currentSequence);
          sequences.push(currentRecord);
        }

        // Parse header
        const header = trimmed.substring(1); // Remove '>'
        currentRecord = this.parseHeader(header);
        currentSequence = '';
      } else if (trimmed.length > 0 && currentRecord) {
        // Append to sequence
        currentSequence += trimmed;
      }
    }

    // Save last record
    if (currentRecord && currentSequence.length > 0) {
      currentRecord.fasta_sequence = currentSequence;
      currentRecord.sequenceLength = currentSequence.length;
      currentRecord.gc_content = this.calculateGcContent(currentSequence);
      currentRecord.nucleotide_counts = this.countNucleotides(currentSequence);
      sequences.push(currentRecord);
    }

    return sequences;
  }

  /**
   * Parse FASTA header to extract metadata
   * Format: sequence_id gene=16S species=Sardinella_longiceps
   */
  private static parseHeader(header: string): DnaSequenceRecord {
    const parts = header.split(/\s+/);
    const sequenceIdentifier = parts[0] || `SEQ-${uuidv4()}`;

    const record: DnaSequenceRecord = {
      sequenceIdentifier,
      sequenceFormat: 'FASTA',
      sequenceLength: 0,
      gene: 'unknown',
      fasta_sequence: '',
    };

    // Parse metadata from header
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      if (part.includes('=')) {
        const [key, value] = part.split('=');

        switch (key.toLowerCase()) {
          case 'gene':
            record.gene = value;
            break;
          case 'species':
            record.taxonomic_identification = value.replace(/_/g, ' ');
            break;
          case 'region':
            record.gene_region = value;
            break;
          case 'organism_source':
            record.organism_source = value;
            break;
          case 'occurrence':
          case 'occurrenceid':
            record.occurrenceID = value;
            break;
        }
      }
    }

    return record;
  }

  /**
   * Calculate GC content (% of G+C bases)
   */
  private static calculateGcContent(sequence: string): number {
    const upper = sequence.toUpperCase();
    const gcCount = (upper.match(/[GC]/g) || []).length;
    return (gcCount / sequence.length) * 100;
  }

  /**
   * Count nucleotide frequencies
   */
  private static countNucleotides(
    sequence: string
  ): { A: number; T: number; G: number; C: number } {
    const upper = sequence.toUpperCase();
    return {
      A: (upper.match(/A/g) || []).length,
      T: (upper.match(/T/g) || []).length,
      G: (upper.match(/G/g) || []).length,
      C: (upper.match(/C/g) || []).length,
    };
  }

  /**
   * Insert DNA sequences into database
   */
  private static async insertDnaSequenceBatch(
    sequences: DnaSequenceRecord[],
    logger: ImportLogger
  ): Promise<number> {
    if (sequences.length === 0) return 0;

    const values: any[] = [];
    const clauses: string[] = [];

    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i];

      values.push(
        uuidv4(), // id
        seq.occurrenceID || null, // occurrenceID
        seq.sequenceIdentifier,
        seq.sequenceAccession || null,
        seq.sequenceFormat,
        seq.sequenceLength,
        seq.gene,
        seq.gene_region || null,
        seq.gc_content || null,
        JSON.stringify(seq.nucleotide_counts || {}),
        seq.fasta_sequence,
        seq.sequence_quality || null,
        seq.quality_trimmed ? true : false,
        seq.taxonomic_identification || null,
        seq.blast_evalue || null,
        seq.blast_identity_percent || null,
        seq.blast_query_coverage || null,
        seq.blast_run_date || null,
        seq.functional_annotation || null,
        seq.organism_source || null,
        null, // file_path
        seq.fasta_sequence.length, // file_size_bytes
        null, // checksumMD5
        false, // submitted_to_ncbi
        null // ncbi_submission_id
      );

      const paramStart = i * 25 + 1;
      clauses.push(
        `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5}, $${paramStart + 6}, $${paramStart + 7}, $${paramStart + 8}, $${paramStart + 9}, $${paramStart + 10}, $${paramStart + 11}, $${paramStart + 12}, $${paramStart + 13}, $${paramStart + 14}, $${paramStart + 15}, $${paramStart + 16}, $${paramStart + 17}, $${paramStart + 18}, $${paramStart + 19}, $${paramStart + 20}, $${paramStart + 21}, $${paramStart + 22}, $${paramStart + 23}, $${paramStart + 24})`
      );
    }

    const insertQuery = `
      INSERT INTO dna_sequences
      (id, occurrenceID, sequenceIdentifier, sequenceAccession, sequenceFormat, sequenceLength, gene, gene_region, gc_content, nucleotide_counts, fasta_sequence, sequence_quality, quality_trimmed, taxonomic_identification, blast_evalue, blast_identity_percent, blast_query_coverage, blast_run_date, functional_annotation, organism_source, file_path, file_size_bytes, checksumMD5, submitted_to_ncbi, ncbi_submission_id)
      VALUES
      ${clauses.join(', ')}
      ON CONFLICT (sequenceIdentifier) DO NOTHING
    `;

    try {
      await query(insertQuery, values);
      return clauses.length;
    } catch (error) {
      logger.logError(`Failed to insert DNA sequences: ${error}`);
      throw error;
    }
  }

  /**
   * Get sequence statistics
   */
  static async getSequenceStats(logger: ImportLogger): Promise<any> {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_sequences,
          COUNT(DISTINCT gene) as unique_genes,
          AVG(sequenceLength) as avg_length,
          MIN(sequenceLength) as min_length,
          MAX(sequenceLength) as max_length,
          AVG(gc_content) as avg_gc_content,
          COUNT(DISTINCT taxonomic_identification) as identified_species
        FROM dna_sequences
      `);

      return result.rows[0];
    } catch (error) {
      logger.logError(`Failed to get sequence stats: ${error}`);
      throw error;
    }
  }

  /**
   * Example FASTA format
   */
  static getExampleFasta(): string {
    return `>SEQ001 gene=16S species=Sardinella_longiceps organism_source=muscle
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCG
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCG

>SEQ002 gene=COX1 species=Rastrelliger_kanagurta organism_source=gill
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCG
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCG
ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCG`;
  }
}
