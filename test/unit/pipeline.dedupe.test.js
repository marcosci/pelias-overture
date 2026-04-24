'use strict';

const { Readable } = require('stream');
const { Document } = require('pelias-model');
const { createDedupeStream } = require('../../lib/pipeline');

function makeDoc(sourceId) {
  const d = new Document('overture', 'address', sourceId.split(':').pop());
  d.setSourceId(sourceId);
  d.setCentroid({ lon: 0, lat: 0 });
  return d;
}

function fromDocs(docs) {
  let i = 0;
  return new Readable({
    objectMode: true,
    read() {
      if (i >= docs.length) return this.push(null);
      this.push(docs[i++]);
    }
  });
}

async function drain(stream) {
  const out = [];
  for await (const d of stream) out.push(d);
  return out;
}

describe('pipeline/createDedupeStream', () => {
  test('drops repeated source_id within a run', async () => {
    const docs = [
      makeDoc('overture:address:a'),
      makeDoc('overture:address:b'),
      makeDoc('overture:address:a'),
      makeDoc('overture:address:c'),
      makeDoc('overture:address:b')
    ];
    const out = await drain(fromDocs(docs).pipe(createDedupeStream()));
    expect(out.map((d) => d.getSourceId())).toEqual([
      'overture:address:a',
      'overture:address:b',
      'overture:address:c'
    ]);
  });
});
