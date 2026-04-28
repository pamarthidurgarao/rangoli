import { Router } from 'express'
import type { Device, RegisterDeviceRequest, SensorData } from '../../shared/types.js'

const router = Router()

export const devices = new Map<string, Device>()
export const sensorHistory = new Map<string, SensorData[]>()

router.get('/', (_req, res) => {
  res.json(Array.from(devices.values()))
})

router.post('/', (req, res) => {
  const { deviceId, name } = req.body as RegisterDeviceRequest

  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required' })
    return
  }

  const device: Device = {
    id: deviceId,
    name: name ?? `ESP8266-${deviceId.slice(-4)}`,
    status: 'online',
    registeredAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  }

  devices.set(deviceId, device)
  sensorHistory.set(deviceId, [])

  res.json({ success: true, device })
})

router.delete('/:id', (req, res) => {
  const { id } = req.params

  if (devices.has(id)) {
    devices.delete(id)
    sensorHistory.delete(id)
    res.json({ success: true, message: 'Device removed' })
  } else {
    res.status(404).json({ error: 'Device not found' })
  }
})

router.get('/data/:deviceId', (req, res) => {
  const { deviceId } = req.params

  if (!devices.has(deviceId)) {
    res.status(404).json({ error: 'Device not found' })
    return
  }

  res.json(sensorHistory.get(deviceId) ?? [])
})

export default router
