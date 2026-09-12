import type { SqlDriver } from "./driver.js";
import { type OrderBy, type Where } from "./query-builder.js";
import type { CreateInput, InferRow, Model, UpdateInput } from "./schema.js";
type FindManyArgs<Row> = {
    where?: Where<Row>;
    orderBy?: OrderBy<Row>;
    limit?: number;
    offset?: number;
};
type ModelClient<M extends Model> = {
    create(data: CreateInput<M>): Promise<InferRow<M>>;
    findMany(args?: FindManyArgs<InferRow<M>>): Promise<InferRow<M>[]>;
    findFirst(args?: FindManyArgs<InferRow<M>>): Promise<InferRow<M> | null>;
    update(args: {
        where: Where<InferRow<M>>;
        data: UpdateInput<M>;
    }): Promise<InferRow<M>[]>;
    delete(args: {
        where: Where<InferRow<M>>;
    }): Promise<InferRow<M>[]>;
};
export type Database<TModels extends Record<string, Model>> = {
    [K in keyof TModels]: ModelClient<TModels[K]>;
} & {
    $query<TRow = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<TRow[]>;
};
export declare function createDatabase<const TModels extends Record<string, Model>>(driver: SqlDriver, models: TModels): Database<TModels>;
export {};
