# Dedup strategy vs existing Pelias sources

Overture addresses and places overlap substantially with OpenAddresses (OA)
and OpenStreetMap (OSM) data already ingested by Pelias. Running every source
uncritically produces duplicate hits for the same real-world feature.

This importer takes the **additive** default position: it adds Overture
records without silently removing OA/OSM records. Operators decide whether to
disable overlapping sources via existing Pelias importer configs.

## Guiding observations

- Overture POI coverage (per spot checks and
  [pelias/pelias#954](https://github.com/pelias/pelias/issues/954)) is uneven.
  Dropping OSM venues in favour of Overture is usually a regression.
- Overture addresses are largely sourced from OpenAddresses and national
  open datasets. For countries already well covered by OA in Pelias, running
  both yields near-complete duplicates.
- GERS IDs are stable across Overture releases but do not map to OA/OSM
  identifiers.

## In-run dedup

`lib/pipeline.js#createDedupeStream` drops repeat `source_id` values within a
single run. Source IDs are namespaced `overture:<theme>:<gers>`, so:

- Multiple rows for the same GERS across partitions dedupe.
- No effect on cross-source overlap (OA, OSM use different source + id).

## Recommended operator configs

### Option A — Overture as supplement (default)

```jsonc
{
  "imports": {
    "overture":     { "datapath": "...", "themes": { "addresses": { "enabled": true }, "places": { "enabled": true } } },
    "openaddresses": { "...": "..." },
    "openstreetmap": { "...": "..." }
  }
}
```

Expect duplicates in the result set. Pelias API dedup at query time
(per-result dedup, scoring) handles most of this. Ship as default.

### Option B — Overture addresses, OA/OSM venues

Turn off Overture places, keep OA and OSM:

```jsonc
"themes": {
  "addresses": { "enabled": true },
  "places":    { "enabled": false }
}
```

Reasonable until Overture POI coverage improves.

### Option C — Overture-only

Disable the OA and OSM importers. Accept Overture-only coverage limits.
Useful for tests or regions where Overture is clearly superior.

## Cross-source dedup (not in v1)

A future version may emit a hint field allowing the Pelias API layer to
collapse Overture + OA + OSM matches for the same real-world feature. This
requires a cross-source identity signal Pelias currently does not carry.
Tracked separately.
