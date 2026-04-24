# GeoParquet Reader Decision

Status: proposed (Phase 0). Benchmark pending.

## Context

Overture Maps publishes monthly releases as partitioned GeoParquet on S3/Azure.
This importer must stream rows without loading partitions into memory. Pelias is a
Node.js ecosystem; GeoParquet tooling in Node is weaker than in Python/Rust.

## Options

### 1. DuckDB (primary candidate)

- Package: `duckdb` (official Node bindings).
- Pros:
  - Mature C++ Parquet reader with predicate + column pushdown.
  - Native S3/httpfs support — reads `s3://overturemaps-us-west-2/...` directly.
  - Spatial extension available if polygon work is ever needed.
  - SQL filter layer lets us push `countryCode`, `bbox`, `minConfidence`,
    category include/exclude down into the reader, discarding rows before they
    hit the Node heap.
  - Single binary dependency; no Python runtime required.
- Cons:
  - `duckdb` Node bindings stream via `each`/`stream` APIs with some quirks;
    correct backpressure wiring is non-trivial.
  - Native addon — adds binary weight to the Docker image (~50 MB).
  - Does not understand GeoParquet metadata natively on every column type;
    geometry column returned as WKB blob, which we decode row-side.

### 2. `hyparquet` (pure JS)

- Package: `hyparquet` + `hyparquet-compressors`.
- Pros:
  - Pure JS, no native build.
  - Good for small on-device parquet reads.
- Cons:
  - Missing or incomplete support for several Parquet features Overture uses
    (LIST with nested STRUCT, complex nested columns for `names.rules`).
  - No filter pushdown, no predicate evaluation.
  - Significantly slower on Overture-scale data.
- Verdict: non-starter for v1.

### 3. Python `overturemaps` CLI via `child_process`

- Tool: `pip install overturemaps`, invoked as `overturemaps download ...`.
- Pros:
  - First-party tool maintained by Overture — guaranteed schema alignment.
  - Can pre-convert partitions to NDJSON/GeoJSON that Node streams trivially.
- Cons:
  - Adds Python as a deployment dependency (bloats Docker image further).
  - Slower end-to-end — serializes through GeoJSON rather than typed columns.
  - Harder to push filters beyond country/bbox.
- Verdict: keep as fallback / verification path. Useful for CI fixture
  generation and for dev machines where DuckDB build fails.

### 4. Pre-convert to GeoJSON/NDJSON out-of-band

- Pros: simplest Node code path.
- Cons: doubles disk footprint; user must run a separate prep step; breaks
  streaming direct-from-S3.
- Verdict: not default; support via option 3 tooling.

## Decision (pending benchmark)

**Primary: DuckDB.** Use `read_parquet(...)` with a glob over the partition path,
a SQL `WHERE` clause that captures `countryCode`, `bbox`, and theme-specific
filters, and stream results row-by-row into the Node pipeline.

**Fallback: Python `overturemaps` CLI.** When `imports.overture.reader='python'`
is set, spawn the CLI and stream NDJSON. Also used to generate test fixtures.

## Benchmark plan

Before finalising Phase 0:

1. Grab a sample Overture addresses partition (~5 M rows, one country).
2. Measure for each candidate:
   - Rows/sec delivered to pipeline head.
   - Peak RSS.
   - CPU utilisation.
   - Time-to-first-row (for responsiveness of CLI tools).
3. Run on Mac M-series (developer target) and on Linux x86_64 (CI target).
4. Commit `scripts/benchmark-parquet-reader.js` and a `docs/benchmark-results.md`
   snapshot.

## Interfaces

`lib/sources/parquetReader.js` exports:

```js
createParquetStream({
  path,         // fs path or s3 URI
  columns,      // array of column names
  where,        // SQL predicate string (DuckDB) / noop (CLI fallback)
  batchSize     // rows per chunk
}) -> Readable  // object-mode, emits row objects
```

Implementation is swappable per config. Transform/pipeline code stays
reader-agnostic.
