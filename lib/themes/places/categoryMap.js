'use strict';

// Overture places category -> Pelias/OSM-style category mapping.
// Overture uses an extensive hierarchical taxonomy (see
// https://docs.overturemaps.org/schema/reference/places/place/). Pelias API
// consumers expect OSM-aligned broad categories such as `food`, `accommodation`,
// `retail`, `education`, `health`, `entertainment`.
//
// This map is deliberately coarse for v1. Unmapped categories pass through
// verbatim so API consumers get at least the raw Overture category and can
// refine it downstream. Refinements are tracked in docs/category-map.md.

const TOP_LEVEL = Object.freeze({
  eat_and_drink: 'food',
  accommodation: 'accommodation',
  shopping: 'retail',
  education: 'education',
  health_and_medical: 'health',
  arts_and_entertainment: 'entertainment',
  professional_services: 'professional',
  active_life: 'recreation',
  public_service_and_government: 'government',
  financial_service: 'finance',
  automotive: 'automotive',
  religious_organization: 'religion',
  travel: 'transport',
  beauty_and_spa: 'beauty',
  pets: 'pets',
  real_estate: 'real_estate',
  mass_media: 'media',
  structure_and_geography: 'geographic'
});

function resolveTopLevel(category) {
  if (!category) return null;
  // Overture categories look like `eat_and_drink` or `eat_and_drink.restaurant.italian`.
  const top = String(category).split('.')[0];
  return TOP_LEVEL[top] || null;
}

function mapCategories(primary, alternate) {
  const out = [];
  const seen = new Set();
  const add = (c) => {
    if (!c) return;
    const v = String(c);
    if (seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };

  const primaryMapped = resolveTopLevel(primary);
  if (primaryMapped) add(primaryMapped);
  if (primary) add(primary);

  if (Array.isArray(alternate)) {
    for (const a of alternate) {
      const mapped = resolveTopLevel(a);
      if (mapped) add(mapped);
      add(a);
    }
  }

  return out;
}

module.exports = { TOP_LEVEL, resolveTopLevel, mapCategories };
