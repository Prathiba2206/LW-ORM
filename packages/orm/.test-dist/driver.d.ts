export interface QueryResult<TRow = Record<string, unknown>> {
    rows: TRow[];
    rowCount: number;
}
export interface SqlDriver {
    query<TRow = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResult<TRow>>;
}
export type QueryFunction = <TRow = Record<string, unknown>>(text: string, values?: readonly unknown[]) => Promise<QueryResult<TRow>>;
export declare function defineDriver(query: QueryFunction): SqlDriver;
