'use strict';

const { featureToRow, args } = require('../../lib/sources/cliFallbackReader');

describe('sources/cliFallbackReader', () => {
  describe('args', () => {
    test('builds basic geojsonseq download args', () => {
      const out = args({ release: '2026-04-15.0', type: 'address', theme: 'addresses' });
      expect(out).toEqual([
        'download', '--type', 'address', '--format', 'geojsonseq',
        '--release', '2026-04-15.0'
      ]);
    });

    test('includes bbox when provided', () => {
      const out = args({
        release: '2026-04-15.0',
        type: 'place',
        bbox: [-125, 24, -66, 50]
      });
      expect(out).toContain('--bbox');
      expect(out).toContain('-125,24,-66,50');
    });

    test('omits release when not provided', () => {
      const out = args({ type: 'address' });
      expect(out).not.toContain('--release');
    });
  });

  describe('featureToRow', () => {
    test('extracts properties and merges id + geometry', () => {
      const row = featureToRow({
        type: 'Feature',
        id: 'gers-x',
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { number: '10', street: 'Main' }
      });
      expect(row).toEqual({
        id: 'gers-x',
        number: '10',
        street: 'Main',
        geometry: { type: 'Point', coordinates: [1, 2] }
      });
    });

    test('prefers feature.id over properties.id', () => {
      const row = featureToRow({
        type: 'Feature',
        id: 'from-id',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { id: 'from-props' }
      });
      expect(row.id).toBe('from-id');
    });

    test('returns null for non-Feature', () => {
      expect(featureToRow(null)).toBeNull();
      expect(featureToRow({ type: 'FeatureCollection' })).toBeNull();
    });
  });
});
