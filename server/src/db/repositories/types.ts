import type { Pool, PoolClient } from 'pg';

/**
 * Anything that can run a parameterised query: the request-path pool for a
 * single-statement call, or an open transaction client (`PoolClient`) when the
 * same repository function must run inside a caller's transaction. Defining it
 * once here means every repository function serves both a pooled call and a
 * transactional one without a second signature.
 */
export type Queryable = Pool | PoolClient;
