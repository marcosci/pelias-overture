# Category map

`lib/themes/places/categoryMap.js` translates Overture's
[places category taxonomy](https://docs.overturemaps.org/schema/reference/places/place/)
into broad Pelias/OSM-style categories.

## Output

For each place the transform emits:

1. A mapped top-level category (`food`, `retail`, `health`, ...) when
   recognised.
2. The raw Overture primary category verbatim (e.g. `eat_and_drink.restaurant.pizza`).
3. All alternate categories, mapped where possible, verbatim otherwise.

Consumers can search against either the mapped or the raw label.

## Top-level map (v1)

| Overture top-level          | Pelias category |
|----------------------------|-----------------|
| `eat_and_drink`            | `food`          |
| `accommodation`            | `accommodation` |
| `shopping`                 | `retail`        |
| `education`                | `education`     |
| `health_and_medical`       | `health`        |
| `arts_and_entertainment`   | `entertainment` |
| `professional_services`    | `professional`  |
| `active_life`              | `recreation`    |
| `public_service_and_government` | `government` |
| `financial_service`        | `finance`       |
| `automotive`               | `automotive`    |
| `religious_organization`   | `religion`      |
| `travel`                   | `transport`     |
| `beauty_and_spa`           | `beauty`        |
| `pets`                     | `pets`          |
| `real_estate`              | `real_estate`   |
| `mass_media`               | `media`         |
| `structure_and_geography`  | `geographic`    |

Anything not listed here falls back to the raw Overture label.

## Refining the map

Add new rows or rename targets in `TOP_LEVEL` in
`lib/themes/places/categoryMap.js`. Unit tests in
`test/unit/categoryMap.test.js` lock current behaviour.

Contributions welcome. Cases worth reviewing:

- Overture categories that fragment across several Pelias categories (e.g.
  `eat_and_drink.bar` arguably is `entertainment`, not just `food`).
- Pelias consumers that rely on finer OSM-style tags. If there is demand,
  add a second-level map.
