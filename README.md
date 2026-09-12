# Lightweight TypeScript ORM + Todo App

Small monorepo. Two packages — a custom ORM for Postgres and a todo app that demos it. Nothing fancy.

## Structure

```
packages/orm/       → ORM library
apps/todo-app/      → Express API + HTML frontend
```

## Running it

Need Node 20+. Database is optional.

```bash
npm install
npm run dev
```

Hit http://localhost:3000. Without `DATABASE_URL` it uses an in-memory driver (still runs through the ORM, just doesn't persist anything).

For real Postgres:
```bash
DATABASE_URL=postgresql://user:pass@host/db npm run dev
```

Table gets created on startup.

## ORM quick start

Define a model:

```ts
import { boolean, defineModel, serial, string } from "@prathiba/light-orm";

const Todo = defineModel("todo", {
  id: serial(),
  title: string(),
  completed: boolean({ default: false }),
});
```

Wire up a driver + create the db:

```ts
import { createDatabase, defineDriver } from "@prathiba/light-orm";

const driver = defineDriver(async (text, values) => {
  const result = await pool.query(text, values);
  return { rows: result.rows, rowCount: result.rowCount ?? 0 };
});

const db = createDatabase(driver, { todo: Todo });
```

Use it:

```ts
await db.todo.create({ title: "Finish assignment" });
await db.todo.findMany({ where: { completed: false }, orderBy: { id: "desc" } });
await db.todo.update({ where: { id: 1 }, data: { completed: true } });
await db.todo.delete({ where: { id: 1 } });
```

`id` is optional in create (auto-generated). `completed` too (has default). Types catch mistakes at compile time.

## Scripts

| Command | Does what |
|---|---|
| `npm run dev` | Todo app in watch mode |
| `npm run build` | Build everything |
| `npm run typecheck` | Type check, no emit |
| `npm test` | ORM unit tests |
| `npm start` | Run production build |

## What's missing

Being honest about limitations:

- Postgres only
- Equality filters + AND only. No `>`, `OR`, `IN`
- No joins, relations, transactions, migrations
- Update/delete need a where clause (intentional, prevents accidental table wipes)
- `$query` can't infer types from raw SQL
- Startup DDL is demo-quality, not production migrations

## Time

~8 hours total. Update before submitting.

## AI

Used AI for scaffolding and reviewing generics. Everything's been reviewed and I can explain any part.

## License

MIT
