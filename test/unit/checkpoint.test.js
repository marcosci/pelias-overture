'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCheckpoint } = require('../../lib/util/checkpoint');

function tmpFile() {
  return path.join(os.tmpdir(), 'pov-ckpt-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.json');
}

describe('util/checkpoint', () => {
  test('returns no-op when no file configured', () => {
    const c = createCheckpoint(null);
    expect(c.isNoop).toBe(true);
    expect(c.has('anything')).toBe(false);
  });

  test('commits and recalls partition state', () => {
    const file = tmpFile();
    const c = createCheckpoint(file);
    expect(c.has('p1')).toBe(false);
    c.commit('p1', { rows: 42, theme: 'addresses' });
    expect(c.has('p1')).toBe(true);

    const c2 = createCheckpoint(file);
    expect(c2.has('p1')).toBe(true);
    expect(c2.list().p1.rows).toBe(42);
    fs.unlinkSync(file);
  });

  test('tolerates missing/corrupt files', () => {
    const file = tmpFile();
    fs.writeFileSync(file, 'not json');
    const c = createCheckpoint(file);
    expect(c.has('p1')).toBe(false);
    c.commit('p1', { rows: 1 });
    expect(c.has('p1')).toBe(true);
    fs.unlinkSync(file);
  });
});
