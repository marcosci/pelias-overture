'use strict';

const { validate } = require('../../schema');

function baseConfig(overrides) {
  return {
    imports: {
      overture: Object.assign({
        datapath: '/data/overture/2026-04-23.0',
        themes: {
          addresses: { enabled: true },
          places: { enabled: true }
        }
      }, overrides || {})
    }
  };
}

describe('schema.validate', () => {
  test('applies defaults', () => {
    const v = validate(baseConfig());
    const o = v.imports.overture;
    expect(o.parallelism).toBe(4);
    expect(o.batchSize).toBe(500);
    expect(o.adminLookup).toBe(true);
    expect(o.deduplicate).toBe(true);
    expect(o.themes.places.minConfidence).toBe(0.7);
  });

  test('rejects missing datapath', () => {
    expect(() => validate({
      imports: { overture: { themes: { addresses: { enabled: true }, places: { enabled: true } } } }
    })).toThrow(/datapath/);
  });

  test('rejects out-of-range minConfidence', () => {
    expect(() => validate(baseConfig({
      themes: { addresses: { enabled: true }, places: { enabled: true, minConfidence: 2 } }
    }))).toThrow();
  });

  test('rejects malformed bbox', () => {
    expect(() => validate(baseConfig({ bbox: [1, 2, 3] }))).toThrow();
  });

  test('accepts country codes and normalises case', () => {
    const v = validate(baseConfig({ countryCode: ['us', 'de'] }));
    expect(v.imports.overture.countryCode).toEqual(['US', 'DE']);
  });

  test('accepts full valid config', () => {
    expect(() => validate(baseConfig({
      countryCode: ['US'],
      bbox: [-125, 24, -66, 50],
      parallelism: 8,
      batchSize: 1000,
      deduplicate: false,
      adminLookup: false,
      s3: { enabled: false },
      checkpointPath: '/tmp/ckpt.json'
    }))).not.toThrow();
  });
});
