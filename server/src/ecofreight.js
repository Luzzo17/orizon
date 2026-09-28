const API_URL = "https://api.ecofreight.co/api/v1/calculate"

// I quattro dati raccolti dall'assistente diventano la richiesta EcoFreight.
export function buildEcofreightRequest(trip) {
  if (!trip || typeof trip !== "object" || Array.isArray(trip)) {
    throw new Error("I dati del viaggio non sono validi.")
  }

  const { origin, destination, transportMode, weightKg } = trip

  for (const place of [origin, destination]) {
    if (typeof place !== "string" || !place.trim() || place.length > 200) {
      throw new Error("Specifica origine e destinazione valide.")
    }
  }

  if (!["air", "rail", "road", "sea"].includes(transportMode)) {
    throw new Error("Mezzo non supportato: usa aereo, treno, strada o nave.")
  }

  if (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 100000) {
    throw new Error("EcoFreight accetta un peso tra 1 e 100000 kg.")
  }

  return {
    origin: { query: origin.trim() },
    destination: { query: destination.trim() },
    cargo: { weight: weightKg, type: "general" },
    transport_mode: transportMode,
  }
}

export async function estimateEmissions(trip) {
  const payload = buildEcofreightRequest(trip)
  const apiKey = process.env.ECOFREIGHT_API_KEY

  if (!apiKey?.trim()) {
    throw new Error("Configura ECOFREIGHT_API_KEY nel file server/.env.")
  }

  // Il timeout copre sia la richiesta sia la lettura del corpo della risposta.
  let response
  let data
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })

    data = await response.json()
  } catch {
    throw new Error("EcoFreight non raggiungibile o risposta non leggibile. Riprova più tardi.")
  }

  if (!response.ok) {
    const errors = {
      400: "EcoFreight non accetta i dati del viaggio.",
      401: "Chiave EcoFreight non valida o scaduta.",
      403: "Accesso EcoFreight non autorizzato per questa chiave.",
      404: "EcoFreight non ha trovato la risorsa o il luogo richiesto.",
      422: "EcoFreight non supporta questa combinazione di dati.",
      429: "Quota EcoFreight raggiunta. Riprova più tardi.",
    }

    throw new Error(errors[response.status] || `EcoFreight non disponibile (HTTP ${response.status}).`)
  }

  // WTW è il valore restituito dal servizio in kg CO2 equivalente.
  // Non effettuiamo calcoli delle emissioni nel nostro codice.
  const co2eKg = data?.emissions?.wtw
  if (!Number.isFinite(co2eKg) || co2eKg < 0) {
    throw new Error("EcoFreight non ha restituito un valore WTW valido.")
  }

  return {
    origin: payload.origin.query,
    destination: payload.destination.query,
    transportMode: payload.transport_mode,
    weightKg: payload.cargo.weight,
    co2eKg,
    unit: "kg CO2e",
    scope: "Stima merci per i bagagli trattati come carico; non è l'impronta complessiva del passeggero. Sottotipo del veicolo determinato dal servizio.",
    provider: "EcoFreight",
    calculationId: data.calculation_id ?? null,
    distanceKm: Number.isFinite(data.calculation?.distance)
      ? data.calculation.distance
      : null,
    methodology: data.methodology ?? null,
  }
}
