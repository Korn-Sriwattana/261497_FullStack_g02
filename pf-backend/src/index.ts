import "dotenv/config";
import { dbClient } from "@db/client.js";
import { todoTable, tagTable, userTable } from "@db/schema.js";
import cors from "cors";
import Debug from "debug";
import { eq, asc, desc } from "drizzle-orm";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import crypto from "crypto";

const debug = Debug("pf-backend");

// ======================
// Minimal in-memory session store
// ======================
type Session = { userId: string; expiresAt: number };
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 วัน

function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}
function hashPassword(password: string, salt: string) {
  // ใช้ pbkdf2 ในตัว Node
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 32, "sha256")
    .toString("hex");
  return hash;
}
function createPassword(password: string) {
  const salt = randomId(16);
  const passwordHash = hashPassword(password, salt);
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password: string, salt: string, goodHash: string) {
  return hashPassword(password, salt) === goodHash; // ทั้งคู่เป็น hex string เหมือนกัน
}

function parseCookies(cookieHeader: string | undefined) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = k?.trim();
    if (!key) return;
    out[key] = decodeURIComponent(rest.join("=").trim());
  });
  return out;
}
function setSessionCookie(res: express.Response, sid: string) {
  // SameSite=Lax เพื่อให้ทำงานกับ nginx proxy ได้สะดวก
  res.setHeader(
    "Set-Cookie",
    `sid=${sid}; HttpOnly; Path=/; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}; SameSite=Lax`
  );
}
function clearSessionCookie(res: express.Response) {
  res.setHeader(
    "Set-Cookie",
    `sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

//Intializing the express app
const app = express();

//Middleware
app.use(morgan("dev", { immediate: false }));
app.use(helmet());
app.use(
  cors({
    origin: false, // Same-origin (ผ่าน NGINX) => cookie ทำงานได้ โดยไม่ต้องตั้ง CORS
  })
);
// Extracts the entire body portion of an incoming request stream and exposes it on req.body.
app.use(express.json());

// ======================
// Auth middleware: เติม req.user ถ้า sid ถูกต้อง
// ======================
app.use(async (req, _res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies["sid"];
    if (!sid) return next();

    const sess = sessions.get(sid);
    if (!sess) return next();

    if (Date.now() > sess.expiresAt) {
      sessions.delete(sid);
      return next();
    }

    // refresh session TTL เบาๆ
    sess.expiresAt = Date.now() + SESSION_TTL_MS;
    (req as any).authUserId = sess.userId;
    next();
  } catch (e) {
    next(e);
  }
});

// ======================
// AUTH ROUTES
// ======================

/** Register: {username, password} */
app.post("/auth/register", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) throw new Error("Missing username or password");

    // Check exist
    const exists = await dbClient
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.username, username));

    if (exists.length > 0) throw new Error("Username already exists");

    const { passwordHash, passwordSalt } = createPassword(password);

    const [user] = await dbClient
      .insert(userTable)
      .values({
        username,
        passwordHash,
        passwordSalt,
        // email/name ไม่บังคับ
      })
      .returning({
        id: userTable.id,
        username: userTable.username,
        createdAt: userTable.createdAt,
      });

    res.json({ msg: "Registered", user });
  } catch (err) {
    next(err);
  }
});

/** Login: {username, password} -> set cookie sid */
app.post("/auth/login", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) throw new Error("Missing username or password");

    const [user] = await dbClient
      .select({
        id: userTable.id,
        username: userTable.username,
        passwordHash: userTable.passwordHash,
        passwordSalt: userTable.passwordSalt,
      })
      .from(userTable)
      .where(eq(userTable.username, username));

    if (!user) throw new Error("Invalid credentials");

    const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const sid = randomId(24);
    sessions.set(sid, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    setSessionCookie(res, sid);

    res.json({
      msg: "Logged in",
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    next(err);
  }
});

/** Logout -> clear cookie */
app.post("/auth/logout", async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies["sid"];
    if (sid) sessions.delete(sid);
    clearSessionCookie(res);
    res.json({ msg: "Logged out" });
  } catch (err) {
    next(err);
  }
});

/** Me -> ตรวจ user ปัจจุบัน */
app.get("/auth/me", async (req, res, next) => {
  try {
    const userId = (req as any).authUserId as string | undefined;
    if (!userId) return res.json({ user: null });

    const [u] = await dbClient
      .select({ id: userTable.id, username: userTable.username })
      .from(userTable)
      .where(eq(userTable.id, userId));

    if (!u) return res.json({ user: null });

    res.json({ user: u });
  } catch (err) {
    next(err);
  }
});

// ======================
// TAG ROUTES
// ======================
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

// ======================
// TODO ROUTES
// ======================

// ดึง todo ทั้งหมด หรือ filter ตาม tagId ถ้ามี (เหมือนเดิม)
app.get("/todo", async (req, res, next) => {
  try {
    const sortBy = req.query.sortBy as string | undefined;
    const tagId = req.query.tagId as string | undefined;

    const qb = dbClient.select().from(todoTable);

    let rows;
    if (tagId) {
      rows = await qb
        .where(eq(todoTable.tagId, tagId))
        .orderBy(
          sortBy === "dueDate"
            ? asc(todoTable.dueDate)
            : desc(todoTable.createdAt)
        );
    } else {
      rows = await qb.orderBy(
        sortBy === "dueDate"
          ? asc(todoTable.dueDate)
          : desc(todoTable.createdAt)
      );
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Insert (ถ้า login จะใส่ ownerId ให้)
app.put("/todo", async (req, res, next) => {
  try {
    const todoText = req.body.todoText ?? "";
    const tagId = req.body.tagId ?? null;
    const dueDate = req.body.dueDate ?? null;
    if (!todoText) throw new Error("Empty todoText");

    const authUserId = (req as any).authUserId as string | undefined;

    const result = await dbClient
      .insert(todoTable)
      .values({
        todoText,
        tagId,
        ownerId: authUserId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning({
        id: todoTable.id,
        todoText: todoTable.todoText,
        tagId: todoTable.tagId,
        dueDate: todoTable.dueDate,
        ownerId: todoTable.ownerId,
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

// Toggle status (DONE/UNDONE)
app.patch("/todo/status", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    const isDone = req.body.isDone;

    if (!id || typeof isDone !== "boolean") {
      throw new Error("Missing id or invalid isDone");
    }

    const existing = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (existing.length === 0) throw new Error("Invalid id");

    const [updated] = await dbClient
      .update(todoTable)
      .set({ isDone })
      .where(eq(todoTable.id, id))
      .returning({
        id: todoTable.id,
        todoText: todoTable.todoText,
        isDone: todoTable.isDone,
        tagId: todoTable.tagId,
        dueDate: todoTable.dueDate,
        ownerId: todoTable.ownerId,
      });

    res.json({ msg: "Status updated", data: updated });
  } catch (err) {
    next(err);
  }
});

// Delete
app.delete("/todo", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    if (!id) throw new Error("Empty id");

    // Check for existence
    const results = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (results.length === 0) throw new Error("Invalid id");

    await dbClient.delete(todoTable).where(eq(todoTable.id, id));
    res.json({ msg: `Delete successfully`, data: { id } });
  } catch (err) {
    next(err);
  }
});

// ลบ Tag
app.delete("/tags/:id", function (req, res, next) {
  (async () => {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "Empty tag id" });

      const tagExists = await dbClient
        .select()
        .from(tagTable)
        .where(eq(tagTable.id, id));
      if (tagExists.length === 0)
        return res.status(404).json({ error: "Tag not found" });

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

// Utilities for tests
app.post("/todo/all", async (_req, res, next) => {
  try {
    await dbClient.delete(todoTable);
    res.json({ msg: `Delete all rows successfully`, data: {} });
  } catch (err) {
    next(err);
  }
});

app.post("/tags/unused", async (_req, res, next) => {
  try {
    const allTags = await dbClient.select().from(tagTable);
    const usedTagIds = await dbClient
      .select({ tag_id: todoTable.tagId })
      .from(todoTable);
    const usedIdsSet = new Set(usedTagIds.map((t) => t.tag_id));
    const unusedTags = allTags.filter((tag) => !usedIdsSet.has(tag.id));
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

// JSON Error Middleware
const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
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
app.listen(PORT, async () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
});
