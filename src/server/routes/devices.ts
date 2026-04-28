import { Router } from 'express'
import type { Device, RegisterDeviceRequest, SensorData } from '../../shared/types.js'
import logger from '../logger.js'

const router = Router()

export const devices = new Map<string, Device>()
export const sensorHistory = new Map<string, SensorData[]>()

router.get('/', (req, res) => {
  const list = Array.from(devices.values())
  logger.info({ ip: req.ip, count: list.length }, 'GET /api/devices')
  res.json(list)
})

router.post('/', (req, res) => {
  const { deviceId, name } = req.body as RegisterDeviceRequest

  if (!deviceId) {
    logger.warn({ ip: req.ip, body: req.body }, 'POST /api/devices - missing deviceId')
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
  logger.info({ ip: req.ip, deviceId, name: device.name }, 'Device registered')

  res.json({ success: true, device })
})

router.delete('/:id', (req, res) => {
  const { id } = req.params

  if (devices.has(id)) {
    devices.delete(id)
    sensorHistory.delete(id)
    logger.info({ ip: req.ip, deviceId: id }, 'Device removed')
    res.json({ success: true, message: 'Device removed' })
  } else {
    logger.warn({ ip: req.ip, deviceId: id }, 'DELETE /api/devices - device not found')
    res.status(404).json({ error: 'Device not found' })
  }
})

router.get('/data/:deviceId', (req, res) => {
  const { deviceId } = req.params

  if (!devices.has(deviceId)) {
    logger.warn({ ip: req.ip, deviceId }, 'GET /api/devices/data - device not found')
    res.status(404).json({ error: 'Device not found' })
    return
  }

  const history = sensorHistory.get(deviceId) ?? []
  logger.info({ ip: req.ip, deviceId, points: history.length }, 'Sensor history fetched')
  res.json(history)
})

export default router
