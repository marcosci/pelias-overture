'use strict';

// Generate local parquet fixtures via DuckDB so integration tests do not
// require network/S3 access. Idempotent.

const path = require('path');
const fs = require('fs');
const duckdb = require('@duckdb/node-api');

const FIXTURE_DIR = path.join(__dirname, 'overture');

async function ensureInstance() {
  const instance = await duckdb.DuckDBInstance.create(':memory:');
  const conn = await instance.connect();
  await conn.run('INSTALL spatial; LOAD spatial;');
  return conn;
}

async function writeAddresses(conn) {
  const outDir = path.join(FIXTURE_DIR, 'theme=addresses', 'type=address');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'part-00000.parquet').replace(/\\/g, '/');

  // Store geometry as native GEOMETRY so the parquet file carries GeoParquet
  // metadata and reads back as GEOMETRY — matching real Overture releases.
  await conn.run(`
    COPY (
      SELECT
        'addr-' || CAST(n AS VARCHAR) AS id,
        CASE WHEN n = 1 THEN ST_Point(-73.98, 40.75)
        ELSE ST_Point(13.40 + n * 0.001, 52.52) END AS geometry,
        CAST(n * 10 AS VARCHAR) AS number,
        CASE WHEN n = 1 THEN 'Carmine St' ELSE 'Unter den Linden' END AS street,
        NULL AS unit,
        CASE WHEN n = 1 THEN '10014' ELSE '10117' END AS postcode,
        CASE WHEN n = 1 THEN 'US' ELSE 'DE' END AS country,
        CASE WHEN n = 1 THEN 'New York' ELSE 'Berlin' END AS postal_city,
        NULL AS sources
      FROM range(1, 11) t(n)
    ) TO '${outPath}' (FORMAT PARQUET);
  `);
  return outPath;
}

async function run() {
  const conn = await ensureInstance();
  const addressesPath = await writeAddresses(conn);
  console.log('wrote', addressesPath);
}

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { run, FIXTURE_DIR };
