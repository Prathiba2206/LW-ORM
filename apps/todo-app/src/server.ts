import "dotenv/config";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, initializeDatabase } from "./database.js";
import { todoRoutes } from "./routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Figure out where the static files are relative to this script
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = process.env.NODE_ENV === "production"
  ? join(moduleDirectory, "public")
  : join(moduleDirectory, "../public");

app.use(express.json({ limit: "16kb" }));
app.use(express.static(publicDirectory));
app.use("/api/todos", todoRoutes);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Global error handler
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

// Start up: create tables if needed, then listen
await initializeDatabase();
const server = app.listen(port, () => console.log(`Todo app listening on http://localhost:${port}`));

// Shut down cleanly when we get a signal
process.on("SIGINT", () => server.close(() => closeDatabase().then(() => process.exit(0))));
process.on("SIGTERM", () => server.close(() => closeDatabase().then(() => process.exit(0))));
