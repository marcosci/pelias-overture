'use strict';

// Assemble the places theme stream.

const through = require('through2');
const { createSourceStream } = require('../../sources');
const { createFilter } = require('./filter');
const { overturePlaceToDocument, EXPECTED_COLUMNS } = require('./transform');

function buildWhereClause({ bbox, minConfidence }) {
  const clauses = [];
  if (typeof minConfidence === 'number' && minConfidence > 0) {
    clauses.push('confidence >= ' + minConfidence);
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

function createPlacesStream({ overture }) {
  const placesConfig = overture.themes.places || {};
  const minConfidence = placesConfig.minConfidence || 0;
  const categories = placesConfig.categories || { include: [], exclude: [] };

  const where = buildWhereClause({ bbox: overture.bbox, minConfidence });

  const source = createSourceStream({
    overture,
    theme: 'places',
    type: 'place',
    columns: EXPECTED_COLUMNS,
    where,
    geometryColumn: 'geometry'
  });

  const filter = createFilter({
    bbox: overture.bbox,
    countryCode: overture.countryCode,
    categories
  });

  const transform = through.obj(function (row, _enc, cb) {
    try {
      const doc = overturePlaceToDocument(row, { minConfidence });
      if (doc) this.push(doc);
    } catch (_) { /* drop bad row */ }
    cb();
  });

  source.pipe(filter).pipe(transform);
  source.on('error', (err) => transform.emit('error', err));
  filter.on('error', (err) => transform.emit('error', err));

  return transform;
}

module.exports = { createPlacesStream, buildWhereClause };
