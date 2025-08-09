import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

/** =======================
 *  TABLE: users
 *  เพิ่ม username/passwordHash/passwordSalt สำหรับ auth
 *  ======================= */
export const userTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique(), // ไม่บังคับ
  name: varchar("name", { length: 255 }),
  /** auth fields */
  username: varchar("username", { length: 100 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  passwordSalt: varchar("password_salt", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** =======================
 *  TABLE: tag
 *  ======================= */
export const tagTable = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

/** =======================
 *  TABLE: todo
 *  ownerId เป็นเจ้าของงาน ถ้าไม่ได้ login จะเป็น NULL
 *  ======================= */
export const todoTable = pgTable("todo", {
  id: uuid("id").primaryKey().defaultRandom(),
  todoText: varchar("todo_text", { length: 255 }).notNull(),
  isDone: boolean("is_done").default(false),
  tagId: uuid("tag_id").references(() => tagTable.id),
  ownerId: uuid("owner_id").references(() => userTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 }).$onUpdate(
    () => new Date()
  ),
  dueDate: timestamp("due_date", { mode: "date" }),
});
