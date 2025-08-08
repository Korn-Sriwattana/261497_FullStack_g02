import "dotenv/config";
import { dbClient } from "@db/client.js";
import { todoTable, tagTable } from "@db/schema.js";
import cors from "cors";
import Debug from "debug";
import { eq, asc, desc, isNull } from "drizzle-orm";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { sql } from "drizzle-orm";
const debug = Debug("pf-backend");

//Intializing the express app
const app = express();

//Middleware
app.use(morgan("dev", { immediate: false }));
app.use(helmet());
app.use(
  cors({
    origin: false, // Disable CORS
    // origin: "*", // Allow all origins
  })
);
// Extracts the entire body portion of an incoming request stream and exposes it on req.body.
app.use(express.json());

// Query
// app.get("/todo", async (req, res, next) => {
//   try {
//     const results = await dbClient.query.todoTable.findMany();
//     res.json(results);
//   } catch (err) {
//     next(err);
//   }
// });

app.get("/tags", async (req, res, next) => {
  try {
    const tags = await dbClient.select().from(tagTable);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

app.post("/tags", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) throw new Error("Empty tag name");

    // เช็คว่าชื่อ tag ซ้ำหรือเปล่า (ใน tagTable)
    const existing = await dbClient
      .select()
      .from(tagTable)
      .where(eq(tagTable.name, name));

    if (existing.length > 0) throw new Error("Tag name already exists");

    const result = await dbClient
      .insert(tagTable)
      .values({ name })
      .returning({ id: tagTable.id, name: tagTable.name });
    res.json({ msg: "Tag added", data: result[0] });
  } catch (err) {
    next(err);
  }
});

// ดึง todo ทั้งหมด หรือ filter ตาม tagId ถ้ามี
app.get("/todo", async (req, res, next) => {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const tagId = req.query.tagId as string | undefined;

    let todos;

    if (tagId) {
      todos = await dbClient
        .select()
        .from(todoTable)
        .where((t) => eq(t.tagId, tagId))
        .orderBy(
          sortBy === "dueDate"
            ? asc(todoTable.dueDate)
            : desc(todoTable.createdAt)
        );
    } else {
      todos = await dbClient
        .select()
        .from(todoTable)
        .orderBy(
          sortBy === "dueDate"
            ? asc(todoTable.dueDate)
            : desc(todoTable.createdAt)
        );
    }

    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// Insert
app.put("/todo", async (req, res, next) => {
  try {
    console.log("Request Body:", req.body);
    const todoText = req.body.todoText ?? "";
    const tagId = req.body.tagId ?? null;
    const dueDate = req.body.dueDate ?? null;

    if (!todoText) throw new Error("Empty todoText");

    const result = await dbClient
      .insert(todoTable)
      .values({
        todoText,
        tagId,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning({
        id: todoTable.id,
        todoText: todoTable.todoText,
        tagId: todoTable.tagId,
        dueDate: todoTable.dueDate,
      });

    res.json({ msg: `Insert successfully`, data: result[0] });
  } catch (err) {
    next(err);
  }
});

// Update
app.patch("/todo", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    const todoText = req.body.todoText ?? "";
    const dueDate = req.body.dueDate ?? null;
    const tagId = req.body.tagId ?? null;

    if (!todoText || !id) throw new Error("Empty todoText or id");

    // ตรวจสอบว่ามี todo นี้อยู่หรือไม่
    const results = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (results.length === 0) throw new Error("Invalid id");

    // อัปเดตข้อมูล
    const result = await dbClient
      .update(todoTable)
      .set({
        todoText,
        dueDate: dueDate ? new Date(dueDate) : null,
        tagId,
      })
      .where(eq(todoTable.id, id))
      .returning({
        id: todoTable.id,
        todoText: todoTable.todoText,
        dueDate: todoTable.dueDate,
        tagId: todoTable.tagId,
      });

    res.json({ msg: `Update successfully`, data: result[0] });
  } catch (err) {
    next(err);
  }
});

// Delete
app.delete("/todo", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    if (!id) throw new Error("Empty id");

    // Check for existence if data
    const results = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (results.length === 0) throw new Error("Invalid id");

    await dbClient.delete(todoTable).where(eq(todoTable.id, id));
    res.json({
      msg: `Delete successfully`,
      data: { id },
    });
  } catch (err) {
    next(err);
  }
});
//ลบ Tag
app.delete("/tags/:id", function (req, res, next) {
  (async () => {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({ error: "Empty tag id" });
      }

      const tagExists = await dbClient
        .select()
        .from(tagTable)
        .where(eq(tagTable.id, id));
      if (tagExists.length === 0) {
        return res.status(404).json({ error: "Tag not found" });
      }

      const todosUsingTag = await dbClient
        .select()
        .from(todoTable)
        .where(eq(todoTable.tagId, id));
      if (todosUsingTag.length > 0) {
        return res.status(400).json({
          error: "Cannot delete tag because it is used by some todos",
        });
      }

      await dbClient.delete(tagTable).where(eq(tagTable.id, id));

      res.json({ msg: "Delete tag successfully", data: { id } });
    } catch (err) {
      next(err);
    }
  })();
});

app.post("/todo/all", async (req, res, next) => {
  // console.log("🔥 HIT /todo/all route");
  try {
    await dbClient.delete(todoTable);
    res.json({
      msg: `Delete all rows successfully`,
      data: {},
    });
  } catch (err) {
    next(err);
  }
});

app.post("/tags/unused", async (req, res, next) => {
  try {
    // ดึง tag ทั้งหมด
    const allTags = await dbClient.select().from(tagTable);

    // ดึง tag_id ที่ใช้อยู่ใน todo
    const usedTagIds = await dbClient
      .select({ tag_id: todoTable.tagId })
      .from(todoTable);

    const usedIdsSet = new Set(usedTagIds.map((t) => t.tag_id));

    // หา tag ที่ไม่ได้ถูกใช้
    const unusedTags = allTags.filter((tag) => !usedIdsSet.has(tag.id));

    // ลบ tag ที่ไม่ถูกใช้
    for (const tag of unusedTags) {
      await dbClient.delete(tagTable).where(eq(tagTable.id, tag.id));
    }

    res.json({
      msg: "Deleted unused tags successfully",
      deletedCount: unusedTags.length,
    });
  } catch (err) {
    next(err);
  }
});

app.patch("/todo/status", async (req, res, next) => {
  try {
    const { id, isDone } = req.body;

    if (!id || typeof isDone !== "boolean")
      throw new Error("Missing id or isDone");

    const result = await dbClient
      .update(todoTable)
      .set({ isDone })
      .where(eq(todoTable.id, id))
      .returning({ id: todoTable.id, isDone: todoTable.isDone });

    res.json({ msg: "Updated status", data: result[0] });
  } catch (err) {
    next(err);
  }
});

// JSON Error Middleware
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  debug(err.message);
  console.error(err);
  const errorResponse = {
    message: err.message || "Internal Server Error",
    type: err.name || "Error",
    stack: err.stack,
  };
  res.status(500).send(errorResponse);
};
app.use(jsonErrorHandler);

// Running app
const PORT = process.env.PORT || 3000;
// * Running app
app.listen(PORT, async () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
});
