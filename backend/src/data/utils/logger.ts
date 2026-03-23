import { ImportStats } from '../importers/types.js';

export class ImportLogger {
  private stats: ImportStats;
  private logInterval: number;
  private importerName: string;

  constructor(importerName: string, logInterval: number = 100) {
    this.importerName = importerName;
    this.logInterval = logInterval;
    this.stats = {
      processed: 0,
      inserted: 0,
      skipped: 0,
      errored: 0,
      startTime: new Date(),
    };
  }

  start(message: string) {
    console.log(`\n▶️  [${this.importerName}] ${message}`);
    console.log(`   Started at ${this.stats.startTime.toISOString()}`);
  }

  record(type: 'inserted' | 'skipped' | 'errored') {
    this.stats.processed++;
    this.stats[type]++;

    if (this.stats.processed % this.logInterval === 0) {
      this.logProgress();
    }
  }

  logProgress() {
    const elapsed = ((new Date().getTime() - this.stats.startTime.getTime()) / 1000).toFixed(1);
    console.log(
      `   Progress: ${this.stats.processed} processed | ` +
      `${this.stats.inserted} inserted | ` +
      `${this.stats.skipped} skipped | ` +
      `${this.stats.errored} errored | ` +
      `${elapsed}s elapsed`
    );
  }

  logError(message: string, error?: any) {
    console.error(`   ❌ ERROR: ${message}`);
    if (error && process.env.VERBOSE) {
      console.error(`   ${error.message}`);
    }
  }

  logWarning(message: string) {
    console.warn(`   ⚠️  WARNING: ${message}`);
  }

  logInfo(message: string) {
    console.log(`   ℹ️  ${message}`);
  }

  complete() {
    this.stats.endTime = new Date();
    const duration = ((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000).toFixed(2);

    console.log(`\n✅ [${this.importerName}] Import Complete`);
    console.log(`   Total processed: ${this.stats.processed}`);
    console.log(`   Successfully inserted: ${this.stats.inserted}`);
    console.log(`   Skipped: ${this.stats.skipped}`);
    console.log(`   Errors: ${this.stats.errored}`);
    console.log(`   Duration: ${duration}s`);

    return this.stats;
  }

  getStats(): ImportStats {
    return { ...this.stats };
  }
}
