'use strict';

const { isValidLonLat, pointCentroid, inBbox } = require('../../lib/util/geometry');

describe('util/geometry', () => {
  describe('isValidLonLat', () => {
    test('accepts values within Earth bounds', () => {
      expect(isValidLonLat(0, 0)).toBe(true);
      expect(isValidLonLat(-180, -90)).toBe(true);
      expect(isValidLonLat(180, 90)).toBe(true);
    });
    test('rejects out-of-range values', () => {
      expect(isValidLonLat(181, 0)).toBe(false);
      expect(isValidLonLat(0, 91)).toBe(false);
    });
    test('rejects NaN and Infinity', () => {
      expect(isValidLonLat(NaN, 0)).toBe(false);
      expect(isValidLonLat(0, Infinity)).toBe(false);
    });
  });

  describe('pointCentroid', () => {
    test('extracts Point coords', () => {
      const c = pointCentroid({ type: 'Point', coordinates: [10, 20] });
      expect(c).toEqual({ lon: 10, lat: 20 });
    });
    test('returns null for non-Point', () => {
      expect(pointCentroid({ type: 'Polygon', coordinates: [] })).toBeNull();
    });
    test('returns null for invalid coords', () => {
      expect(pointCentroid({ type: 'Point', coordinates: [200, 0] })).toBeNull();
    });
    test('returns null for missing geometry', () => {
      expect(pointCentroid(null)).toBeNull();
      expect(pointCentroid(undefined)).toBeNull();
    });
  });

  describe('inBbox', () => {
    test('returns true when no bbox provided', () => {
      expect(inBbox({ lon: 0, lat: 0 }, null)).toBe(true);
    });
    test('inclusive bounds', () => {
      const bbox = [-10, -10, 10, 10];
      expect(inBbox({ lon: 0, lat: 0 }, bbox)).toBe(true);
      expect(inBbox({ lon: 10, lat: 10 }, bbox)).toBe(true);
      expect(inBbox({ lon: 11, lat: 0 }, bbox)).toBe(false);
      expect(inBbox({ lon: 0, lat: -11 }, bbox)).toBe(false);
    });
  });
});
