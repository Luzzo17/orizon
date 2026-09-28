import { DatabaseSync } from "node:sqlite"
import { mkdirSync } from "node:fs"

const dataDirectory = new URL("../data/", import.meta.url)
mkdirSync(dataDirectory, { recursive: true })

const database = new DatabaseSync(
  new URL("orizon.sqlite", dataDirectory)
)

database.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    messages TEXT NOT NULL
  )
`)

export function getMessages(conversationId) {
  const row = database
    .prepare("SELECT messages FROM conversations WHERE id = ?")
    .get(conversationId)

  return row ? JSON.parse(row.messages) : []
}

export function saveMessages(conversationId, messages) {
  database.prepare(`
    INSERT INTO conversations (id, messages)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET messages = excluded.messages
  `).run(conversationId, JSON.stringify(messages))
}