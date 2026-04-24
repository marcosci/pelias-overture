# pelias-overture

A [Pelias](https://github.com/pelias/pelias) importer for [Overture Maps](https://overturemaps.org) data.

Streams Overture GeoParquet directly into Elasticsearch via [`pelias-dbclient`](https://github.com/pelias/dbclient), emitting normalised Pelias `Document` records with stable [GERS](https://docs.overturemaps.org/gers/) source identifiers.

Status: **alpha.** Addresses and places themes work end-to-end against the public Overture S3 mirror and local partition mirrors. Tracks [pelias/pelias#954](https://github.com/pelias/pelias/issues/954).

## Themes

| Theme     | Status | Notes |
|-----------|--------|-------|
| addresses | ✓      | Point addresses, country filter and bbox push-down into DuckDB. |
| places    | ✓      | POIs filtered by `minConfidence` (default 0.7) and optional category include/exclude. Multilingual names preserved. Runs additive to OSM venues by default. |
| divisions | —      | Out of scope. Pelias already relies on Who's on First for admin hierarchy; see [pelias/pelias#954](https://github.com/pelias/pelias/issues/954). |
| buildings, transportation, base | — | Out of scope for geocoding. |

## Install

```bash
git clone https://github.com/marcosci/pelias-overture.git
cd pelias-overture
npm install
cp pelias.json.example pelias.json
$EDITOR pelias.json
```

Requires Node 20+. DuckDB native bindings are installed automatically; if they fail (e.g. arch without prebuilt binaries), see the Python fallback below.

## Usage

```bash
./bin/start
```

Or via Docker Hub:

```bash
docker pull marcosci/pelias-overture:latest
docker run --rm \
  -v $(pwd)/pelias.json:/app/pelias.json:ro \
  -v /data/overture:/data/overture:ro \
  -e PELIAS_CONFIG=/app/pelias.json \
  marcosci/pelias-overture:latest
```

Tags published: `latest` (main), `vX.Y.Z` + `vX.Y` + `vX` on release, `sha-<short>` on every push.

Reads `pelias.json` via `pelias-config` and streams enabled themes through:

```
parquet reader → filter → transform → wof-admin-lookup → blacklist → dedupe → dbclient
```

## Configuration

Top-level keys under `imports.overture`:

| Key | Default | Description |
|---|---|---|
| `datapath` | — | Filesystem path to an Overture release, e.g. `/data/overture/2026-04-15.0`. |
| `s3` | `{ enabled: false }` | `{ enabled, bucket, region, release }` to read directly from Overture S3. |
| `reader` | `"duckdb"` | `"duckdb"` (primary) or `"python"` (spawn `overturemaps` CLI fallback). |
| `themes.addresses.enabled` | `true` | |
| `themes.places.enabled` | `true` | |
| `themes.places.minConfidence` | `0.7` | Drops POIs below this Overture confidence score. |
| `themes.places.categories.include` | `[]` | Whitelist of Overture category strings. |
| `themes.places.categories.exclude` | `[]` | Blacklist of Overture category strings. |
| `countryCode` | `[]` | ISO 3166-1 alpha-2 codes; empty = all. |
| `bbox` | — | `[minLon, minLat, maxLon, maxLat]` filter. |
| `adminLookup` | `true` | Attach WOF admin hierarchy via polygon PIP. |
| `adminLookupConcurrency` | `4` | Max in-flight PIP calls. |
| `deduplicate` | `true` | In-run dedupe on `source_id`. |
| `batchSize` | `500` | Reader batch size. |

See [`pelias.json.example`](pelias.json.example) for the full shape.

### Python fallback reader

When DuckDB is unavailable:

```bash
pipx install overturemaps
```

Set `imports.overture.reader: "python"` and `imports.overture.s3.release: "2026-04-15.0"`. The importer will spawn `overturemaps download` and consume the GeoJSON-seq stream instead of reading parquet directly. Expect ~2–3× slower throughput.

## Identity & identifiers

- `source` = `"overture"`
- `layer` = `"address"` (addresses) or `"venue"` (places)
- `source_id` = `"overture:<theme>:<gers>"` — stable across Overture monthly releases
- Raw GERS and upstream provenance kept at `addendum.overture` (gers, country, postal_city, sources, websites, phones, …)
- Pelias `gid` is derived normally from `source:layer:source_id` — Overture GERS never collides with Pelias `gid`.

## Dedup vs OSM / OpenAddresses

Overture overlaps substantially with OSM venues and OpenAddresses. This importer ships in **additive** mode: it never silently disables other sources. Operator-side strategies live in [`docs/dedup.md`](docs/dedup.md).

## Documentation

- [`docs/parquet-reader-decision.md`](docs/parquet-reader-decision.md) — DuckDB vs Python CLI vs hyparquet.
- [`docs/dedup.md`](docs/dedup.md) — cross-source dedup recommendations.
- [`docs/category-map.md`](docs/category-map.md) — Overture → Pelias category taxonomy.
- [`docs/performance.md`](docs/performance.md) — tuning for reader, admin lookup, and dbclient.
- [`docs/benchmark-results.md`](docs/benchmark-results.md) — measured throughput snapshots.

## Layout

```
bin/start                   CLI entry
lib/pipeline.js             admin lookup → blacklist → dedupe → dbclient
lib/sources/
  index.js                  reader dispatch (duckdb | python)
  parquetReader.js          DuckDB GeoParquet stream
  cliFallbackReader.js      overturemaps CLI GeoJSON-seq stream
  partitionPlanner.js       local + S3 partition enumeration
lib/themes/
  addresses/{index,transform,filter}.js
  places/{index,transform,filter,categoryMap}.js
lib/util/
  gers.js                   source_id helpers
  geometry.js               centroid + bbox helpers
schema.js                   joi config schema
scripts/benchmark-parquet-reader.js
test/unit, test/integration, test/e2e
```

## Tests

```bash
npm test                    # unit + integration, jest
npm run test:unit
npm run test:integration    # generates local parquet fixture via DuckDB
```

## Release

Tag pushes (`vX.Y.Z`) trigger the `docker-publish` workflow, which pushes multi-tag images to [`marcosci/pelias-overture`](https://hub.docker.com/r/marcosci/pelias-overture). Two repository secrets are required:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` — create via Docker Hub → Account Settings → Security → New Access Token (scoped: `Read, Write, Delete`).

Multi-arch (`linux/arm64`) is not published yet: the `duckdb` native addon ships prebuilt binaries for `linux/amd64` only. Adding `arm64` requires a cross-compile path that builds DuckDB from source.

## Attribution

Overture data is licensed under a mix of CDLA-Permissive-2.0 and ODbL depending on theme. See the [Overture data guide](https://docs.overturemaps.org/guides/) for attribution requirements. This importer preserves upstream `source_tags` at `addendum.overture.sources` so downstream consumers can honour them.

## License

MIT. See [`LICENSE`](LICENSE).
