import type { InferRow, Model, Shape } from "./schema.js";
export interface SqlQuery {
    text: string;
    values: unknown[];
}
type Direction = "asc" | "desc";
export type Where<Row> = Partial<{
    [K in keyof Row]: Row[K];
}>;
export type OrderBy<Row> = Partial<Record<keyof Row, Direction>>;
export declare function buildInsert(model: Model<string, Shape>, data: Record<string, unknown>): SqlQuery;
export declare function buildSelect<M extends Model<string, Shape>>(model: M, args?: {
    where?: Where<InferRow<M>>;
    orderBy?: OrderBy<InferRow<M>>;
    limit?: number;
    offset?: number;
}): SqlQuery;
export declare function buildUpdate<M extends Model<string, Shape>>(model: M, data: Partial<InferRow<M>>, whereInput: Where<InferRow<M>>): SqlQuery;
export declare function buildDelete<M extends Model<string, Shape>>(model: M, whereInput: Where<InferRow<M>>): SqlQuery;
export {};
