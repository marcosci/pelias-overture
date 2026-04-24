'use strict';

const { Readable } = require('stream');
const { createFilter } = require('../../lib/themes/addresses/filter');

function fromArray(rows) {
  let i = 0;
  return new Readable({
    objectMode: true,
    read() {
      if (i >= rows.length) return this.push(null);
      this.push(rows[i++]);
    }
  });
}

async function drain(stream) {
  const out = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

describe('addresses/filter', () => {
  const sample = [
    { id: 'a', country: 'US', geometry: { type: 'Point', coordinates: [-122, 47] } },
    { id: 'b', country: 'DE', geometry: { type: 'Point', coordinates: [13, 52] } },
    { id: 'c', country: null, geometry: { type: 'Point', coordinates: [0, 0] } },
    { id: 'd', country: 'us', geometry: { type: 'Point', coordinates: [-74, 40] } }
  ];

  test('passes all rows when no filters set', async () => {
    const out = await drain(fromArray(sample).pipe(createFilter({})));
    expect(out).toHaveLength(4);
  });

  test('filters by country (case-insensitive)', async () => {
    const out = await drain(
      fromArray(sample).pipe(createFilter({ countryCode: ['US'] }))
    );
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'd']);
  });

  test('filters by bbox', async () => {
    const bbox = [-125, 45, -120, 50];
    const out = await drain(fromArray(sample).pipe(createFilter({ bbox })));
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  test('combines country and bbox', async () => {
    const bbox = [-125, 45, -120, 50];
    const out = await drain(
      fromArray(sample).pipe(createFilter({ countryCode: ['US'], bbox }))
    );
    expect(out.map((r) => r.id)).toEqual(['a']);
  });
});
