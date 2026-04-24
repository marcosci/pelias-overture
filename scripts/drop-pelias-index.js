#!/usr/bin/env node
'use strict';

// Drop every Elasticsearch index that is part of the Pelias alias, plus
// the alias itself. Intended for dev resets — NOT for production. Pelias
// schema versions its real indices (pelias_<ts>); this reaps all of them.

const peliasConfig = require('pelias-config').generate();
const { Client } = require('elasticsearch');

async function main() {
  const alias = peliasConfig.schema?.indexName || 'pelias';
  const client = new Client(peliasConfig.esclient);

  const resolved = await client.indices.getAlias({ name: alias }).catch(() => null);
  const indices = resolved ? Object.keys(resolved) : [];

  if (indices.length === 0) {
    console.log('no indices resolve under alias', alias);
    return;
  }

  for (const idx of indices) {
    await client.indices.delete({ index: idx });
    console.log('deleted', idx);
  }
}

main().catch((err) => {
  console.error('drop-pelias-index failed:', err.message);
  process.exitCode = 1;
});
