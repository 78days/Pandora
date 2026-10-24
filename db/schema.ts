import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { nanoid } from "nanoid"
import type { z } from "zod"

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

export const botsInsertSchema = createInsertSchema(bots, {
  name: (schema) => schema.trim().min(1, "Name is required."),
  job: (schema) => schema.trim().min(1, "Job is required."),
  avatar: (schema) => schema.min(1, "Pick a face."),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  sandboxId: true,
})

export type BotsInsert = z.infer<typeof botsInsertSchema>
