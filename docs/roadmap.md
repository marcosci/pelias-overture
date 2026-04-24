# Roadmap

Tracked improvements beyond the initial alpha.

## Upstream integration

- [ ] PR to [`pelias/docker`](https://github.com/pelias/docker) adding an `overture` service + `pelias overture download|import` verbs.
- [ ] PR to [`pelias/cli`](https://github.com/pelias/cli) to register `overture` as a known importer.
- [ ] Update [`docs.pelias.io`](https://docs.pelias.io) with an Overture importer page.
- [ ] Transfer repo to the `pelias` org after alpha hardens.
- [ ] Publish to npm as `pelias-overture` under maintainer scope once stable.
- [ ] Comment on [`pelias/pelias#954`](https://github.com/pelias/pelias/issues/954) with the alpha announcement and request review.

## Data quality

- [ ] Align `lib/themes/places/categoryMap.js` with the `pelias/pelias-api` `/v1/categories` canonical list.
- [ ] Optional [`libpostal`](https://github.com/openvenues/libpostal) expansion for multilingual place names.
- [ ] Cross-source dedup (Overture ↔ OSM ↔ OpenAddresses). Requires a cross-source identity signal — likely a separate post-import pass.
- [ ] Feed Overture address points into [`pelias/interpolation`](https://github.com/pelias/interpolation) for house-number interpolation.

## Operational

- [ ] Partition-level (not just theme-level) checkpoint so a failing run resumes without re-reading completed parquet parts.
- [ ] Prometheus / statsd metrics endpoint covering reader throughput, transform drops, and dbclient back-pressure.
- [ ] Local-mirror benchmark run committed to [`docs/benchmark-results.md`](benchmark-results.md) alongside the S3 cold-read numbers.
- [ ] `linux/arm64` Docker image. Requires building DuckDB from source in CI (no prebuilt arm64 addon today).
- [ ] Data-quality report at end of run: dropped rows by reason, country distribution, confidence distribution.

## Scope boundaries

These will NOT ship from this repo:

- Divisions theme (Pelias relies on WOF for admin hierarchy; see `pelias/pelias#954`).
- Buildings, transportation, base themes (no geocoding signal).
- A Pelias API extension for `sources=overture` — that is an API-side change.
