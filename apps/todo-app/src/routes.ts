import { Router } from "express";
import { db } from "./database.js";

export const todoRoutes = Router();

// List todos, optionally filtered by status
todoRoutes.get("/", async (req, res, next) => {
  try {
    const filter = req.query.filter as string | undefined;
    const where =
      filter === "completed" ? { completed: true }
      : filter === "active" ? { completed: false }
      : undefined;
    const todos = await db.todo.findMany({ where, orderBy: { id: "desc" } });
    res.json(todos);
  } catch (error) { next(error); }
});

// Create a new todo
todoRoutes.post("/", async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title || title.length > 200) {
      res.status(400).json({ error: "Title must contain 1–200 characters." });
      return;
    }
    const todo = await db.todo.create({ title });
    res.status(201).json(todo);
  } catch (error) { next(error); }
});

// Toggle completed or update the title
todoRoutes.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { completed, title } = req.body || {};
    if (!Number.isInteger(id) || (completed === undefined && typeof title !== "string")) {
      res.status(400).json({ error: "A valid id and at least one of completed (boolean) or title (string) are required." });
      return;
    }
    const data: Record<string, unknown> = {};
    if (typeof completed === "boolean") data.completed = completed;
    if (typeof title === "string") data.title = title.trim();

    const updated = await db.todo.update({ where: { id }, data });
    if (!updated.length) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.json(updated[0]);
  } catch (error) { next(error); }
});

// Delete a todo by id
todoRoutes.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "A valid id is required." });
      return;
    }
    const deleted = await db.todo.delete({ where: { id } });
    if (!deleted.length) {
      res.status(404).json({ error: "Todo not found." });
      return;
    }
    res.status(204).end();
  } catch (error) { next(error); }
});
