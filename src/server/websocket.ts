import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { WsInboundMessage, SensorData } from '../shared/types.js'
import { devices, sensorHistory } from './routes/devices.js'

function generateSensorData(deviceId: string): SensorData {
  return {
    deviceId,
    temperature: (20 + Math.random() * 10).toFixed(1),
    humidity: (40 + Math.random() * 30).toFixed(1),
    voltage: (3.0 + Math.random() * 0.5).toFixed(2),
    timestamp: new Date().toISOString(),
  }
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsInboundMessage

        switch (msg.type) {
          case 'register':
            if (devices.has(msg.deviceId)) {
              ws.send(JSON.stringify({
                type: 'registered',
                deviceId: msg.deviceId,
                message: 'Device registered for real-time updates',
              }))
            }
            break

          case 'command': {
            if (!devices.has(msg.deviceId)) break
            const device = devices.get(msg.deviceId)!
            device.lastUpdate = new Date().toISOString()
            devices.set(msg.deviceId, device)

            const data = generateSensorData(msg.deviceId)
            const history = sensorHistory.get(msg.deviceId) ?? []
            history.push(data)
            if (history.length > 100) history.shift()
            sensorHistory.set(msg.deviceId, history)

            ws.send(JSON.stringify({ type: 'sensorData', data }))
            break
          }

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
            break
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    ws.on('error', console.error)
  })
}
