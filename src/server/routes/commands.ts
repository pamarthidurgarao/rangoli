import { Router } from 'express'
import type { SendCommandRequest, CommandResult } from '../../shared/types.js'
import { devices } from './devices.js'

const router = Router()

const STATIC_RESPONSES: Record<string, CommandResult> = {
  LED_ON: { success: true, message: 'LED turned ON', output: 'OK' },
  LED_OFF: { success: true, message: 'LED turned OFF', output: 'OK' },
  RESTART: { success: true, message: 'Device rebooting...', output: 'Rebooting...' },
  GET_IP: { success: true, message: 'IP Address: 192.168.1.100', output: 'IP: 192.168.1.100\nGateway: 192.168.1.1' },
  WIFI_STATUS: { success: true, message: 'WiFi Connected | SSID: MyNetwork', output: 'SSID: MyNetwork\nRSSI: -45dBm\nChannel: 6' },
  DEEP_SLEEP: { success: true, message: 'Entering deep sleep mode...', output: 'Deep sleep: 60s' },
}

export function getCommandResponse(deviceId: string, command: string): CommandResult {
  const upper = command.toUpperCase()

  if (upper === 'STATUS') {
    return {
      success: true,
      message: 'Device status retrieved',
      output: `Device: ${deviceId} | Status: Online | Heap: 40960 | Uptime: ${Math.floor(Math.random() * 10000)}s`,
    }
  }

  if (upper === 'READ_SENSORS') {
    return {
      success: true,
      message: 'Sensor data retrieved',
      output: `Temp: ${(20 + Math.random() * 10).toFixed(1)}°C | Humidity: ${(40 + Math.random() * 30).toFixed(0)}% | Light: ${Math.floor(Math.random() * 1024)}`,
    }
  }

  return STATIC_RESPONSES[upper] ?? { success: false, message: 'Unknown command', output: 'ERROR: Unknown command' }
}

router.post('/', (req, res) => {
  const { deviceId, command } = req.body as SendCommandRequest

  if (!deviceId || !command) {
    res.status(400).json({ error: 'deviceId and command are required' })
    return
  }

  if (!devices.has(deviceId)) {
    res.status(404).json({ error: 'Device not found' })
    return
  }

  const device = devices.get(deviceId)!
  device.lastUpdate = new Date().toISOString()
  devices.set(deviceId, device)

  res.json(getCommandResponse(deviceId, command))
})

export default router
