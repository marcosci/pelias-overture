'use strict';

// Overture addresses stream filter.
// Note: country + bbox filters are pushed down into DuckDB when possible
// (see lib/themes/addresses/index.js). This Transform handles residuals
// that DuckDB can't express.

const through = require('through2');
const { pointCentroid, inBbox } = require('../../util/geometry');

function createFilter({ bbox, countryCode }) {
  const countrySet = countryCode && countryCode.length
    ? new Set(countryCode.map((c) => c.toUpperCase()))
    : null;

  return through.obj(function (row, _enc, cb) {
    if (!row) return cb();

    if (countrySet) {
      const c = row.country ? String(row.country).toUpperCase() : null;
      if (!c || !countrySet.has(c)) return cb();
    }

    if (bbox) {
      const centroid = pointCentroid(row.geometry);
      if (!centroid || !inBbox(centroid, bbox)) return cb();
    }

    this.push(row);
    cb();
  });
}

module.exports = { createFilter };
