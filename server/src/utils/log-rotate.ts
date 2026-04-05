/**
 * Log rotation utility for the Slack-for-AI platform.
 * Can be used standalone or as a cron job to rotate log files.
 * 
 * Usage:
 *   tsx src/utils/log-rotate.ts                    # Run rotation
 *   tsx src/utils/log-rotate.ts --max-files 10     # Keep 10 rotated files
 *   tsx src/utils/log-rotate.ts --max-size 50      # Rotate at 50MB
 *   LOG_DIR=/var/log/slack-ai tsx src/utils/log-rotate.ts
 */

import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR ?? path.join(process.cwd(), "logs");
const MAX_FILES_DEFAULT = 7;  // Keep 7 days of logs
const MAX_SIZE_MB_DEFAULT = 100; // Rotate at 100MB

function getNumericArg(flag: string, defaultVal: number): number {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  const val = parseInt(args[idx + 1], 10);
  return isNaN(val) ? defaultVal : val;
}

interface LogFile {
  path: string;
  size: number;
  modified: Date;
}

function getLogFiles(logDir: string): LogFile[] {
  if (!fs.existsSync(logDir)) return [];

  const entries = fs.readdirSync(logDir);
  const files: LogFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(logDir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile() && (entry.endsWith(".log") || entry.endsWith(".log.gz"))) {
        files.push({
          path: fullPath,
          size: stat.size,
          modified: stat.mtime,
        });
      }
    } catch {
      // Skip unreadable files
    }
  }

  return files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

function rotateFile(
  filePath: string,
  maxSizeBytes: number
): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < maxSizeBytes) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ".log");
    const rotatedPath = path.join(dir, `${base}.${timestamp}.log`);

    fs.renameSync(filePath, rotatedPath);
    // Create the new log file by opening a write stream
    fs.writeFileSync(filePath, "");

    console.log(`Rotated: ${filePath} -> ${rotatedPath} (${Math.round(stat.size / 1024 / 1024)}MB)`);
    return rotatedPath;
  } catch (err) {
    console.error(`Failed to rotate ${filePath}: ${err}`);
    return null;
  }
}

function cleanupOldFiles(logDir: string, maxFiles: number): void {
  const files = getLogFiles(logDir);
  if (files.length <= maxFiles) return;

  const toDelete = files.slice(maxFiles);
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
      console.log(`Deleted old log: ${file.path} (${Math.round(file.size / 1024)}KB)`);
    } catch (err) {
      console.error(`Failed to delete ${file.path}: ${err}`);
    }
  }
}

function run(): void {
  const maxFiles = getNumericArg("--max-files", MAX_FILES_DEFAULT);
  const maxSizeMB = getNumericArg("--max-size", MAX_SIZE_MB_DEFAULT);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  console.log(`Log rotation started`);
  console.log(`  LOG_DIR: ${LOG_DIR}`);
  console.log(`  maxFiles: ${maxFiles}`);
  console.log(`  maxSizeMB: ${maxSizeMB}`);

  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    console.log(`Created log directory: ${LOG_DIR}`);
  }

  // Find and rotate oversized files
  const files = getLogFiles(LOG_DIR);
  let rotated = 0;
  for (const file of files) {
    if (rotateFile(file.path, maxSizeBytes)) {
      rotated++;
    }
  }

  // Clean up old files
  cleanupOldFiles(LOG_DIR, maxFiles);

  const remaining = getLogFiles(LOG_DIR);
  const totalSizeMB = remaining.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;

  console.log(`Log rotation complete:`);
  console.log(`  Rotated: ${rotated} file(s)`);
  console.log(`  Remaining: ${remaining.length} file(s), ${Math.round(totalSizeMB * 100) / 100}MB total`);
}

// Run if executed directly (not imported)
if (require.main === module || process.argv[1]?.endsWith("log-rotate.ts")) {
  run();
}

export { run as rotateLogs, getLogFiles, cleanupOldFiles };
