'use strict';

// Overture places stream filter.
// Country/bbox are pushed down into DuckDB. This layer handles residuals
// the reader can't express: minConfidence (already done in transform, but
// keeping here lets us skip doc construction earlier), category include/exclude.

const through = require('through2');
const { pointCentroid, inBbox } = require('../../util/geometry');

function createFilter({ bbox, countryCode, categories }) {
  const countrySet = countryCode && countryCode.length
    ? new Set(countryCode.map((c) => c.toUpperCase()))
    : null;

  const includeSet = categories && categories.include && categories.include.length
    ? new Set(categories.include)
    : null;
  const excludeSet = categories && categories.exclude && categories.exclude.length
    ? new Set(categories.exclude)
    : null;

  function rowCountry(row) {
    if (!row || !Array.isArray(row.addresses) || row.addresses.length === 0) return null;
    const c = row.addresses[0] && row.addresses[0].country;
    return c ? String(c).toUpperCase() : null;
  }

  function rowCategories(row) {
    if (!row || !row.categories) return [];
    const out = [];
    if (row.categories.primary) out.push(row.categories.primary);
    if (Array.isArray(row.categories.alternate)) out.push(...row.categories.alternate);
    return out;
  }

  return through.obj(function (row, _enc, cb) {
    if (!row) return cb();

    if (countrySet) {
      const c = rowCountry(row);
      if (!c || !countrySet.has(c)) return cb();
    }

    if (bbox) {
      const centroid = pointCentroid(row.geometry);
      if (!centroid || !inBbox(centroid, bbox)) return cb();
    }

    if (includeSet || excludeSet) {
      const rowCats = rowCategories(row);
      if (includeSet && !rowCats.some((c) => includeSet.has(c))) return cb();
      if (excludeSet && rowCats.some((c) => excludeSet.has(c))) return cb();
    }

    this.push(row);
    cb();
  });
}

module.exports = { createFilter };
