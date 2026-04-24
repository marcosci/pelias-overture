'use strict';

// Reader selection: DuckDB (default) or Python CLI.

const { createParquetStream } = require('./parquetReader');
const { createCliStream } = require('./cliFallbackReader');
const { planPartition } = require('./partitionPlanner');

function createSourceStream({ overture, theme, type, columns, where, geometryColumn }) {
  const reader = overture.reader || 'duckdb';

  if (reader === 'duckdb') {
    const pathGlob = planPartition({ overture, theme, type });
    return createParquetStream({
      pathGlob,
      columns,
      where,
      geometryColumn,
      batchSize: overture.batchSize
    });
  }

  if (reader === 'python') {
    if (!overture.s3 || !overture.s3.release) {
      throw new Error('reader=python requires imports.overture.s3.release to be set');
    }
    return createCliStream({
      release: overture.s3.release,
      theme,
      type,
      bbox: overture.bbox
    });
  }

  throw new Error('unknown reader: ' + reader);
}

module.exports = { createSourceStream };
