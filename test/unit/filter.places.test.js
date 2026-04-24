'use strict';

const { Readable } = require('stream');
const { createFilter } = require('../../lib/themes/places/filter');

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

describe('places/filter', () => {
  const sample = [
    {
      id: 'a',
      geometry: { type: 'Point', coordinates: [-122, 47] },
      addresses: [{ country: 'US' }],
      categories: { primary: 'eat_and_drink', alternate: [] }
    },
    {
      id: 'b',
      geometry: { type: 'Point', coordinates: [13, 52] },
      addresses: [{ country: 'DE' }],
      categories: { primary: 'accommodation.hotel', alternate: [] }
    },
    {
      id: 'c',
      geometry: { type: 'Point', coordinates: [-74, 40] },
      addresses: [{ country: 'US' }],
      categories: { primary: 'automotive.gas_station', alternate: [] }
    }
  ];

  test('filters by country', async () => {
    const out = await drain(fromArray(sample).pipe(createFilter({ countryCode: ['US'] })));
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'c']);
  });

  test('exclude list drops matched categories', async () => {
    const out = await drain(
      fromArray(sample).pipe(
        createFilter({ categories: { include: [], exclude: ['automotive.gas_station'] } })
      )
    );
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  test('include list keeps only matched categories', async () => {
    const out = await drain(
      fromArray(sample).pipe(
        createFilter({ categories: { include: ['eat_and_drink'], exclude: [] } })
      )
    );
    expect(out.map((r) => r.id)).toEqual(['a']);
  });
});
