# Architecture

## Why build it like this?

Honestly, I just wanted something that does typed CRUD without needing a codegen step. Prisma is cool but feels heavy for what I needed here. The whole ORM is like ~200 lines. That's it.

My bet was that TypeScript's type system is powerful enough to infer everything from a schema definition object. No `.prisma` files, no `npx generate`, none of that. You define your model, you get autocomplete. Done.

## Files

Here's what lives in `packages/orm/src/`:

**schema.ts** — Column types and `defineModel()`. Getting `CreateInput` right was annoying tbh. Had to use conditional types to figure out which fields should be optional (generated ones, ones with defaults) vs required. Went through a few iterations before it worked properly.

**driver.ts** — 12 lines. Wraps a query function. That's literally all it does.

**query-builder.ts** — Takes model info + your query args, returns SQL with `$1` placeholders. Zero side effects. This made testing way easier since I could just check the output strings.

**client.ts** — The `db.todo.create()` / `findMany()` etc. API. Calls query builder → calls driver → returns typed rows.

**index.ts** — Re-exports public stuff. The todo app only imports from here.

## What happens when you query

Ok so say you write:
```ts
db.todo.findMany({ where: { completed: false } })
```

Internally:
1. Client grabs model metadata
2. `buildSelect()` makes: `SELECT * FROM "todo" WHERE "completed" = $1`
3. The value `false` goes in the params array (never touched the SQL string)
4. Driver executes against Postgres
5. Rows come back with types

The SQL injection thing — I was careful here. Names get validated against `[a-z_][a-z0-9_]*` at definition time, then double-quoted in generated SQL. Values are always `$1`, `$2` etc. Wrote a specific test for it with a `'); DROP TABLE` payload lol.

## The type system part

This was the hard part honestly.

Every column has this phantom `_type` field. At runtime it's just `undefined`, but TypeScript uses it to know what JS type the column represents. Kind of a hack but it works really well.

`CreateInput` was particularly tricky. The logic is:
- `serial()` column → auto-generated → optional when creating
- `boolean({ default: false })` → has default → also optional
- `string()` → no default, not generated → required

So `db.todo.create({ title: "hi" })` compiles fine (id and completed are optional). But `db.todo.create({})` gives a TS error because title is missing. Took me a while to get the conditional types to split keys correctly.

The nice thing about `createDatabase(driver, { todo: Todo })` is that TS preserves the literal keys. So `db.todo` appears in autocomplete immediately, no codegen needed.

## Tradeoffs

Some stuff I deliberately skipped:

- **No runtime validation.** If Postgres returns weird data, we just trust it. Adding zod would be nice but felt out of scope.
- **UpdateInput is too permissive.** It's `Partial<Row>` which means technically you could try updating `id`. Making the types smarter here would've been a rabbit hole.
- **Only equality filters.** No `>`, `IN`, `LIKE`, `OR`. You'd need a whole filter AST for that.
- **Postgres only.** No plans for other DBs right now.

## Safety

Couple intentional choices:

Empty where on delete/update throws. I really didn't want to accidentally `DELETE FROM todo` with no condition. Same reasoning for requiring non-empty update data.

Express routes do their own input validation before calling any ORM methods.

## What's next (if I continued)

Filter operators first (the equality-only thing is limiting), then transactions, then maybe auto-migrations by comparing schema definitions to the actual DB. Joins/relations would be last because they'd basically require rewriting the query builder from scratch.
