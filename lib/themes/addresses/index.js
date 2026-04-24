'use strict';

// Assemble the addresses theme stream.
// parquet -> filter -> transform -> Document records.

const through = require('through2');
const { createSourceStream } = require('../../sources');
const { createFilter } = require('./filter');
const { overtureAddressToDocument, EXPECTED_COLUMNS } = require('./transform');

function buildWhereClause({ countryCode, bbox }) {
  const clauses = [];
  if (countryCode && countryCode.length) {
    const list = countryCode.map((c) => "'" + c.toUpperCase() + "'").join(',');
    clauses.push('country IN (' + list + ')');
  }
  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    clauses.push('bbox.xmin >= ' + minLon);
    clauses.push('bbox.ymin >= ' + minLat);
    clauses.push('bbox.xmax <= ' + maxLon);
    clauses.push('bbox.ymax <= ' + maxLat);
  }
  return clauses.length ? clauses.join(' AND ') : null;
}

function createAddressesStream({ overture }) {
  const where = buildWhereClause({
    countryCode: overture.countryCode,
    bbox: overture.bbox
  });

  const source = createSourceStream({
    overture,
    theme: 'addresses',
    type: 'address',
    columns: EXPECTED_COLUMNS,
    where,
    geometryColumn: 'geometry'
  });

  const filter = createFilter({
    bbox: overture.bbox,
    countryCode: overture.countryCode
  });

  // Transform is CPU-sync; pelias-parallel-stream adds overhead (setInterval-
  // based flush + queue bookkeeping) without speeding up sync work. We reserve
  // parallel-stream for I/O stages (admin-lookup, dbclient).
  const transform = through.obj(function (row, _enc, cb) {
    try {
      const doc = overtureAddressToDocument(row);
      if (doc) this.push(doc);
    } catch (_) { /* drop bad row */ }
    cb();
  });

  source.pipe(filter).pipe(transform);
  source.on('error', (err) => transform.emit('error', err));
  filter.on('error', (err) => transform.emit('error', err));

  return transform;
}

module.exports = { createAddressesStream, buildWhereClause };
