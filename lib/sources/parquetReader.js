'use strict';

// DuckDB-backed GeoParquet reader.
// Emits an object-mode Readable of row objects with geometry decoded as GeoJSON.

const { Readable } = require('stream');
const duckdb = require('@duckdb/node-api');

async function createInstance() {
  const instance = await duckdb.DuckDBInstance.create(':memory:');
  const conn = await instance.connect();
  await conn.run("INSTALL spatial; LOAD spatial;");
  await conn.run("INSTALL httpfs; LOAD httpfs;");
  return { instance, conn };
}

function buildQuery({ pathGlob, columns, where, geometryColumn, batchSize, limit }) {
  const selectCols = columns
    .map((c) => {
      if (c !== geometryColumn) return c;
      // DuckDB spatial reads GeoParquet geometry as native GEOMETRY when the
      // file carries GeoParquet metadata (Overture does). ST_AsGeoJSON emits
      // a JSON string decoded on the Node side.
      return "ST_AsGeoJSON(" + c + ") AS " + c;
    })
    .join(', ');
  const clause = where ? ' WHERE ' + where : '';
  const lim = Number.isInteger(limit) && limit > 0 ? ' LIMIT ' + limit : '';
  return `SELECT ${selectCols} FROM read_parquet('${pathGlob}', union_by_name=true)${clause}${lim}`;
}

function normalizeRow(row, geometryColumn) {
  if (!row) return row;
  const geo = row[geometryColumn];
  if (typeof geo === 'string') {
    try {
      row[geometryColumn] = JSON.parse(geo);
    } catch (_) {
      row[geometryColumn] = null;
    }
  }
  return row;
}

function rowFromColumns(columnNames, values) {
  const out = {};
  for (let i = 0; i < columnNames.length; i++) {
    out[columnNames[i]] = values[i];
  }
  return out;
}

async function* rowGenerator({ sql, geometryColumn, columns }) {
  const { conn } = await createInstance();
  try {
    const reader = await conn.streamAndReadAll(sql);
    const rows = reader.getRows();
    for (const rowValues of rows) {
      const row = Array.isArray(rowValues)
        ? rowFromColumns(columns, rowValues)
        : rowValues;
      yield normalizeRow(row, geometryColumn);
    }
  } finally {
    try { conn.closeSync && conn.closeSync(); } catch (_) { /* noop */ }
  }
}

/**
 * Create a Readable object stream over parquet rows.
 * @param {object} opts
 * @param {string} opts.pathGlob
 * @param {string[]} opts.columns
 * @param {string} [opts.where]
 * @param {string} [opts.geometryColumn='geometry']
 * @param {number} [opts.batchSize=1000]
 * @returns {Readable}
 */
function createParquetStream(opts) {
  const geometryColumn = opts.geometryColumn || 'geometry';
  const batchSize = opts.batchSize || 1000;
  const sql = buildQuery({ ...opts, geometryColumn, batchSize, limit: opts.limit });
  return Readable.from(
    rowGenerator({ sql, geometryColumn, columns: opts.columns }),
    { objectMode: true, highWaterMark: batchSize }
  );
}

module.exports = { createParquetStream, buildQuery, normalizeRow };
