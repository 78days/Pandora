"use server"

import { auth } from "@clerk/nextjs/server"

import { db } from "@/db"
import { bots, botsInsertSchema } from "@/db/schema"

export async function createBot(input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = botsInsertSchema.parse(input)

  const [bot] = await db
    .insert(bots)
    .values({ ...data, userId })
    .returning()

  return bot
}
