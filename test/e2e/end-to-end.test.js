'use strict';

// End-to-end: spin pelias/elasticsearch in a container, apply Pelias schema,
// run the addresses pipeline over a local parquet fixture, then query ES.
//
// Skipped unless PELIAS_OVERTURE_E2E=1 is set — testcontainers pulls a
// ~500 MB image and is too heavy for every CI run.

const { GenericContainer, Wait } = require('testcontainers');
const { Client } = require('elasticsearch');
const { pipeline: pipelineCb } = require('stream');
const { promisify } = require('util');
const through = require('through2');
const peliasSchema = require('pelias-schema/schema');

const { run: makeFixtures, FIXTURE_DIR } = require('../fixtures/make-fixtures');
const { createAddressesStream } = require('../../lib/themes/addresses');

const pipeline = promisify(pipelineCb);

const IMAGE = 'pelias/elasticsearch:7.17.27';
const SHOULD_RUN = process.env.PELIAS_OVERTURE_E2E === '1';

const describeMaybe = SHOULD_RUN ? describe : describe.skip;

describeMaybe('e2e: addresses fixture -> Pelias ES', () => {
  let container;
  let client;
  let indexName;

  beforeAll(async () => {
    await makeFixtures();

    container = await new GenericContainer(IMAGE)
      .withExposedPorts(9200)
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
        'ES_JAVA_OPTS': '-Xms512m -Xmx512m'
      })
      .withWaitStrategy(Wait.forHttp('/', 9200).forStatusCode(200))
      .withStartupTimeout(120000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(9200);
    client = new Client({ host: `http://${host}:${port}` });

    indexName = 'pelias_' + Date.now();
    await client.indices.create({ index: indexName, body: peliasSchema });
    await client.indices.putAlias({ index: indexName, name: 'pelias' });
  }, 180000);

  afterAll(async () => {
    if (container) await container.stop({ timeout: 20 });
  }, 60000);

  test('pipeline writes Overture docs to Pelias index', async () => {
    const overture = {
      datapath: FIXTURE_DIR,
      s3: { enabled: false },
      countryCode: [],
      bbox: null,
      batchSize: 100,
      themes: { addresses: { enabled: true } }
    };

    const source = createAddressesStream({ overture });

    const bulkBody = [];
    const collect = through.obj(function (doc, _enc, cb) {
      const esDoc = doc.toESDocument();
      bulkBody.push({ index: { _index: esDoc._index, _id: esDoc._id } });
      bulkBody.push(esDoc.data);
      cb();
    });

    await pipeline(source, collect);

    expect(bulkBody.length).toBeGreaterThan(0);
    const resp = await client.bulk({ refresh: 'true', body: bulkBody });
    expect(resp.errors).toBe(false);

    const search = await client.search({
      index: 'pelias',
      body: { query: { term: { source: 'overture' } } },
      size: 3
    });
    const total = search.hits.total.value ?? search.hits.total;
    expect(total).toBeGreaterThanOrEqual(10);

    const first = search.hits.hits[0]._source;
    expect(first.source).toBe('overture');
    expect(first.layer).toBe('address');
    expect(first.source_id).toMatch(/^overture:address:/);
    expect(first.center_point).toBeDefined();
  }, 180000);
});
