'use strict';

// GERS (Global Entity Reference System) helpers.
// GERS IDs are stable across Overture monthly releases for identity.
// We never overload Pelias `gid`; instead we build a `source_id` namespaced by
// theme and stash the raw GERS in `addendum.overture.gers` for downstream
// reconciliation.

const SOURCE = 'overture';

const LAYERS = Object.freeze({
  address: 'address',
  place: 'venue'
});

function isValidGers(id) {
  return typeof id === 'string' && id.length > 0 && id.length < 128;
}

function sourceIdFor(theme, gers) {
  if (!isValidGers(gers)) {
    throw new Error('invalid GERS id: ' + gers);
  }
  return 'overture:' + theme + ':' + gers;
}

module.exports = { SOURCE, LAYERS, isValidGers, sourceIdFor };
