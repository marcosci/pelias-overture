#!/usr/bin/env node
'use strict';

// Create a Pelias-compliant Elasticsearch index and `pelias` alias using
// the official `pelias-schema` package. Mirrors what
// `pelias-schema/scripts/create_index.js` does but runs from this repo so
// operators can bootstrap ES with a single command:
//
//   node scripts/create-pelias-index.js
//
// Requires:
//   - `pelias.json` reachable via PELIAS_CONFIG (same as the importer).
//   - Elasticsearch with the Pelias analysis plugins (use
//     pelias/elasticsearch images, not stock docker.elastic.co images).

const peliasConfig = require('pelias-config').generate();
const { Client } = require('elasticsearch');
const schema = require('pelias-schema/schema');

async function main() {
  const indexName = peliasConfig.schema?.indexName || 'pelias';
  const versioned = indexName + '_' + Date.now();

  const client = new Client(peliasConfig.esclient);

  const createRes = await client.indices.create({
    index: versioned,
    body: schema
  });
  console.log('created index', versioned, createRes.acknowledged);

  await client.indices.putAlias({ index: versioned, name: indexName });
  console.log('aliased', versioned, '->', indexName);
}

main().catch((err) => {
  console.error('create-pelias-index failed:', err.message);
  process.exitCode = 1;
});
