'use strict';

// Overture `places` row -> Pelias Document.

const { Document } = require('pelias-model');
const { SOURCE, LAYERS, sourceIdFor, isValidGers } = require('../../util/gers');
const { pointCentroid } = require('../../util/geometry');
const { mapCategories } = require('./categoryMap');

const LAYER = LAYERS.place;

const EXPECTED_COLUMNS = Object.freeze([
  'id',
  'geometry',
  'names',
  'categories',
  'confidence',
  'websites',
  'socials',
  'emails',
  'phones',
  'brand',
  'addresses',
  'sources'
]);

function primaryName(names) {
  if (!names) return null;
  if (typeof names.primary === 'string' && names.primary.trim()) return names.primary.trim();
  return null;
}

function applyAliases(doc, names) {
  if (!names) return;

  const common = names.common;
  if (common && typeof common === 'object') {
    for (const [lang, value] of Object.entries(common)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      try {
        doc.setName(lang, value.trim());
      } catch (_) {
        // unsupported lang key — skip quietly
      }
    }
  }

  const rules = Array.isArray(names.rules) ? names.rules : [];
  for (const rule of rules) {
    if (!rule || typeof rule.value !== 'string') continue;
    const v = rule.value.trim();
    if (!v) continue;
    try {
      if (rule.language) {
        doc.setNameAlias(rule.language, v);
      } else {
        doc.setNameAlias('default', v);
      }
    } catch (_) {
      // invalid lang code — skip
    }
  }
}

function applyAddress(doc, addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return;
  const first = addresses[0];
  if (!first || typeof first !== 'object') return;
  const freeform = first.freeform;
  if (typeof freeform === 'string' && freeform.trim()) {
    const match = freeform.match(/^\s*(\S+)\s+(.+?)\s*$/);
    if (match) {
      doc.setAddress('number', match[1]);
      doc.setAddress('street', match[2]);
    } else {
      doc.setAddress('street', freeform.trim());
    }
  }
  if (first.postcode) doc.setAddress('zip', String(first.postcode));
}

function overturePlaceToDocument(row, opts = {}) {
  if (!row || !isValidGers(row.id)) return null;

  const centroid = pointCentroid(row.geometry);
  if (!centroid) return null;

  const name = primaryName(row.names);
  if (!name) return null;

  const minConfidence = typeof opts.minConfidence === 'number' ? opts.minConfidence : 0;
  if (typeof row.confidence === 'number' && row.confidence < minConfidence) return null;

  const doc = new Document(SOURCE, LAYER, row.id);
  doc.setSourceId(sourceIdFor('place', row.id));
  doc.setCentroid(centroid);
  doc.setName('default', name);

  applyAliases(doc, row.names);

  if (row.categories) {
    const cats = mapCategories(row.categories.primary, row.categories.alternate);
    for (const c of cats) {
      try { doc.addCategory(c); } catch (_) { /* drop invalid */ }
    }
  }

  applyAddress(doc, row.addresses);

  if (typeof row.confidence === 'number' && Number.isFinite(row.confidence)) {
    doc.setPopularity(Math.max(1, Math.round(row.confidence * 1e6)));
  }

  doc.setAddendum('overture', {
    gers: row.id,
    theme: 'places',
    confidence: row.confidence ?? null,
    categories_raw: row.categories || null,
    websites: row.websites || null,
    socials: row.socials || null,
    emails: row.emails || null,
    phones: row.phones || null,
    brand: row.brand || null,
    sources: row.sources || null
  });

  return doc;
}

module.exports = { overturePlaceToDocument, EXPECTED_COLUMNS };
