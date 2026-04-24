#!/usr/bin/env node
'use strict';

// Benchmark the DuckDB-backed parquet reader against Overture parquet data.
// Usage: node scripts/benchmark-parquet-reader.js [--path=<glob>] [--limit=N]
// Default path reads a small slice of the latest Overture addresses partition
// from the public S3 mirror (requires outbound S3 access).

const { createParquetStream } = require('../lib/sources/parquetReader');

function parseArgs(argv) {
  const args = { limit: 10000 };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-zA-Z]+)(?:=(.*))?$/);
    if (!m) continue;
    args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv);
  const pathGlob = args.path
    || 's3://overturemaps-us-west-2/release/2026-04-15.0/theme=addresses/type=address/*';
  const limit = Number(args.limit) || 10000;

  console.log('benchmark', { pathGlob, limit });

  const stream = createParquetStream({
    pathGlob,
    columns: ['id', 'geometry', 'number', 'street', 'country', 'postcode', 'postal_city'],
    where: "country = 'LI'",
    geometryColumn: 'geometry',
    batchSize: 1000,
    limit
  });

  let n = 0;
  const t0 = Date.now();
  const memStart = process.memoryUsage().rss;

  for await (const row of stream) {
    n += 1;
    if (n >= limit) {
      stream.destroy();
      break;
    }
  }

  const elapsed = (Date.now() - t0) / 1000;
  const memEnd = process.memoryUsage().rss;

  console.log('result', {
    rows: n,
    seconds: elapsed.toFixed(2),
    rows_per_sec: Math.round(n / elapsed),
    peak_rss_mb: Math.round(memEnd / 1024 / 1024),
    rss_delta_mb: Math.round((memEnd - memStart) / 1024 / 1024)
  });
}

run().catch((err) => {
  console.error('benchmark failed:', err.message);
  process.exitCode = 1;
});
