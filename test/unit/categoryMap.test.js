'use strict';

const { resolveTopLevel, mapCategories, TOP_LEVEL } = require('../../lib/themes/places/categoryMap');

describe('places/categoryMap', () => {
  test('resolveTopLevel maps known top-level category', () => {
    expect(resolveTopLevel('eat_and_drink')).toBe('food');
    expect(resolveTopLevel('accommodation')).toBe('accommodation');
  });

  test('resolveTopLevel extracts root of dotted path', () => {
    expect(resolveTopLevel('eat_and_drink.restaurant.italian')).toBe('food');
  });

  test('resolveTopLevel returns null for unknown category', () => {
    expect(resolveTopLevel('totally_made_up_thing')).toBeNull();
    expect(resolveTopLevel(null)).toBeNull();
    expect(resolveTopLevel('')).toBeNull();
  });

  test('mapCategories returns mapped + raw primary', () => {
    expect(mapCategories('eat_and_drink.restaurant', [])).toEqual([
      'food', 'eat_and_drink.restaurant'
    ]);
  });

  test('mapCategories deduplicates across primary + alternates', () => {
    expect(mapCategories('eat_and_drink', ['eat_and_drink'])).toEqual([
      'food', 'eat_and_drink'
    ]);
  });

  test('mapCategories preserves unknown alternates verbatim', () => {
    const cats = mapCategories('eat_and_drink.restaurant', ['weird_category']);
    expect(cats).toContain('food');
    expect(cats).toContain('eat_and_drink.restaurant');
    expect(cats).toContain('weird_category');
  });

  test('TOP_LEVEL is immutable', () => {
    expect(() => { TOP_LEVEL.foo = 'bar'; }).toThrow();
  });
});
