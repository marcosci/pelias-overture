# Changelog

All notable changes to this project will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Addresses theme end-to-end:
  - DuckDB-backed GeoParquet reader with GeoJSON geometry decoding.
  - Local + S3 partition planner.
  - Row → Pelias `Document` transform; stable `source_id = "overture:address:<gers>"`.
  - Country + bbox filter push-down into DuckDB.
- Places theme end-to-end:
  - Multilingual name handling (primary + `common.<lang>` + rules).
  - Overture → Pelias category map (18 top-level entries; unmapped passthrough).
  - `minConfidence` filter (default 0.7); category include/exclude.
  - POI addresses parsed from `addresses[0].freeform` into number/street.
- Central pipeline: `wof-admin-lookup` → `blacklist-stream` → in-run dedupe → `dbclient`.
- Python fallback reader (`imports.overture.reader: "python"`) that spawns `overturemaps` CLI and streams GeoJSON-seq.
- Joi config schema (`schema.js`) with strict validation.
- CLI entrypoint (`bin/start`), Dockerfile, docker-compose.yml, GitHub Actions CI.
- Benchmark script (`scripts/benchmark-parquet-reader.js`).
- Test suite: 77 unit tests + 2 integration tests over a locally generated parquet fixture.
- Docs: parquet-reader decision, dedup strategy, category map, performance tuning, benchmark results.
