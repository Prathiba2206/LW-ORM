import { createDatabase, defineDriver, type QueryResult } from "@prathiba/light-orm";
import { Todo } from "./models.js";

// ---------------------------------------------------------------------------
// In-memory SQL driver
//
// This parses the simple SQL that the ORM's query builder generates so the
// app can run without a real Postgres database. It's just for development
// and demo purposes — not meant to be a general-purpose SQL engine.
// ---------------------------------------------------------------------------

interface MemRow { [column: string]: unknown }

function createInMemoryDriver() {
  const tables = new Map<string, { rows: MemRow[]; nextId: number }>();

  function getTable(name: string) {
    if (!tables.has(name)) tables.set(name, { rows: [], nextId: 1 });
    return tables.get(name)!;
  }

  // Regexes that match the SQL patterns our query builder produces
  const RE_INSERT  = /^INSERT INTO "(\w+)" \((.+?)\) VALUES \((.+?)\) RETURNING \*$/;
  const RE_INSERT_DEFAULT = /^INSERT INTO "(\w+)" DEFAULT VALUES RETURNING \*$/;
  const RE_SELECT  = /^SELECT \* FROM "(\w+)"(.*)/;
  const RE_UPDATE  = /^UPDATE "(\w+)" SET (.+?) WHERE (.+?) RETURNING \*$/;
  const RE_DELETE  = /^DELETE FROM "(\w+)" WHERE (.+?) RETURNING \*$/;
  const RE_CREATE  = /^CREATE TABLE/i;

  function parseWhere(clause: string, values: readonly unknown[], offset: number): (row: MemRow) => boolean {
    const conditions = clause.split(" AND ").map((c) => c.trim());
    const filters: Array<(row: MemRow) => boolean> = [];
    for (const cond of conditions) {
      const isNull = cond.match(/^"(\w+)" IS NULL$/);
      if (isNull) { const col = isNull[1]; filters.push((r) => r[col] === null || r[col] === undefined); continue; }
      const eq = cond.match(/^"(\w+)" = \$(\d+)$/);
      if (eq) { const col = eq[1]; const idx = Number(eq[2]) - 1; filters.push((r) => r[col] === values[idx]); }
    }
    return (row) => filters.every((f) => f(row));
  }

  return defineDriver(async <TRow>(rawText: string, values: readonly unknown[] = []): Promise<QueryResult<TRow>> => {
    // Collapse whitespace so multi-line SQL (like CREATE TABLE) matches our regexes
    const text = rawText.replace(/\s+/g, " ").trim();

    // CREATE TABLE — nothing to do for in-memory, just succeed
    if (RE_CREATE.test(text)) return { rows: [] as TRow[], rowCount: 0 };

    // INSERT with columns
    let m = text.match(RE_INSERT);
    if (m) {
      const table = getTable(m[1]);
      const cols = m[2].split(", ").map((c) => c.replace(/"/g, ""));
      const row: MemRow = { id: table.nextId++ };
      cols.forEach((col, i) => { row[col] = values[i]; });
      if (row.completed === undefined) row.completed = false;
      table.rows.push(row);
      return { rows: [row as TRow], rowCount: 1 };
    }

    // INSERT DEFAULT VALUES
    m = text.match(RE_INSERT_DEFAULT);
    if (m) {
      const table = getTable(m[1]);
      const row: MemRow = { id: table.nextId++, completed: false };
      table.rows.push(row);
      return { rows: [row as TRow], rowCount: 1 };
    }

    // SELECT
    m = text.match(RE_SELECT);
    if (m) {
      const table = getTable(m[1]);
      let result = [...table.rows];
      const rest = m[2].trim();

      const whereMatch = rest.match(/^WHERE (.+?)(?:\s+ORDER BY|\s+LIMIT|\s+OFFSET|$)/);
      if (whereMatch) result = result.filter(parseWhere(whereMatch[1], values, 0));

      const orderMatch = rest.match(/ORDER BY (.+?)(?:\s+LIMIT|\s+OFFSET|$)/);
      if (orderMatch) {
        const orders = orderMatch[1].split(", ").map((o) => {
          const parts = o.trim().split(" ");
          return { col: parts[0].replace(/"/g, ""), dir: (parts[1] ?? "ASC").toUpperCase() };
        });
        result.sort((a, b) => {
          for (const { col, dir } of orders) {
            const av = a[col] as number, bv = b[col] as number;
            if (av < bv) return dir === "ASC" ? -1 : 1;
            if (av > bv) return dir === "ASC" ? 1 : -1;
          }
          return 0;
        });
      }

      const limitMatch = rest.match(/LIMIT (\d+)/);
      const offsetMatch = rest.match(/OFFSET (\d+)/);
      const offset = offsetMatch ? Number(offsetMatch[1]) : 0;
      if (offset) result = result.slice(offset);
      if (limitMatch) result = result.slice(0, Number(limitMatch[1]));

      return { rows: result as TRow[], rowCount: result.length };
    }

    // UPDATE
    m = text.match(RE_UPDATE);
    if (m) {
      const table = getTable(m[1]);
      const setParts = m[2].split(", ").map((s) => {
        const sm = s.match(/^"(\w+)" = \$(\d+)$/);
        return sm ? { col: sm[1], idx: Number(sm[2]) - 1 } : null;
      }).filter(Boolean) as Array<{ col: string; idx: number }>;

      const setCount = setParts.length;
      const predicate = parseWhere(m[3], values, setCount);

      const updated: MemRow[] = [];
      for (const row of table.rows) {
        if (predicate(row)) {
          for (const { col, idx } of setParts) row[col] = values[idx];
          updated.push({ ...row });
        }
      }
      return { rows: updated as TRow[], rowCount: updated.length };
    }

    // DELETE
    m = text.match(RE_DELETE);
    if (m) {
      const table = getTable(m[1]);
      const predicate = parseWhere(m[2], values, 0);
      const deleted: MemRow[] = [];
      table.rows = table.rows.filter((row) => {
        if (predicate(row)) { deleted.push(row); return false; }
        return true;
      });
      return { rows: deleted as TRow[], rowCount: deleted.length };
    }

    throw new Error(`In-memory driver cannot handle: ${text}`);
  });
}

// ---------------------------------------------------------------------------
// Pick the right driver based on whether DATABASE_URL is set
// ---------------------------------------------------------------------------

let pool: import("pg").Pool | null = null;

const connectionString = process.env.DATABASE_URL;

const driver = connectionString
  ? await (async () => {
      const pg = await import("pg");
      const { Pool } = pg.default ?? pg;
      pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
        max: 5,
        idleTimeoutMillis: 20_000,
      });
      return defineDriver(async <TRow>(text: string, values: readonly unknown[] = []) => {
        const result = await pool!.query(text, [...values]);
        return { rows: result.rows as TRow[], rowCount: result.rowCount ?? 0 };
      });
    })()
  : (() => {
      console.log("DATABASE_URL not set — using in-memory store (data will not persist across restarts)");
      return createInMemoryDriver();
    })();

export const db = createDatabase(driver, { todo: Todo });

export async function initializeDatabase() {
  await db.$query(`
    CREATE TABLE IF NOT EXISTS "todo" (
      "id" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "title" TEXT NOT NULL,
      "completed" BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
