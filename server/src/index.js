import app from "./app.js"
import { initializeMemory } from "./memory.js"

const port = Number(process.env.PORT || 3001)

await initializeMemory()

app.listen(port, "0.0.0.0", () => {
  console.log(`Backend Orizon attivo su http://localhost:${port}`)
})
