'use strict';

// Verify reader selection dispatches to the right backend.

jest.mock('../../lib/sources/parquetReader', () => ({
  createParquetStream: jest.fn((opts) => ({ __tag: 'duckdb', opts }))
}));
jest.mock('../../lib/sources/cliFallbackReader', () => ({
  createCliStream: jest.fn((opts) => ({ __tag: 'python', opts }))
}));

const { createSourceStream } = require('../../lib/sources');
const { createParquetStream } = require('../../lib/sources/parquetReader');
const { createCliStream } = require('../../lib/sources/cliFallbackReader');

describe('sources/index', () => {
  beforeEach(() => {
    createParquetStream.mockClear();
    createCliStream.mockClear();
  });

  test('default reader is duckdb', () => {
    const out = createSourceStream({
      overture: { datapath: '/d', s3: { enabled: false } },
      theme: 'addresses',
      type: 'address',
      columns: ['id'],
      where: null,
      geometryColumn: 'geometry'
    });
    expect(out.__tag).toBe('duckdb');
    expect(createParquetStream).toHaveBeenCalled();
  });

  test('reader=python dispatches to CLI', () => {
    const out = createSourceStream({
      overture: {
        reader: 'python',
        s3: { enabled: false, release: '2026-04-15.0' },
        bbox: [-10, -10, 10, 10]
      },
      theme: 'places',
      type: 'place',
      columns: [],
      where: null,
      geometryColumn: 'geometry'
    });
    expect(out.__tag).toBe('python');
    expect(createCliStream).toHaveBeenCalledWith(expect.objectContaining({
      release: '2026-04-15.0',
      type: 'place',
      bbox: [-10, -10, 10, 10]
    }));
  });

  test('reader=python without release throws', () => {
    expect(() => createSourceStream({
      overture: { reader: 'python' },
      theme: 'addresses',
      type: 'address',
      columns: [],
      geometryColumn: 'geometry'
    })).toThrow(/s3.release/);
  });

  test('unknown reader throws', () => {
    expect(() => createSourceStream({
      overture: { reader: 'bogus' },
      theme: 'addresses',
      type: 'address',
      columns: [],
      geometryColumn: 'geometry'
    })).toThrow(/unknown reader/);
  });
});
