// These aren't runtime tests — they just make sure the types work correctly.
// If any of the @ts-expect-error lines stop erroring, that means a type
// constraint broke and we need to fix it.

import { boolean, createDatabase, defineDriver, defineModel, serial, string } from "./index.js";

const Todo = defineModel("todo", { id: serial(), title: string(), completed: boolean({ default: false }) });
const driver = defineDriver(async () => ({ rows: [], rowCount: 0 }));
const db = createDatabase(driver, { todo: Todo });

if (false) {
  // These should compile fine
  void db.todo.create({ title: "typed" });
  void db.todo.findMany({ where: { completed: false } });

  // @ts-expect-error "imaginary" isn't a real column
  void db.todo.create({ title: "typed", imaginary: true });

  // @ts-expect-error completed should be boolean, not string
  void db.todo.findMany({ where: { completed: "no" } });
}
