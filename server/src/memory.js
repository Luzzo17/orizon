import { createClient } from "@libsql/client/web"

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Configura TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.")
}

const database = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export async function initializeMemory() {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      messages TEXT NOT NULL
    )
  `)
}

export async function getMessages(conversationId) {
  const result = await database.execute({
    sql: "SELECT messages FROM conversations WHERE id = ?",
    args: [conversationId],
  })
  return result.rows.length ? JSON.parse(result.rows[0].messages) : []
}

export async function saveMessages(conversationId, messages) {
  await database.execute({
    sql: `INSERT INTO conversations (id, messages) VALUES (?, ?)
          ON CONFLICT(id) DO UPDATE SET messages = excluded.messages`,
    args: [conversationId, JSON.stringify(messages)],
  })
}
