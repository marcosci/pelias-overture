'use strict';

const { overturePlaceToDocument } = require('../../lib/themes/places/transform');

function row(overrides) {
  return Object.assign({
    id: 'gers-place-1',
    geometry: { type: 'Point', coordinates: [-73.98, 40.75] },
    names: {
      primary: 'Joes Pizza',
      common: { en: 'Joes Pizza', es: 'Pizza de Joe' },
      rules: [{ language: 'it', value: 'Pizzeria Giuseppe' }]
    },
    categories: {
      primary: 'eat_and_drink.restaurant.pizza',
      alternate: ['eat_and_drink']
    },
    confidence: 0.92,
    websites: ['https://joespizza.example'],
    phones: ['+12125551212'],
    addresses: [{ freeform: '7 Carmine St', country: 'US', postcode: '10014' }],
    sources: [{ dataset: 'msft', property: 'places' }]
  }, overrides);
}

describe('places/transform', () => {
  test('returns null without GERS id', () => {
    expect(overturePlaceToDocument(row({ id: '' }))).toBeNull();
  });

  test('returns null without geometry', () => {
    expect(overturePlaceToDocument(row({ geometry: null }))).toBeNull();
  });

  test('returns null without primary name', () => {
    expect(overturePlaceToDocument(row({ names: null }))).toBeNull();
    expect(overturePlaceToDocument(row({ names: { primary: '' } }))).toBeNull();
  });

  test('drops rows below minConfidence', () => {
    expect(overturePlaceToDocument(row({ confidence: 0.3 }), { minConfidence: 0.7 })).toBeNull();
  });

  test('accepts rows with no confidence field', () => {
    expect(overturePlaceToDocument(row({ confidence: null }), { minConfidence: 0.7 }))
      .not.toBeNull();
  });

  test('produces Document with source=overture, layer=venue', () => {
    const doc = overturePlaceToDocument(row());
    expect(doc.getSource()).toBe('overture');
    expect(doc.getLayer()).toBe('venue');
    expect(doc.getSourceId()).toBe('overture:place:gers-place-1');
  });

  test('sets default name and language aliases', () => {
    const doc = overturePlaceToDocument(row());
    expect(doc.getName('default')).toBe('Joes Pizza');
    expect(doc.getName('en')).toBe('Joes Pizza');
    expect(doc.getName('es')).toBe('Pizza de Joe');
  });

  test('maps categories through top-level map', () => {
    const doc = overturePlaceToDocument(row());
    expect(doc.category).toContain('food');
    expect(doc.category).toContain('eat_and_drink.restaurant.pizza');
  });

  test('parses freeform address into number + street', () => {
    const doc = overturePlaceToDocument(row());
    expect(doc.getAddress('number')).toBe('7');
    expect(doc.getAddress('street')).toBe('Carmine St');
    expect(doc.getAddress('zip')).toBe('10014');
  });

  test('sets popularity from confidence', () => {
    const doc = overturePlaceToDocument(row());
    expect(doc.getPopularity()).toBe(Math.round(0.92 * 1e6));
  });

  test('stores raw metadata in addendum', () => {
    const doc = overturePlaceToDocument(row());
    const a = doc.getAddendum('overture');
    expect(a.gers).toBe('gers-place-1');
    expect(a.theme).toBe('places');
    expect(a.confidence).toBe(0.92);
    expect(a.websites).toEqual(['https://joespizza.example']);
    expect(a.phones).toEqual(['+12125551212']);
  });
});
