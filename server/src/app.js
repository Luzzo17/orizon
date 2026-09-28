import express from "express"
import { randomUUID } from "node:crypto"
import { askAgent } from "./agent.js"
import { getMessages, saveMessages } from "./memory.js"

const app = express()
const pendingConversations = new Set()

// I dettagli del protocollo del modello rimangono nel database, non nel browser.
const visibleMessages = (messages) => messages.map(({ id, role, content }) => ({
  id, role, content,
}))

app.use(express.json({ limit: "16kb" }))

app.post("/chat", async (req, res) => {
  const { conversationId, message } = req.body ?? {}

  const validId =
    typeof conversationId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      conversationId
    )

  if (!validId) {
    return res.status(400).json({
      error: "Identificativo della conversazione non valido.",
    })
  }

  if (
    message !== undefined &&
    (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    )
  ) {
    return res.status(400).json({
      error: "Scrivi un messaggio tra 1 e 4000 caratteri.",
    })
  }

  if (pendingConversations.has(conversationId)) {
    return res.status(409).json({
      error: "Attendi la risposta al messaggio precedente.",
    })
  }

  pendingConversations.add(conversationId)

  try {
    const messages = getMessages(conversationId)

    if (message === undefined) {
      return res.json({ messages: visibleMessages(messages) })
    }

    if (messages.length >= 80) {
      return res.status(400).json({
        error: "Conversazione troppo lunga. Avvia una nuova chat.",
      })
    }

    const userMessage = {
      id: randomUUID(),
      role: "user",
      content: message.trim(),
    }

    const { reply, modelTurns } = await askAgent([...messages, userMessage])

    const updatedMessages = [
      ...messages,
      userMessage,
      {
        id: randomUUID(),
        role: "assistant",
        content: reply,
        modelTurns,
      },
    ]

    saveMessages(conversationId, updatedMessages)

    res.json({ messages: visibleMessages(updatedMessages) })
  } catch (error) {
    console.error("Errore chat:", {
      name: error.name,
      status: error.status,
      message: String(error.message).replaceAll(
        process.env.GROQ_API_KEY || "__nessuna_chiave__",
        "[CHIAVE NASCOSTA]"
      ),
    })

    const quotaExceeded = error.status === 429

    res.status(quotaExceeded ? 429 : 503).json({
      error: quotaExceeded
        ? "Quota Groq raggiunta. Riprova più tardi."
        : "Non riesco a completare la richiesta. Riprova.",
    })
  } finally {
    pendingConversations.delete(conversationId)
  }
})

export default app
