import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import devicesRouter from './routes/devices.js'
import commandsRouter from './routes/commands.js'
import { setupWebSocket } from './websocket.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3001
const isProd = process.env.NODE_ENV === 'production'

const app = express()
app.use(express.json())
if (!isProd) app.use(cors())

app.use('/api/devices', devicesRouter)
app.use('/api/command', commandsRouter)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

if (isProd) {
  const publicDir = path.join(__dirname, 'public')
  app.use(express.static(publicDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

const server = createServer(app)
setupWebSocket(server)

server.listen(PORT, () => {
  console.log(`Rangoli IoT Server running on port ${PORT}`)
  console.log(`  REST API: http://localhost:${PORT}/api`)
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`)
  if (isProd) console.log(`  UI: http://localhost:${PORT}`)
})

export default app
