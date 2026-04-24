'use strict';

// Integration test: run the addresses source stream against a locally
// generated parquet fixture. No network access required.

const { run: makeFixtures, FIXTURE_DIR } = require('../fixtures/make-fixtures');
const { createAddressesStream } = require('../../lib/themes/addresses');

async function drain(stream) {
  const out = [];
  for await (const d of stream) out.push(d);
  return out;
}

describe('integration: addresses pipeline over local parquet fixture', () => {
  beforeAll(async () => {
    await makeFixtures();
  }, 60000);

  test('reads fixture and emits Pelias Documents', async () => {
    const overture = {
      datapath: FIXTURE_DIR,
      s3: { enabled: false },
      countryCode: [],
      bbox: null,
      batchSize: 100,
      themes: { addresses: { enabled: true } }
    };

    const stream = createAddressesStream({ overture });
    const docs = await drain(stream);

    expect(docs.length).toBe(10);
    expect(docs[0].getSource()).toBe('overture');
    expect(docs[0].getLayer()).toBe('address');
    expect(docs[0].getSourceId()).toMatch(/^overture:address:addr-/);
  }, 60000);

  test('country filter pushes down into DuckDB', async () => {
    const overture = {
      datapath: FIXTURE_DIR,
      s3: { enabled: false },
      countryCode: ['DE'],
      bbox: null,
      batchSize: 100,
      themes: { addresses: { enabled: true } }
    };

    const stream = createAddressesStream({ overture });
    const docs = await drain(stream);

    expect(docs.length).toBe(9);
    for (const d of docs) {
      expect(d.getAddendum('overture').country).toBe('DE');
    }
  }, 60000);
});
