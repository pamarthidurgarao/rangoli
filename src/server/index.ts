import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import devicesRouter from './routes/devices.js'
import commandsRouter from './routes/commands.js'
import { setupWebSocket } from './websocket.js'
import logger from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3001
const isProd = process.env.NODE_ENV === 'production'
const isVercel = !!process.env.VERCEL

const app = express()
app.use(express.json())
if (!isProd || isVercel) app.use(cors())

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'HTTP request')
  next()
})

app.use('/api/devices', devicesRouter)
app.use('/api/command', commandsRouter)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Static serving only for non-Vercel production (Vercel serves static files itself)
if (isProd && !isVercel) {
  const publicDir = path.join(__dirname, 'public')
  app.use(express.static(publicDir))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

// Skip persistent server in Vercel serverless environment
if (!isVercel) {
  const server = createServer(app)
  setupWebSocket(server)
  server.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Rangoli IoT Server started')
    logger.info(`  REST API: http://localhost:${PORT}/api`)
    logger.info(`  WebSocket: ws://localhost:${PORT}/ws`)
    if (isProd) logger.info(`  UI: http://localhost:${PORT}`)
  })
}

export default app
