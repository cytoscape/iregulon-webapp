/**
 * These fields come from env vars.
 *
 * Default values are specified in /.env
 *
 * You can normalise the values (e.g. with `parseInt()`, as all env vars are strings).
 */


// Node/Express config
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = parseInt(process.env.PORT, 10);
export const LOG_LEVEL = process.env.LOG_LEVEL;
export const BASE_URL = process.env.BASE_URL;
export const TESTING = ('' + process.env.TESTING).toLowerCase() === 'true';
export const REPORT_SECRET = process.env.REPORT_SECRET;

// Service config
export const IREGULON_JOB_SERVICE_URL = process.env.IREGULON_JOB_SERVICE_URL;
export const IREGULON_STATE_SERVICE_URL = process.env.IREGULON_STATE_SERVICE_URL;
export const IREGULON_RESULTS_SERVICE_URL = process.env.IREGULON_RESULTS_SERVICE_URL;
export const BRIDGEDB_URL = process.env.BRIDGEDB_URL;

export const MOTIF_RANKINGS_DATABASE = process.env.MOTIF_RANKINGS_DATABASE;
export const TRACK_RANKINGS_DATABASE = process.env.TRACK_RANKINGS_DATABASE;

// Mongo config
export const MONGO_URL = process.env.MONGO_URL;
export const MONGO_ROOT_NAME = process.env.MONGO_ROOT_NAME;

// Sentry config
export const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT;
export const SENTRY = NODE_ENV === 'production' || (SENTRY_ENVIRONMENT && SENTRY_ENVIRONMENT.startsWith('test'));