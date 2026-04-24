'use strict';

const { isValidGers, sourceIdFor, SOURCE, LAYERS } = require('../../lib/util/gers');

describe('util/gers', () => {
  describe('isValidGers', () => {
    test('accepts non-empty short string', () => {
      expect(isValidGers('abc')).toBe(true);
    });
    test('rejects empty string', () => {
      expect(isValidGers('')).toBe(false);
    });
    test('rejects non-strings', () => {
      expect(isValidGers(null)).toBe(false);
      expect(isValidGers(undefined)).toBe(false);
      expect(isValidGers(42)).toBe(false);
      expect(isValidGers({})).toBe(false);
    });
    test('rejects overlong strings', () => {
      expect(isValidGers('x'.repeat(200))).toBe(false);
    });
  });

  describe('sourceIdFor', () => {
    test('builds namespaced id for addresses', () => {
      expect(sourceIdFor('address', 'abc123')).toBe('overture:address:abc123');
    });
    test('throws for invalid GERS', () => {
      expect(() => sourceIdFor('address', '')).toThrow(/invalid GERS/);
      expect(() => sourceIdFor('address', null)).toThrow(/invalid GERS/);
    });
  });

  test('SOURCE is constant "overture"', () => {
    expect(SOURCE).toBe('overture');
  });

  test('LAYERS maps address + place', () => {
    expect(LAYERS.address).toBe('address');
    expect(LAYERS.place).toBe('venue');
  });
});
