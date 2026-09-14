import type { QueryResult, QueryResultRow } from 'pg';

/**
 * Anything that can run a parameterised query. Structurally this is `pg`'s
 * common surface across `Pool`, a pooled `PoolClient` (inside a transaction) and
 * a one-shot `Client` (the operational CLI, which connects on the owner role).
 * Defining it once — as the shared `query` method rather than the union of
 * concrete classes — means every repository function serves a pooled call, a
 * transactional one and the CLI without a second signature, and without the
 * `exactOptionalPropertyTypes` friction of `Pool | PoolClient | Client`.
 */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<R>>;
}
