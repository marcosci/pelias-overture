'use strict';

// Partition planner.
// Given an Overture release root + theme + type, return a glob that the
// parquet reader can SELECT over. Overture layout:
//   <datapath>/theme=<theme>/type=<type>/*.parquet
// For S3: s3://<bucket>/release/<release>/theme=<theme>/type=<type>/*.parquet

const path = require('path');

function localGlob(datapath, theme, type) {
  return path.join(datapath, 'theme=' + theme, 'type=' + type, '*.parquet');
}

function s3Glob(s3, theme, type) {
  if (!s3 || !s3.bucket || !s3.release) {
    throw new Error('s3 config requires bucket and release');
  }
  return 's3://' + s3.bucket + '/release/' + s3.release
    + '/theme=' + theme + '/type=' + type + '/*.parquet';
}

function planPartition({ overture, theme, type }) {
  if (overture.s3 && overture.s3.enabled) {
    return s3Glob(overture.s3, theme, type);
  }
  return localGlob(overture.datapath, theme, type);
}

module.exports = { localGlob, s3Glob, planPartition };
