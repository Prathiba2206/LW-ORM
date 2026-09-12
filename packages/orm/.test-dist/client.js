import { buildDelete, buildInsert, buildSelect, buildUpdate } from "./query-builder.js";
function modelClient(driver, model) {
    return {
        async create(data) {
            const query = buildInsert(model, data);
            const result = await driver.query(query.text, query.values);
            const row = result.rows[0];
            if (!row)
                throw new Error(`Insert into ${model.tableName} returned no row`);
            return row;
        },
        async findMany(args = {}) {
            const query = buildSelect(model, args);
            return (await driver.query(query.text, query.values)).rows;
        },
        async findFirst(args = {}) {
            const query = buildSelect(model, { ...args, limit: 1 });
            return (await driver.query(query.text, query.values)).rows[0] ?? null;
        },
        async update({ where, data }) {
            const query = buildUpdate(model, data, where);
            return (await driver.query(query.text, query.values)).rows;
        },
        async delete({ where }) {
            const query = buildDelete(model, where);
            return (await driver.query(query.text, query.values)).rows;
        },
    };
}
// Creates the database object. Pass in a driver and your models, and you get back
// a typed object where each key is a model name with full CRUD methods.
export function createDatabase(driver, models) {
    const database = {
        $query: async (text, values = []) => (await driver.query(text, values)).rows,
    };
    for (const [name, model] of Object.entries(models))
        database[name] = modelClient(driver, model);
    return database;
}
