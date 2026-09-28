import { useEffect, useState } from "react"
import logoFull from "@/assets/LogoFull.png"

import {
  createConversation,
  getConversationId,
  loadConversation,
  sendMessage,
} from "@/services/chat-api"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai/conversation"

import {
  Message,
  MessageContent,
} from "@/components/ui/message"

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai/prompt-input"

export default function Chatbot() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [conversationId, setConversationId] = useState(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [restoreFailed, setRestoreFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      try {
        const id = getConversationId()
        const savedMessages = await loadConversation(id)

        if (!cancelled) {
          setConversationId(id)
          setMessages(savedMessages)
        }
      } catch (error) {
        if (!cancelled) {
          setError(error.message)
          setRestoreFailed(true)
        }
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [])

  function handleNewChat() {
    if (isLoading || isRestoring) return

    try {
      const id = createConversation()
      setConversationId(id)
      setMessages([])
      setText("")
      setError("")
      setRestoreFailed(false)
    } catch {
      setError("Non riesco a salvare la nuova chat nel browser.")
    }
  }

  async function handleSubmit({ text: submittedText }) {
    const content = submittedText.trim()

    if (!content || !conversationId || isLoading || isRestoring || restoreFailed) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const updatedMessages = await sendMessage(conversationId, content)
      setMessages(updatedMessages)
      setText("")
    } catch (error) {
      setError(error.message || "Invio non riuscito. Riprova.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto flex h-dvh w-full max-w-3xl flex-col p-4">
      <header className="border-b pb-4">
        <h1>
          <img src={logoFull} alt="Orizon" className="mb-2 h-30 w-auto max-w-full object-contain" />
        </h1>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={isLoading || isRestoring}
          className="styleOrizonBtn mt-3 h-15 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          Nuova chat
        </button>
      </header>

      {isRestoring && (
        <p role="status" className="py-2 text-sm text-muted-foreground">
          Recupero della conversazione…
        </p>
      )}

      <Conversation className="min-h-0">
        <ConversationContent>
          {!isRestoring && !restoreFailed && messages.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Da dove parti, dove vai, con quale mezzo e con quanti
              kg di bagagli?
            </p>
          )}

          {messages.map((message) => (
            <Message
              key={message.id}
              align={message.role === "user" ? "end" : "start"}
            >
              <MessageContent
                className={`max-w-[85%] rounded-xl p-4 ${
                  message.role === "user"
                    ? "bg-[#187761] text-white"
                    : "bg-muted"
                }`}
              >
                <span className="mb-1 text-xs font-bold">
                  {message.role === "user" ? "Tu" : "Orizon"}
                </span>

                <p className="whitespace-pre-wrap">
                  {message.content}
                </p>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>

        <ConversationScrollButton aria-label="Vai agli ultimi messaggi" />
      </Conversation>

      <div className="pt-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              disabled={isLoading || isRestoring || restoreFailed || !conversationId}
              aria-label="Descrivi il viaggio"
              placeholder="Milano–Parigi, in aereo, con 18 kg di bagagli…"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={4000}
              onPaste={(event) => {
                if (event.clipboardData.files.length > 0) {
                  event.preventDefault()
                }
              }}
            />
          </PromptInputBody>

          <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                className="bg-[#187761] text-white hover:bg-[#125b4a] disabled:bg-primary disabled:text-primary-foreground disabled:opacity-50"
                disabled={!text.trim() || isLoading || isRestoring || restoreFailed || !conversationId}
                status={isLoading ? "submitted" : "ready"}
                aria-label="Invia messaggio"
              />
          </PromptInputFooter>
        </PromptInput>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
