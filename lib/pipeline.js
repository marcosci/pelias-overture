'use strict';

// Central pipeline: Document stream -> admin lookup -> blacklist -> dedupe -> dbclient.
// Per-theme source streams are assembled in lib/themes/*/index.js and piped in here.

const { pipeline } = require('stream');
const through = require('through2');
const blacklistStream = require('pelias-blacklist-stream');
const dbclient = require('pelias-dbclient');
const logger = require('pelias-logger').get('overture');

// Convert pelias-model Document objects into the `{ _index, _id, data }` shape
// that pelias-dbclient expects. Document.toESDocument() reads `schema.indexName`
// from pelias-config and returns the correct envelope.
function createEsDocStream() {
  return through.obj(function (doc, _enc, cb) {
    if (!doc || typeof doc.toESDocument !== 'function') return cb();
    try {
      cb(null, doc.toESDocument());
    } catch (err) {
      logger.warn('toESDocument failed, dropping doc', { err: err.message });
      cb();
    }
  });
}

function createDedupeStream() {
  const seen = new Set();
  return through.obj(function (doc, _enc, cb) {
    const key = doc.getSourceId();
    if (!key) return cb(null, doc);
    if (seen.has(key)) return cb();
    seen.add(key);
    cb(null, doc);
  });
}

function createAdminLookupStream(overture) {
  if (!overture.adminLookup) return through.obj();
  const adminLookup = require('pelias-wof-admin-lookup');
  // pelias-wof-admin-lookup.create() honours the `imports.adminLookup`
  // block in pelias.json (maxConcurrentReqs etc). Overture-side concurrency
  // is exposed for when operators want to override without editing the
  // shared pelias.json adminLookup block.
  return adminLookup.create({
    maxConcurrentReqs: overture.adminLookupConcurrency || 4
  });
}

function createCounter(label) {
  let n = 0;
  const logEvery = 10000;
  return through.obj(function (doc, _enc, cb) {
    n += 1;
    if (n % logEvery === 0) {
      logger.info(label + ' progress', { count: n });
    }
    cb(null, doc);
  }).on('end', () => logger.info(label + ' complete', { count: n }));
}

function run({ sourceStream, overture, themeLabel }) {
  return new Promise((resolve, reject) => {
    const stages = [sourceStream];

    stages.push(createCounter(themeLabel + ' source'));

    if (overture.adminLookup) {
      stages.push(createAdminLookupStream(overture));
    }

    stages.push(blacklistStream());

    if (overture.deduplicate) {
      stages.push(createDedupeStream());
    }

    stages.push(createCounter(themeLabel + ' emitted'));
    stages.push(createEsDocStream());
    stages.push(dbclient());

    pipeline(stages, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { run, createDedupeStream };
