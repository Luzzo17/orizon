import { SYSTEM_PROMPT, EMISSIONS_TOOL } from "./system-prompt.js"
import { estimateEmissions, buildEcofreightRequest } from "./ecofreight.js"

async function generateWithGroq(request) {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) throw new Error("Configura GROQ_API_KEY nel file server/.env.")
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000),
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error?.message || "Groq non disponibile.")
    error.status = response.status
    throw error
  }
  return data
}

export async function askAgent(messages, {
  generate = generateWithGroq,
  estimate = estimateEmissions,
} = {}) {
  const contents = [{ role: "system", content: SYSTEM_PROMPT }]
  for (const message of messages) {
    // Riprende i tool Groq; delle vecchie chat Gemini conserva il testo.
    const turns = message.modelTurns
    if (message.role === "assistant" && Array.isArray(turns) && turns.length &&
        turns.every((turn) => ["assistant", "tool"].includes(turn.role))) {
      contents.push(...turns)
    } else {
      contents.push({ role: message.role, content: message.content })
    }
  }
  const modelTurns = []
  const results = new Map()
  for (let step = 0; step < 4; step++) {
    const response = await generate({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: contents,
      tools: [{ type: "function", function: EMISSIONS_TOOL }],
      tool_choice: "auto",
      max_completion_tokens: 2000,
    })
    const candidate = response.choices?.[0]
    const message = candidate?.message
    if (!message || !["stop", "tool_calls"].includes(candidate.finish_reason)) {
      throw new Error("Risposta Groq vuota o incompleta.")
    }
    const calls = message.tool_calls || []
    const turn = { role: "assistant", content: message.content || null,
      ...(calls.length ? { tool_calls: calls } : {}) }
    contents.push(turn)
    modelTurns.push(turn)
    if (!calls.length) {
      const reply = message.content?.trim()
      if (!reply) throw new Error("Groq non ha restituito una risposta testuale.")
      return { reply, modelTurns }
    }
    if (calls.length > 4 || step === 3) break
    for (const call of calls) {
      let result
      try {
        if (call.function.name !== EMISSIONS_TOOL.name) throw new Error("Funzione non supportata.")
        const args = JSON.parse(call.function.arguments)
        const key = JSON.stringify(buildEcofreightRequest(args))
        if (!results.has(key)) {
          try {
            results.set(key, { ok: true, result: await estimate(args) })
          } catch (error) {
            results.set(key, { ok: false, error: error.message })
          }
        }
        result = results.get(key)
      } catch (error) {
        result = { ok: false, error: error.message }
      }
      const toolTurn = { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) }
      contents.push(toolTurn)
      modelTurns.push(toolTurn)
    }
  }
  throw new Error("Troppi tentativi di calcolo. Riprova descrivendo un solo viaggio.")
}
