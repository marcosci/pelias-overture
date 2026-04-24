'use strict';

// Python-CLI fallback reader.
// Spawns `overturemaps download` (pip install overturemaps) and streams the
// emitted GeoJSON FeatureCollection (or one-feature-per-line if the CLI is
// invoked with `--format geojsonseq`).
//
// Use when DuckDB is unavailable (e.g. an arch without prebuilt native
// bindings) or when pre-downloading to a local mirror.

const { spawn } = require('child_process');
const { Readable } = require('stream');
const { once } = require('events');

function args({ release, theme, type, bbox, format }) {
  const out = ['download', '--type', type, '--format', format || 'geojsonseq'];
  if (release) out.push('--release', release);
  if (bbox) {
    out.push('--bbox', bbox.join(','));
  }
  return out;
}

async function* geojsonseqLines(stream) {
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) yield line;
    }
  }
  const tail = buffer.trim();
  if (tail.length > 0) yield tail;
}

function featureToRow(feature) {
  if (!feature || feature.type !== 'Feature' || !feature.properties) return null;
  return Object.assign({}, feature.properties, {
    id: feature.id || feature.properties.id,
    geometry: feature.geometry
  });
}

async function* rowGenerator(opts) {
  const proc = spawn('overturemaps', args(opts), {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderrTail = '';
  proc.stderr.on('data', (d) => { stderrTail += d.toString('utf8'); });

  const exitPromise = once(proc, 'exit');

  try {
    for await (const line of geojsonseqLines(proc.stdout)) {
      let feature;
      try { feature = JSON.parse(line); } catch (_) { continue; }
      const row = featureToRow(feature);
      if (row) yield row;
    }
    const [code] = await exitPromise;
    if (code !== 0) {
      throw new Error(
        'overturemaps CLI exited with code ' + code + ': '
        + stderrTail.split('\n').slice(-5).join(' | ')
      );
    }
  } finally {
    if (!proc.killed) proc.kill();
  }
}

/**
 * Create a Readable object stream backed by the Python `overturemaps` CLI.
 * @param {object} opts
 * @param {string} opts.release - Overture release id (e.g. '2026-04-15.0').
 * @param {string} opts.theme   - Overture theme (used only for logging; CLI uses --type).
 * @param {string} opts.type    - Overture type (e.g. 'address', 'place').
 * @param {number[]} [opts.bbox] - [minLon, minLat, maxLon, maxLat].
 * @returns {Readable}
 */
function createCliStream(opts) {
  if (!opts.type) throw new Error('cliFallbackReader: opts.type required');
  return Readable.from(rowGenerator(opts), { objectMode: true, highWaterMark: 1000 });
}

module.exports = { createCliStream, featureToRow, args };
