'use strict';

const { localGlob, s3Glob, planPartition } = require('../../lib/sources/partitionPlanner');

describe('sources/partitionPlanner', () => {
  test('localGlob joins release path with theme and type', () => {
    expect(localGlob('/data/overture/2026-04-23.0', 'addresses', 'address'))
      .toBe('/data/overture/2026-04-23.0/theme=addresses/type=address/*.parquet');
  });

  test('s3Glob builds s3 URI with bucket and release', () => {
    expect(s3Glob({ bucket: 'b', release: '2026-04-23.0' }, 'places', 'place'))
      .toBe('s3://b/release/2026-04-23.0/theme=places/type=place/*.parquet');
  });

  test('s3Glob throws without bucket or release', () => {
    expect(() => s3Glob({}, 'addresses', 'address')).toThrow();
    expect(() => s3Glob({ bucket: 'b' }, 'addresses', 'address')).toThrow();
  });

  test('planPartition picks s3 when s3.enabled', () => {
    const out = planPartition({
      overture: { s3: { enabled: true, bucket: 'b', release: 'r' }, datapath: '/unused' },
      theme: 'addresses',
      type: 'address'
    });
    expect(out.startsWith('s3://')).toBe(true);
  });

  test('planPartition picks local when s3.enabled=false', () => {
    const out = planPartition({
      overture: { s3: { enabled: false }, datapath: '/d' },
      theme: 'addresses',
      type: 'address'
    });
    expect(out).toBe('/d/theme=addresses/type=address/*.parquet');
  });
});
