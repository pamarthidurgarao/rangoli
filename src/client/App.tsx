import { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Device, SensorData } from '../shared/types'

interface QuickCommand {
  id: string
  label: string
  description: string
}

interface ChartPoint extends SensorData {
  time: string
}

interface WsMessage {
  type: 'system' | 'sent' | 'received' | 'error'
  text: string
  time: string
}

interface CommandResult {
  success: boolean
  message: string
  output: string
}

const QUICK_COMMANDS: QuickCommand[] = [
  { id: 'LED_ON', label: 'LED ON', description: 'Turn on the onboard LED' },
  { id: 'LED_OFF', label: 'LED OFF', description: 'Turn off the onboard LED' },
  { id: 'STATUS', label: 'STATUS', description: 'Get device status and info' },
  { id: 'RESTART', label: 'RESTART', description: 'Reboot the ESP8266 device' },
  { id: 'READ_SENSORS', label: 'READ SENSORS', description: 'Read all sensor values' },
  { id: 'GET_IP', label: 'GET IP', description: 'Get device IP address' },
  { id: 'WIFI_STATUS', label: 'WIFI STATUS', description: 'Check WiFi connection' },
  { id: 'DEEP_SLEEP', label: 'DEEP SLEEP', description: 'Enter deep sleep mode' },
]

const PUBLIC_INSTRUCTIONS = [
  {
    title: 'Connect ESP8266',
    code: `# Include this in your Arduino sketch
#include <ESP8266WiFi.h>
#include <WebSocketClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* wsServer = "your-app.vercel.app";
const int wsPort = 80;`,
  },
  {
    title: 'Send Sensor Data',
    code: `// Send data to server
void sendSensorData(float temp, float hum) {
  String json = "{\\"deviceId\\":\\"ESP001\\",";
  json += "\\"temperature\\":" + String(temp) + ",";
  json += "\\"humidity\\":" + String(hum) + "}";
  webSocket.send(json);
}`,
  },
  {
    title: 'Receive Commands',
    code: `// Callback when command received
void onMessage(WebSocketClient& client,
              String& message) {
  if (message == "LED_ON") {
    digitalWrite(LED_BUILTIN, LOW);
  } else if (message == "LED_OFF") {
    digitalWrite(LED_BUILTIN, HIGH);
  }
}`,
  },
]

function generateMockData(deviceId: string): SensorData {
  return {
    deviceId,
    temperature: (20 + Math.random() * 10).toFixed(1),
    humidity: (40 + Math.random() * 30).toFixed(1),
    voltage: (3.0 + Math.random() * 0.5).toFixed(2),
    timestamp: new Date().toISOString(),
  }
}

function simulateESPResponse(command: string): CommandResult {
  const responses: Record<string, CommandResult> = {
    LED_ON: { success: true, message: 'LED turned ON', output: 'OK' },
    LED_OFF: { success: true, message: 'LED turned OFF', output: 'OK' },
    STATUS: { success: true, message: 'Device online | Free heap: 40000 | Uptime: 3600s', output: 'Status: Online\nHeap: 40000\nUptime: 3600s' },
    RESTART: { success: true, message: 'Rebooting device...', output: 'Rebooting...' },
    READ_SENSORS: { success: true, message: 'Temp: 24.5°C | Humidity: 65% | Light: 512', output: 'Temp: 24.5°C\nHumidity: 65%\nLight: 512' },
    GET_IP: { success: true, message: 'IP Address: 192.168.1.100', output: 'IP: 192.168.1.100\nGateway: 192.168.1.1' },
    WIFI_STATUS: { success: true, message: 'WiFi Connected | SSID: MyNetwork', output: 'SSID: MyNetwork\nRSSI: -45dBm\nChannel: 6' },
    DEEP_SLEEP: { success: true, message: 'Entering deep sleep mode...', output: 'Deep sleep: 60s' },
  }
  return responses[command] ?? { success: false, message: 'Unknown command', output: 'ERROR: Unknown command' }
}

