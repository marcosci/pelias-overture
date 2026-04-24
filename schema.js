'use strict';

const Joi = require('joi');

// Config schema for `imports.overture.*` in pelias.json.
// Mirrors convention of other Pelias importer schemas (strict, fail-fast).
const schema = Joi.object().keys({
  imports: Joi.object().required().keys({
    overture: Joi.object().required().unknown(false).keys({
      datapath: Joi.string().required()
        .description('Filesystem path to Overture release root, e.g. /data/overture/2026-04-23.0'),

      s3: Joi.object().optional().keys({
        enabled: Joi.boolean().default(false),
        release: Joi.string().optional(),
        bucket: Joi.string().optional(),
        region: Joi.string().optional()
      }),

      themes: Joi.object().required().keys({
        addresses: Joi.object().required().keys({
          enabled: Joi.boolean().default(true)
        }),
        places: Joi.object().required().keys({
          enabled: Joi.boolean().default(true),
          minConfidence: Joi.number().min(0).max(1).default(0.7),
          categories: Joi.object().optional().keys({
            include: Joi.array().items(Joi.string()).default([]),
            exclude: Joi.array().items(Joi.string()).default([])
          })
        })
      }),

      countryCode: Joi.array().items(Joi.string().length(2).uppercase()).default([]),

      bbox: Joi.array().length(4).items(Joi.number()).optional()
        .description('Optional [minLon, minLat, maxLon, maxLat] filter'),

      parallelism: Joi.number().integer().min(1).max(64).default(4),
      adminLookupConcurrency: Joi.number().integer().min(1).max(64).default(4)
        .description('Max in-flight admin-lookup (WOF PIP) calls'),
      deduplicate: Joi.boolean().default(true),
      adminLookup: Joi.boolean().default(true),
      batchSize: Joi.number().integer().min(1).max(10000).default(500),
      reader: Joi.string().valid('duckdb', 'python').default('duckdb'),
      checkpointPath: Joi.string().optional()
        .description('Path to write partition-level checkpoint file for resumable imports')
    })
  }).unknown(true)
}).unknown(true);

function validate(config) {
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message).join('; ');
    throw new Error('invalid pelias.json: imports.overture — ' + details);
  }
  return value;
}

module.exports = { schema, validate };
