# Rangoli - IoT Instruction & Monitoring System

A full-stack IoT web application for connecting with and monitoring ESP8266 devices. Built with React and Node.js, deployable on Vercel.

![Rangoli IoT](https://img.shields.io/badge/IoT-ESP8266-00D9FF)
![React](https://img.shields.io/badge/React-18.2-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)

## Features

- **Real-time Device Monitoring** - View temperature, humidity, and voltage from ESP8266 devices
- **Command Control** - Send commands to devices (LED ON/OFF, STATUS, RESTART, READ_SENSORS)
- **WebSocket Support** - Real-time data streaming
- **Visual Dashboard** - Device cards with sensor data and charts
- **Vercel Ready** - One-click deployment

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express
- **Real-time:** WebSocket (ws)
- **Charts:** Recharts
- **Deployment:** Vercel

## Quick Start

```bash
# Clone and install
npm run install:all

# Development (runs both client and server)
npm run dev
```

## Project Structure

```
rangoli/
├── client/          # React frontend (Vite)
├── server/          # Node.js API (Express)
├── api/             # Vercel API routes
├── vercel.json      # Vercel config
└── package.json    # Root package
```

## ESP8266 Connection

### Arduino Sketch

```cpp
#include <ESP8266WiFi.h>
#include <WebSocketClient.h>

// Your WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* wsUrl = "wss://your-vercel-app.vercel.app/ws";

void setup() {
  Serial.begin(115200);
  connectWiFi();
  // Connect WebSocket to your deployed app
}

void loop() {
  // Read sensors
  float temp = readTemperature();
  float hum = readHumidity();
  
  // Send data via WebSocket
  sendSensorData(temp, hum);
  delay(5000);
}
```

### Available Commands

| Command | Description |
|---------|-------------|
| `LED_ON` | Turn on onboard LED |
| `LED_OFF` | Turn off onboard LED |
| `STATUS` | Get device status |
| `RESTART` | Reboot device |
| `READ_SENSORS` | Read all sensors |

## API Endpoints

### REST API

```
GET    /api/devices          # List all devices
POST   /api/devices          # Register new device
DELETE /api/devices/:id      # Remove device
POST   /api/command          # Send command to device
GET    /api/data/:deviceId   # Get sensor history
```

### WebSocket

```
ws://host/ws
```

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/rangoli.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect the configuration
   - Click Deploy

3. **Environment Variables** (optional)
   - Set `NODE_ENV` to `production`

## Development

```bash
# Run client only
npm run dev:client

# Run server only
npm run dev:server

# Build for production
npm run build

# Start production server
npm run start
```

## Configuration

### Vercel Configuration (vercel.json)

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "react",
  "outputDirectory": "client/dist"
}
```

## License

MIT

---

Built with ❤️ for IoT enthusiasts