'use strict';

// Overture `addresses` row -> Pelias Document.
// Returns null for rows that cannot be represented (invalid geometry, missing id).

const { Document } = require('pelias-model');
const { SOURCE, LAYERS, sourceIdFor, isValidGers } = require('../../util/gers');
const { pointCentroid } = require('../../util/geometry');

const LAYER = LAYERS.address;

const EXPECTED_COLUMNS = Object.freeze([
  'id',
  'geometry',
  'number',
  'street',
  'unit',
  'postcode',
  'country',
  'postal_city',
  'sources'
]);

function buildDisplayName(row) {
  const parts = [];
  if (row.number) parts.push(String(row.number));
  if (row.street) parts.push(String(row.street));
  if (parts.length === 0) return null;
  return parts.join(' ');
}

function overtureAddressToDocument(row) {
  if (!row || !isValidGers(row.id)) return null;

  const centroid = pointCentroid(row.geometry);
  if (!centroid) return null;

  const hasStreetInfo = Boolean(row.number || row.street);
  if (!hasStreetInfo) return null;

  const doc = new Document(SOURCE, LAYER, row.id);
  doc.setSourceId(sourceIdFor('address', row.id));
  doc.setCentroid(centroid);

  if (row.number) doc.setAddress('number', String(row.number));
  if (row.street) doc.setAddress('street', String(row.street));
  if (row.unit) doc.setAddress('unit', String(row.unit));
  if (row.postcode) doc.setAddress('zip', String(row.postcode));

  const displayName = buildDisplayName(row);
  if (displayName) doc.setName('default', displayName);

  // Admin hierarchy (country, locality, region) is owned by pelias-wof-admin-lookup
  // via polygon PIP when `imports.adminLookup.enabled` is true. The upstream
  // Overture `country` (ISO 3166 alpha-2) and `postal_city` are preserved in the
  // addendum so callers can reconcile. `setAddress` only accepts
  // name/number/unit/street/cross_street/zip.

  const countryCode = row.country ? String(row.country).toUpperCase() : null;

  doc.setAddendum('overture', {
    gers: row.id,
    theme: 'addresses',
    country: countryCode,
    postal_city: row.postal_city || null,
    sources: row.sources || null
  });

  return doc;
}

module.exports = { overtureAddressToDocument, EXPECTED_COLUMNS };
