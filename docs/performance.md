# Performance tuning

Overture ingests are bound by four stages:

1. **Parquet read** — DuckDB scanning S3 or local partitions.
2. **Transform** — sync JS mapping row → Pelias `Document`.
3. **Admin lookup** — WOF polygon PIP lookups when `adminLookup: true`.
4. **Elasticsearch bulk write** — `pelias-dbclient`.

Transform is CPU-sync and fast. Reader and admin lookup dominate.

## Reader

Preferred: local mirror of the Overture release. S3 cold reads pay full
parquet metadata download per partition; a local NVMe mirror is roughly an
order of magnitude faster (see `docs/benchmark-results.md`).

```bash
aws s3 sync s3://overturemaps-us-west-2/release/2026-04-15.0/ /data/overture/2026-04-15.0/ \
  --exclude '*' --include 'theme=addresses/*' --include 'theme=places/*'
```

`imports.overture.datapath` + `s3.enabled: false` then points at `/data/overture/2026-04-15.0/`.

DuckDB honours `where` pushdown for:
- country (`country IN (...)`)
- bbox (`bbox.xmin/ymin/xmax/ymax`)
- places `confidence` threshold

These predicates cut row count inside DuckDB before rows cross into Node.

For CI or workflows where native DuckDB bindings are unavailable, set
`imports.overture.reader: "python"` and install the `overturemaps` CLI
(`pipx install overturemaps`). The fallback reader is ~2-3x slower and cannot
express the full predicate set (no per-field WHERE), but it is a drop-in
substitute.

## Admin lookup

`imports.overture.adminLookupConcurrency` (default 4) caps in-flight WOF
PIP calls per theme. Raise for beefy PIP services, lower for constrained
local setups. This setting is passed through to
`pelias-wof-admin-lookup.create({ maxConcurrentReqs })`; the shared
`imports.adminLookup.*` pelias.json block also still applies.

## Elasticsearch bulk write

`pelias-dbclient` honours its own config block
(`esclient.requestTimeout`, `imports.dbclient.batchSize`) directly from
`pelias.json`. This importer does not wrap those knobs. For Overture volume
(tens of millions of addresses per run), sensible starting points:

```jsonc
{
  "imports": {
    "dbclient": { "batchSize": 500 }
  },
  "esclient": {
    "requestTimeout": 120000,
    "keepAlive": true,
    "hosts": [{ "host": "elasticsearch", "port": 9200 }]
  }
}
```

Monitor ES rejected-bulk counters; halve `batchSize` if rejections appear.

## Expected throughput (rough)

On a developer laptop writing into a local single-node ES:

| Source | Expected rows/sec |
|---|---|
| DuckDB, local mirror, no adminLookup | 20 000 – 50 000 |
| DuckDB, local mirror, adminLookup on  | 3 000 – 10 000 |
| DuckDB, S3 cold                       | steady-state hard to characterise; dominated by HTTP warmup |
| Python CLI, local                     | 10 000 – 20 000 |

Replace with measured numbers after each benchmark run.

## Transform concurrency

The transform stage is pure-sync JavaScript. Wrapping it in
`pelias-parallel-stream` adds queue + flush overhead without speedup;
Node's single-threaded event loop runs sync work inline. Parallelism is
reserved for I/O stages (reader, admin lookup, dbclient).