function App() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [newDeviceId, setNewDeviceId] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [sensorData, setSensorData] = useState<Record<string, SensorData>>({})
  const [chartData, setChartData] = useState<Record<string, ChartPoint[]>>({})
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState('')
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('5min')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'instructions' | 'websocket'>('dashboard')
  const [wsMessages, setWsMessages] = useState<WsMessage[]>([])
  const [wsInput, setWsInput] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list: Device[] = await res.json()
      setDevices(list)
      setSelectedDevice(prev => prev && list.some(d => d.id === prev) ? prev : (list[0]?.id ?? null))
    } catch {
      // backend unreachable — keep local state, demo mode still works
    } finally {
      setLoadingDevices(false)
    }
  }, [])

  const addWsMessage = (msg: Omit<WsMessage, 'time'>) => {
    setWsMessages(prev => [...prev.slice(-50), { ...msg, time: new Date().toLocaleTimeString() }])
  }

  const startDataSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setDevices(prev => prev.length === 0 ? prev : prev.map(d => ({ ...d, lastUpdate: new Date().toISOString() })))
      setSensorData(prev => {
        const next = { ...prev }
        setDevices(current => {
          current.forEach(d => { next[d.id] = generateMockData(d.id) })
          return current
        })
        return next
      })
      setChartData(prev => {
        const next = { ...prev }
        setDevices(current => {
          current.forEach(d => {
            const point: ChartPoint = { time: new Date().toLocaleTimeString(), ...generateMockData(d.id) }
            next[d.id] = [...(next[d.id] ?? []).slice(-20), point]
          })
          return current
        })
        return next
      })
    }, 3000)
  }, [])

  const connectWebSocket = useCallback(() => {
    setConnectionStatus('connecting')
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${window.location.host}/ws`

    try {
      const ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)
          addWsMessage({ type: 'received', text: JSON.stringify(data, null, 2) })
          if (data.type === 'sensorData') {
            const payload: SensorData = data.data
            setSensorData(prev => ({ ...prev, [payload.deviceId]: payload }))
            setChartData(prev => {
              const point: ChartPoint = { time: new Date().toLocaleTimeString(), ...payload }
              return {
                ...prev,
                [payload.deviceId]: [...(prev[payload.deviceId] ?? []).slice(-20), point],
              }
            })
          }
        } catch {
          addWsMessage({ type: 'received', text: event.data as string })
        }
      }
      ws.onopen = () => {
        setConnectionStatus('connected')
        addWsMessage({ type: 'system', text: 'WebSocket connected' })
        // stop demo simulation — real data now coming in
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
      ws.onclose = () => {
        setConnectionStatus('disconnected')
        addWsMessage({ type: 'system', text: 'WebSocket disconnected' })
      }
      ws.onerror = () => {
        addWsMessage({ type: 'error', text: 'WebSocket error' })
      }
      wsRef.current = ws
    } catch {
      setTimeout(() => {
        setConnectionStatus('connected')
        addWsMessage({ type: 'system', text: 'Running in demo mode' })
        startDataSimulation()
      }, 1000)
    }
  }, [startDataSimulation])

  const sendWsMessage = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(text)
      addWsMessage({ type: 'sent', text })
    } else {
      addWsMessage({ type: 'error', text: 'WebSocket not connected' })
    }
  }

  const addDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeviceId.trim()) return
    const id = newDeviceId.trim()
    setNewDeviceId('')
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id }),
      })
      if (res.ok) {
        await fetchDevices()
        setSensorData(prev => ({ ...prev, [id]: generateMockData(id) }))
        if (!selectedDevice) setSelectedDevice(id)
      }
    } catch {
      // fallback: add locally when backend unreachable
      const newDevice: Device = {
        id, name: `ESP8266-${id.slice(-4)}`, status: 'online',
        registeredAt: new Date().toISOString(), lastUpdate: new Date().toISOString(),
      }
      setDevices(prev => [...prev, newDevice])
      setSensorData(prev => ({ ...prev, [id]: generateMockData(id) }))
      if (!selectedDevice) setSelectedDevice(id)
    }
  }

  const removeDevice = async (deviceId: string) => {
    try {
      await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
      await fetchDevices()
    } catch {
      setDevices(prev => prev.filter(d => d.id !== deviceId))
    }
    if (selectedDevice === deviceId) setSelectedDevice(null)
  }

  const sendCommand = (cmd = command) => {
    if (!selectedDevice || !cmd.trim()) return
    const cmdToSend = cmd.trim().toUpperCase()
    setResponse(`> ${cmdToSend}\n`)
    setTimeout(() => {
      const resp = simulateESPResponse(cmdToSend)
      setResponse(prev => prev + `${resp.message}\n`)
    }, 500)
    setCommand('')
    setSelectedCommand(null)
  }

  useEffect(() => {
    fetchDevices()
    connectWebSocket()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      wsRef.current?.close()
    }
  }, [fetchDevices, connectWebSocket])

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">📡</div>
          <h1>Rangoli</h1>
        </div>
        <div className="header-tabs">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`} onClick={() => setActiveTab('instructions')}>📚 Instructions</button>
          <button className={`tab-btn ${activeTab === 'websocket' ? 'active' : ''}`} onClick={() => setActiveTab('websocket')}>🔌 WebSocket</button>
        </div>
        <div className="connection-status">
          <div className={`status-dot ${connectionStatus === 'connected' ? 'connected' : ''}`}></div>
          <span>{connectionStatus === 'connected' ? 'Connected' : connectionStatus}</span>
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <div>
            <h2>Devices</h2>
            <div className="device-list">
              {loadingDevices ? (
                <div className="empty-state"><p>Loading devices...</p></div>
              ) : devices.length === 0 ? (
                <div className="empty-state"><p>No devices connected</p></div>
              ) : (
                devices.map(device => (
                  <div key={device.id} className={`device-item ${selectedDevice === device.id ? 'active' : ''}`} onClick={() => setSelectedDevice(device.id)}>
                    <div className="name">{device.name}</div>
                    <div className="status">
                      <div className={`status-dot ${device.status === 'online' ? 'connected' : ''}`}></div>
                      <span>{device.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <form className="add-device-form" onSubmit={addDevice}>
            <input type="text" placeholder="Enter Device ID (e.g., ESP001)" value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} />
            <button type="submit">Add Device</button>
          </form>
        </aside>

        <main className="content">
          {activeTab === 'dashboard' && (
            <>
              {devices.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📡</div>
                  <h3>No Devices Connected</h3>
                  <p>Add an ESP8266 device to start monitoring</p>
                </div>
              ) : (
                <>
                  <div className="dashboard">
                    {devices.map(device => (
                      <div key={device.id} className={`device-card ${device.status}`} onClick={() => setSelectedDevice(device.id)}>
                        <div className="header">
                          <div>
                            <div className="device-name">{device.name}</div>
                            <div className="device-id">{device.id}</div>
                          </div>
                          <div className={`status-dot ${device.status === 'online' ? 'connected' : ''}`}></div>
                        </div>
                        <div className="sensor-data">
                          <div className="sensor-item">
                            <div className="label">Temperature</div>
                            <div className="value temperature">{sensorData[device.id]?.temperature ?? '--'}°C</div>
                          </div>
                          <div className="sensor-item">
                            <div className="label">Humidity</div>
                            <div className="value humidity">{sensorData[device.id]?.humidity ?? '--'}%</div>
                          </div>
                          <div className="sensor-item">
                            <div className="label">Voltage</div>
                            <div className="value voltage">{sensorData[device.id]?.voltage ?? '--'}V</div>
                          </div>
                          <div className="sensor-item">
                            <div className="label">Last Update</div>
                            <div className="value" style={{ fontSize: '14px' }}>{device.lastUpdate ? new Date(device.lastUpdate).toLocaleTimeString() : '--'}</div>
                          </div>
                        </div>
                        <div className="actions">
                          <button onClick={(e) => { e.stopPropagation(); sendCommand('READ_SENSORS') }}>Refresh</button>
                          <button onClick={(e) => { e.stopPropagation(); removeDevice(device.id) }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedDevice && (
                    <div className="command-panel">
                      <h3>Command Panel - {selectedDevice}</h3>
                      <div className="command-buttons">
                        {QUICK_COMMANDS.map(cmd => (
                          <button key={cmd.id} className={selectedCommand === cmd.id ? 'active' : ''} onClick={() => { setSelectedCommand(cmd.id); sendCommand(cmd.id) }}>{cmd.label}</button>
                        ))}
                      </div>
                      <div className="command-input">
                        <input type="text" placeholder="Enter custom command..." value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendCommand()} />
                        <button onClick={() => sendCommand()}>Send</button>
                      </div>
                      <div className="response-area">{response || <span className="empty">Command response will appear here...</span>}</div>
                    </div>
                  )}

                  {selectedDevice && chartData[selectedDevice] && (
                    <div className="chart-container">
                      <h3>Sensor History - {selectedDevice}</h3>
                      <div className="time-range-selector">
                        {['1min', '5min', '15min', '1hr'].map(range => (
                          <button key={range} className={timeRange === range ? 'active' : ''} onClick={() => setTimeRange(range)}>{range}</button>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData[selectedDevice]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip contentStyle={{ background: '#151F2E', border: '1px solid #1B263B', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="temperature" stroke="#FFB800" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="humidity" stroke="#00D9FF" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'instructions' && (
            <div className="instructions-panel">
              <h2>ESP8266 Connection Instructions</h2>
              <p className="instructions-intro">Follow these instructions to connect your ESP8266 device to Rangoli IoT system.</p>
              <div className="instruction-cards">
                {PUBLIC_INSTRUCTIONS.map((instruction, index) => (
                  <div key={index} className="instruction-card">
                    <h3>{instruction.title}</h3>
                    <pre><code>{instruction.code}</code></pre>
                    <button className="copy-btn" onClick={() => navigator.clipboard.writeText(instruction.code)}>📋 Copy Code</button>
                  </div>
                ))}
              </div>
              <div className="command-reference">
                <h3>Available Commands Reference</h3>
                <div className="command-grid">
                  {QUICK_COMMANDS.map(cmd => (
                    <div key={cmd.id} className="command-item">
                      <code>{cmd.id}</code>
                      <span>{cmd.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'websocket' && (
            <div className="websocket-panel">
              <h2>WebSocket Monitor</h2>
              <p className="ws-intro">Monitor real-time WebSocket messages between the client and server.</p>
              <div className="ws-controls">
                <button className="ws-btn connect" onClick={connectWebSocket} disabled={connectionStatus === 'connected'}>
                  {connectionStatus === 'connected' ? '✓ Connected' : '🔌 Connect'}
                </button>
                <button className="ws-btn disconnect" onClick={() => { wsRef.current?.close(); setConnectionStatus('disconnected') }} disabled={connectionStatus !== 'connected'}>Disconnect</button>
                <button className="ws-btn clear" onClick={() => setWsMessages([])}>Clear Messages</button>
              </div>
              <div className="ws-input-area">
                <input type="text" placeholder='{"type": "register", "deviceId": "ESP001"}' value={wsInput} onChange={(e) => setWsInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendWsMessage(wsInput)} />
                <button onClick={() => sendWsMessage(wsInput)}>Send</button>
              </div>
              <div className="ws-messages">
                {wsMessages.length === 0 ? (
                  <div className="ws-empty">No messages yet. Connect to start receiving data.</div>
                ) : (
                  wsMessages.map((msg, index) => (
                    <div key={index} className={`ws-message ${msg.type}`}>
                      <span className="ws-time">{msg.time}</span>
                      <span className="ws-type">[{msg.type.toUpperCase()}]</span>
                      <pre>{msg.text}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="footer">
        <span>Rangoli IoT Monitor v1.0.0</span>
        <span>Last sync: {new Date().toLocaleTimeString()}</span>
      </footer>
    </div>
  )
}

export default App
