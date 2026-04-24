'use strict';

// Partition-level checkpoint. Writes a JSON file mapping partition path ->
// { completed_at, rows } so subsequent runs can skip partitions already
// ingested. File is rewritten atomically (tmp + rename) after each commit.

const fs = require('fs');
const path = require('path');

function safeRead(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) { /* treat as empty */ }
  return {};
}

function atomicWrite(file, obj) {
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

function createCheckpoint(file) {
  if (!file) {
    return {
      has: () => false,
      commit: () => {},
      list: () => ({}),
      isNoop: true
    };
  }

  const state = safeRead(file);

  return {
    has(partition) {
      return Boolean(state[partition] && state[partition].completed_at);
    },
    commit(partition, meta = {}) {
      state[partition] = {
        completed_at: new Date().toISOString(),
        rows: typeof meta.rows === 'number' ? meta.rows : null,
        theme: meta.theme || null
      };
      atomicWrite(file, state);
    },
    list() {
      return { ...state };
    },
    isNoop: false
  };
}

module.exports = { createCheckpoint };
