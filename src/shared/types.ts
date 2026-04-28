export interface Device {
  id: string
  name: string
  status: 'online' | 'offline'
  registeredAt: string
  lastUpdate: string
}

export interface SensorData {
  deviceId: string
  temperature: string
  humidity: string
  voltage: string
  timestamp: string
}

export interface CommandResult {
  success: boolean
  message: string
  output: string
}

export interface RegisterDeviceRequest {
  deviceId: string
  name?: string
}

export interface SendCommandRequest {
  deviceId: string
  command: string
}

export type WsInboundMessage =
  | { type: 'register'; deviceId: string }
  | { type: 'command'; deviceId: string; command: string }
  | { type: 'ping' }

export type WsOutboundMessage =
  | { type: 'registered'; deviceId: string; message: string }
  | { type: 'sensorData'; data: SensorData }
  | { type: 'pong'; timestamp: string }
  | { type: 'error'; message: string }
