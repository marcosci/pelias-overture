# Contributing

Thanks for taking the time to help.

## Development setup

```bash
git clone https://github.com/marcosci/pelias-overture.git
cd pelias-overture
npm install
cp pelias.json.example pelias.json
$EDITOR pelias.json
```

Node 20+ required.

## Tests

```bash
npm test                    # unit + integration + coverage
npm run test:unit           # fast; no native deps beyond DuckDB
npm run test:integration    # generates a local parquet fixture via DuckDB

# end-to-end against a real Pelias ES container (heavy, ~500 MB pull):
PELIAS_OVERTURE_E2E=1 npm run test:e2e
```

## Lint

```bash
npm run lint
npm run lint:fix
```

ESLint 9 flat config in [`eslint.config.js`](eslint.config.js).

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code change without behaviour change
- `test:` — tests only
- `ci:` — CI/CD
- `chore:` — housekeeping

## Pull requests

1. Fork, branch from `main`.
2. Add or update tests.
3. `npm test` green.
4. `npm run lint` green.
5. Open a PR referencing any relevant issues (e.g. `pelias/pelias#954`).
6. CI must pass before review.

## Scope

This repo is an importer: Overture Maps → Pelias `Document` → Elasticsearch. Out of scope:

- Changes to the Pelias API (`pelias/api`).
- Changes to the WOF admin hierarchy.
- Divisions theme (tracked in [`pelias/pelias#954`](https://github.com/pelias/pelias/issues/954) as WOF-side work).

## Releasing

Tag `vX.Y.Z` on `main` → `docker-publish` workflow pushes images to `ghcr.io/marcosci/pelias-overture`. npm publish is manual for now.

## Code of conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
