export interface QueryResult<TRow = Record<string, unknown>> { rows: TRow[]; rowCount: number; }

// The driver is intentionally minimal — it's just a function that takes SQL + params
// and gives back rows. This makes it easy to wrap pg, Neon, Supabase, etc.
export interface SqlDriver {
  query<TRow = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResult<TRow>>;
}

export type QueryFunction = <TRow = Record<string, unknown>>(
  text: string,
  values?: readonly unknown[],
) => Promise<QueryResult<TRow>>;

export function defineDriver(query: QueryFunction): SqlDriver { return { query }; }
