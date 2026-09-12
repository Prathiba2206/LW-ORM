import assert from "node:assert/strict";
import test from "node:test";
import { boolean, createDatabase, defineDriver, defineModel, serial, string } from "./index.js";

const Todo = defineModel("todo", { id: serial(), title: string(), completed: boolean({ default: false }) });

test("model client runs the right SQL and gives back a typed row", async () => {
  const calls: Array<{ text: string; values: readonly unknown[] }> = [];
  // Fake driver that just records what SQL was sent and returns a dummy row
  const driver = defineDriver(async <TRow>(text: string, values: readonly unknown[] = []) => {
    calls.push({ text, values });
    return { rows: [{ id: 1, title: "Test", completed: false } as TRow], rowCount: 1 };
  });
  const db = createDatabase(driver, { todo: Todo });
  const todo = await db.todo.create({ title: "Test" });
  assert.equal(todo.id, 1);
  assert.deepEqual(calls[0], {
    text: 'INSERT INTO "todo" ("title") VALUES ($1) RETURNING *',
    values: ["Test"],
  });
});
