import assert from "node:assert/strict";
import test from "node:test";
import { buildDelete, buildInsert, buildSelect, buildUpdate } from "./query-builder.js";
import { boolean, defineModel, serial, string } from "./schema.js";
const Todo = defineModel("todo", { id: serial(), title: string(), completed: boolean({ default: false }) });
test("insert generates correct parameterized SQL", () => {
    assert.deepEqual(buildInsert(Todo, { title: "Ship it", completed: false }), {
        text: 'INSERT INTO "todo" ("title", "completed") VALUES ($1, $2) RETURNING *', values: ["Ship it", false],
    });
});
test("select handles where, orderBy, and limit", () => {
    assert.deepEqual(buildSelect(Todo, { where: { completed: false }, orderBy: { id: "desc" }, limit: 10 }), {
        text: 'SELECT * FROM "todo" WHERE "completed" = $1 ORDER BY "id" DESC LIMIT 10', values: [false],
    });
});
test("update offsets the where placeholders after the set placeholders", () => {
    assert.deepEqual(buildUpdate(Todo, { completed: true }, { id: 7 }), {
        text: 'UPDATE "todo" SET "completed" = $1 WHERE "id" = $2 RETURNING *', values: [true, 7],
    });
});
test("blocks unfiltered update and delete to prevent accidents", () => {
    assert.throws(() => buildDelete(Todo, {}), /non-empty where/);
    assert.throws(() => buildUpdate(Todo, { title: "x" }, {}), /non-empty where/);
});
test("values go through placeholders, never interpolated into SQL", () => {
    const attack = "x'); DROP TABLE todo; --";
    const query = buildInsert(Todo, { title: attack });
    assert.equal(query.text, 'INSERT INTO "todo" ("title") VALUES ($1) RETURNING *');
    assert.deepEqual(query.values, [attack]);
});
