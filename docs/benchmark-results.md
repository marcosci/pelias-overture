# Benchmark results

## Run 1 — S3 cold read, end-to-end smoke

- Date: 2026-04-24
- Machine: macOS darwin 25.1.0 (developer laptop)
- Source: `s3://overturemaps-us-west-2/release/2026-04-15.0/theme=addresses/type=address/*` (42 parquet files, ~28 GB total)
- Query: `SELECT id, geometry, number, street, country, postcode, postal_city FROM read_parquet(...) WHERE country = 'LI' LIMIT 50`
- DuckDB: `@duckdb/node-api` 1.5.2-r.1 with `httpfs` + `spatial` extensions
- Result:

| Metric | Value |
|---|---|
| Rows | 50 |
| Elapsed | 328 s |
| Rows/sec | ~0.15 |
| Peak RSS | 568 MB |
| RSS delta | 516 MB |

Interpretation: DuckDB scans the partition footprint over HTTP without the
GeoParquet row-group row-count metadata short-circuit, so filter pushdown
only prunes at read time — full metadata download dominates runtime.
The number `0.15 rows/sec` reflects total elapsed divided by 50; it is not a
steady-state throughput number.

The test confirms correctness end-to-end:
- GEOMETRY column decoded to GeoJSON Points.
- Country predicate pushed into the SELECT clause executes.
- Memory footprint stays under 1 GB target (588 MB peak).

## Pending benchmarks

1. **Local NVMe, single full partition (~700 MB, ~30M rows)**: measures
   steady-state rows/sec after S3 latency is removed.
2. **Local NVMe, full addresses release**: end-to-end time + RSS for a
   realistic operator run.
3. **Docker image cold start on x86_64 linux (CI runner)**: parity check
   with developer laptop.
4. **Python `overturemaps` fallback reader**: same local fixture, same
   row count; direct throughput comparison.

Commit each result back to this file under a new `## Run N` section.
