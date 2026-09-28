import { GoogleGenAI } from "@google/genai"
import { SYSTEM_PROMPT, EMISSIONS_TOOL } from "./system-prompt.js"
import { estimateEmissions, buildEcofreightRequest } from "./ecofreight.js"

if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
  throw new Error(
    "Configura GEMINI_API_KEY e GEMINI_MODEL nel file server/.env."
  )
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 30000,
  },
})

export async function askAgent(messages, {
  generate = (request) => ai.models.generateContent(request),
  estimate = estimateEmissions,
} = {}) {
  // Le vecchie chat contengono solo testo; le nuove conservano anche i tool.
  const contents = messages.flatMap((message) => {
    if (message.role === "assistant" && Array.isArray(message.modelTurns)) {
      return message.modelTurns
    }
    return [{
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }]
  })
  const modelTurns = []
  const results = new Map()

  // Limite di sicurezza contro richieste ripetute senza una risposta finale.
  for (let step = 0; step < 4; step++) {
    const response = await generate({
      model: process.env.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [EMISSIONS_TOOL] }],
        maxOutputTokens: 4000,
      },
    })
    const candidate = response.candidates?.[0]
    const content = candidate?.content
    if (candidate?.finishReason !== "STOP" || !content?.parts?.length) {
      throw new Error("Risposta Gemini vuota o incompleta.")
    }

    // Conserviamo tutto il Content, comprese le firme richieste da Gemini.
    contents.push(content)
    modelTurns.push(content)
    const calls = content.parts.filter((part) => part.functionCall)
      .map((part) => part.functionCall)

    if (!calls.length) {
      const reply = content.parts.filter((part) => !part.thought && part.text)
        .map((part) => part.text).join("\n").trim()
      if (!reply) throw new Error("Gemini non ha restituito una risposta testuale.")
      return { reply, modelTurns }
    }

    if (calls.length > 4 || step === 3) break
    const parts = []
    for (const call of calls) {
      let result
      try {
        if (call.name !== EMISSIONS_TOOL.name) {
          throw new Error("Funzione non supportata.")
        }
        const key = JSON.stringify(buildEcofreightRequest(call.args))
        if (!results.has(key)) {
          try {
            results.set(key, { ok: true, result: await estimate(call.args) })
          } catch (error) {
            results.set(key, { ok: false, error: error.message })
          }
        }
        result = results.get(key)
      } catch (error) {
        result = { ok: false, error: error.message }
      }
      parts.push({ functionResponse: {
        name: call.name,
        ...(call.id ? { id: call.id } : {}),
        response: result,
      } })
    }
    const toolTurn = { role: "user", parts }
    contents.push(toolTurn)
    modelTurns.push(toolTurn)
  }
  throw new Error("Troppi tentativi di calcolo. Riprova descrivendo un solo viaggio.")
}
