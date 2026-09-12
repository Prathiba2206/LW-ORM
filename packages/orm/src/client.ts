import type { SqlDriver } from "./driver.js";
import { buildDelete, buildInsert, buildSelect, buildUpdate, type OrderBy, type Where } from "./query-builder.js";
import type { CreateInput, InferRow, Model, UpdateInput } from "./schema.js";

type FindManyArgs<Row> = { where?: Where<Row>; orderBy?: OrderBy<Row>; limit?: number; offset?: number };

// Each model gets one of these — it's the object you interact with (db.todo, db.project, etc.)
type ModelClient<M extends Model> = {
  create(data: CreateInput<M>): Promise<InferRow<M>>;
  findMany(args?: FindManyArgs<InferRow<M>>): Promise<InferRow<M>[]>;
  findFirst(args?: FindManyArgs<InferRow<M>>): Promise<InferRow<M> | null>;
  update(args: { where: Where<InferRow<M>>; data: UpdateInput<M> }): Promise<InferRow<M>[]>;
  delete(args: { where: Where<InferRow<M>> }): Promise<InferRow<M>[]>;
};

// The full database type — maps model names to their clients, plus a $query escape hatch
export type Database<TModels extends Record<string, Model>> = {
  [K in keyof TModels]: ModelClient<TModels[K]>
} & { $query<TRow = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<TRow[]> };

function modelClient<M extends Model>(driver: SqlDriver, model: M): ModelClient<M> {
  type Row = InferRow<M>;
  return {
    async create(data) {
      const query = buildInsert(model, data as Record<string, unknown>);
      const result = await driver.query<Row>(query.text, query.values);
      const row = result.rows[0];
      if (!row) throw new Error(`Insert into ${model.tableName} returned no row`);
      return row;
    },
    async findMany(args = {}) {
      const query = buildSelect(model, args);
      return (await driver.query<Row>(query.text, query.values)).rows;
    },
    async findFirst(args = {}) {
      const query = buildSelect(model, { ...args, limit: 1 });
      return (await driver.query<Row>(query.text, query.values)).rows[0] ?? null;
    },
    async update({ where, data }) {
      const query = buildUpdate(model, data, where);
      return (await driver.query<Row>(query.text, query.values)).rows;
    },
    async delete({ where }) {
      const query = buildDelete(model, where);
      return (await driver.query<Row>(query.text, query.values)).rows;
    },
  };
}

// Creates the database object. Pass in a driver and your models, and you get back
// a typed object where each key is a model name with full CRUD methods.
export function createDatabase<const TModels extends Record<string, Model>>(driver: SqlDriver, models: TModels): Database<TModels> {
  const database: Record<string, unknown> = {
    $query: async <TRow>(text: string, values: readonly unknown[] = []) => (await driver.query<TRow>(text, values)).rows,
  };
  for (const [name, model] of Object.entries(models)) database[name] = modelClient(driver, model);
  return database as Database<TModels>;
}
