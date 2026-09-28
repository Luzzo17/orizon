const STORAGE_KEY = "orizon-conversation-id"

export function getConversationId() {
  let id = localStorage.getItem(STORAGE_KEY)

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }

  return id
}

export function createConversation() {
  const id = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

async function requestChat(body) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Errore di collegamento al backend (${response.status}).`
    )
  }

  if (!Array.isArray(data?.messages)) {
    throw new Error("Il backend ha restituito una risposta non valida.")
  }

  return data.messages
}

export function loadConversation(conversationId) {
  return requestChat({ conversationId })
}

export function sendMessage(conversationId, message) {
  return requestChat({ conversationId, message })
}