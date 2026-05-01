import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { WsInboundMessage, SensorData } from '../shared/types.js'
import { devices, sensorHistory } from './routes/devices.js'
import logger from './logger.js'

function generateSensorData(deviceId: string): SensorData {
  return {
    deviceId,
    temperature: (20 + Math.random() * 10).toFixed(1),
    humidity: (40 + Math.random() * 30).toFixed(1),
    voltage: (3.0 + Math.random() * 0.5).toFixed(2),
    timestamp: new Date().toISOString(),
  }
}

const BROADCAST_INTERVAL_MS = 3000

function broadcast(wss: WebSocketServer, payload: unknown): void {
  const msg = JSON.stringify(payload)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' })

  // Periodically push sensor data for all registered devices to all clients
  const broadcastTimer = setInterval(() => {
    if (wss.clients.size === 0 || devices.size === 0) return

    for (const [deviceId, device] of devices) {
      const data = generateSensorData(deviceId)

      const history = sensorHistory.get(deviceId) ?? []
      history.push(data)
      if (history.length > 100) history.shift()
      sensorHistory.set(deviceId, history)

      device.lastUpdate = data.timestamp
      devices.set(deviceId, device)

      logger.debug({ deviceId, clients: wss.clients.size }, 'Broadcasting sensor data')
      broadcast(wss, { type: 'sensorData', data })
    }
  }, BROADCAST_INTERVAL_MS)

  server.on('close', () => clearInterval(broadcastTimer))

  let clientCount = 0

  wss.on('connection', (ws: WebSocket, req) => {
    clientCount++
    const clientIp = req.socket.remoteAddress ?? 'unknown'
    const clientId = `ws-${clientCount}`
    logger.info({ clientId, clientIp, totalClients: wss.clients.size }, 'WebSocket client connected')

    // setInterval(() => {
    //   ws.send("Hello from local server");
    // }, 3000);

    ws.on('message', (raw) => {
      const rawStr = raw.toString()
      try {
        const msg = JSON.parse(rawStr) as WsInboundMessage
        logger.debug({ clientId, msg }, 'WebSocket message received')

        switch (msg.type) {
          case 'register':
            if (devices.has(msg.deviceId)) {
              logger.info({ clientId, deviceId: msg.deviceId }, 'Device registered for real-time updates')
              ws.send(JSON.stringify({
                type: 'registered',
                deviceId: msg.deviceId,
                message: 'Device registered for real-time updates',
              }))
            } else {
              logger.warn({ clientId, deviceId: msg.deviceId }, 'Register attempt for unknown device')
            }
            break

          case 'command': {
            if (!devices.has(msg.deviceId)) {
              logger.warn({ clientId, deviceId: msg.deviceId, command: msg.command }, 'Command for unknown device')
              break
            }
            logger.info({ clientId, deviceId: msg.deviceId, command: msg.command }, 'Command received via WebSocket')
            const device = devices.get(msg.deviceId)!
            device.lastUpdate = new Date().toISOString()
            devices.set(msg.deviceId, device)

            const data = generateSensorData(msg.deviceId)
            const history = sensorHistory.get(msg.deviceId) ?? []
            history.push(data)
            if (history.length > 100) history.shift()
            sensorHistory.set(msg.deviceId, history)

            logger.debug({ clientId, deviceId: msg.deviceId, data }, 'Sensor data generated and sent')
            ws.send(msg.command)
            break
          }

          case 'ping':
            logger.debug({ clientId }, 'Ping received, sending pong')
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
            break
        }
      } catch (err) {
        logger.error({ clientId, raw: rawStr, err }, 'Invalid WebSocket message')
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    ws.on('close', (code, reason) => {
      logger.info({ clientId, clientIp, code, reason: reason.toString(), totalClients: wss.clients.size }, 'WebSocket client disconnected')
    })

    ws.on('error', (err) => {
      logger.error({ clientId, clientIp, err }, 'WebSocket error')
    })
  })
}
