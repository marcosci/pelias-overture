'use strict';

// Geometry helpers.
// Overture geometry columns arrive from DuckDB as either GeoJSON objects
// (when selected via ST_AsGeoJSON) or WKB blobs. We standardise on GeoJSON
// at the parquet reader boundary; helpers here operate on GeoJSON.

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function isValidLonLat(lon, lat) {
  return isFiniteNumber(lon) && isFiniteNumber(lat)
    && lon >= -180 && lon <= 180
    && lat >= -90 && lat <= 90;
}

function pointCentroid(geometry) {
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const [lon, lat] = geometry.coordinates;
  if (!isValidLonLat(lon, lat)) return null;
  return { lon, lat };
}

function inBbox(centroid, bbox) {
  if (!bbox) return true;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return centroid.lon >= minLon && centroid.lon <= maxLon
    && centroid.lat >= minLat && centroid.lat <= maxLat;
}

module.exports = { isValidLonLat, pointCentroid, inBbox };
