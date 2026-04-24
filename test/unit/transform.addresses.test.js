'use strict';

const { overtureAddressToDocument } = require('../../lib/themes/addresses/transform');

function row(overrides) {
  return Object.assign({
    id: 'gers-abc',
    geometry: { type: 'Point', coordinates: [13.4, 52.5] },
    number: '10',
    street: 'Unter den Linden',
    unit: null,
    postcode: '10117',
    country: 'DE',
    postal_city: 'Berlin',
    sources: [{ dataset: 'openaddresses', property: null }]
  }, overrides);
}

describe('addresses/transform', () => {
  test('returns null for missing id', () => {
    expect(overtureAddressToDocument(row({ id: '' }))).toBeNull();
    expect(overtureAddressToDocument(row({ id: null }))).toBeNull();
  });

  test('returns null for invalid geometry', () => {
    expect(overtureAddressToDocument(row({ geometry: null }))).toBeNull();
    expect(overtureAddressToDocument(row({
      geometry: { type: 'Point', coordinates: [200, 0] }
    }))).toBeNull();
  });

  test('returns null when no number and no street', () => {
    expect(overtureAddressToDocument(row({ number: null, street: null }))).toBeNull();
  });

  test('builds Document with expected source + layer + source_id', () => {
    const doc = overtureAddressToDocument(row());
    expect(doc.getSource()).toBe('overture');
    expect(doc.getLayer()).toBe('address');
    expect(doc.getSourceId()).toBe('overture:address:gers-abc');
  });

  test('sets centroid', () => {
    const doc = overtureAddressToDocument(row());
    const c = doc.getCentroid();
    expect(c.lon).toBe(13.4);
    expect(c.lat).toBe(52.5);
  });

  test('sets address components', () => {
    const doc = overtureAddressToDocument(row());
    expect(doc.getAddress('number')).toBe('10');
    expect(doc.getAddress('street')).toBe('Unter den Linden');
    expect(doc.getAddress('zip')).toBe('10117');
  });

  test('stores country + postal_city in addendum (admin-lookup owns hierarchy)', () => {
    const doc = overtureAddressToDocument(row());
    const addendum = doc.getAddendum('overture');
    expect(addendum.country).toBe('DE');
    expect(addendum.postal_city).toBe('Berlin');
  });

  test('sets unit when present', () => {
    const doc = overtureAddressToDocument(row({ unit: '4B' }));
    expect(doc.getAddress('unit')).toBe('4B');
  });

  test('sets default name from number + street', () => {
    const doc = overtureAddressToDocument(row());
    expect(doc.getName('default')).toBe('10 Unter den Linden');
  });

  test('survives missing postcode/country/city', () => {
    const doc = overtureAddressToDocument(row({
      postcode: null, country: null, postal_city: null
    }));
    expect(doc).not.toBeNull();
    expect(doc.getAddress('zip')).toBeUndefined();
    const addendum = doc.getAddendum('overture');
    expect(addendum.country).toBeNull();
    expect(addendum.postal_city).toBeNull();
  });

  test('stores GERS id in addendum', () => {
    const doc = overtureAddressToDocument(row());
    const addendum = doc.getAddendum('overture');
    expect(addendum.gers).toBe('gers-abc');
    expect(addendum.theme).toBe('addresses');
  });

  test('handles number-only rows', () => {
    const doc = overtureAddressToDocument(row({ street: null }));
    expect(doc).not.toBeNull();
    expect(doc.getName('default')).toBe('10');
  });

  test('uppercases country code in addendum', () => {
    const doc = overtureAddressToDocument(row({ country: 'de' }));
    expect(doc.getAddendum('overture').country).toBe('DE');
  });
});
