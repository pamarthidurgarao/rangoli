# Rangoli - IoT Instruction & Monitoring System

## Project Overview

**Project Name:** Rangoli  
**Type:** Full-stack IoT Web Application (Monolith)  
**Core Functionality:** Real-time monitoring and control system for ESP8266-based IoT devices  
**Target Users:** IoT hobbyists, makers, and engineers managing ESP8266 devices

---

## Architecture

### Tech Stack
- **Frontend:** React 18 with Vite
- **Backend:** Node.js with Express
- **Real-time:** WebSocket (ws library)
- **Database:** In-memory store (for demo) - easily swappable to MongoDB/PostgreSQL
- **Deployment:** Vercel (monolith with API routes)

### Monolith Structure
```
/rangoli
├── client/          # React frontend
├── server/          # Node.js API
├── api/             # Vercel API routes (serverless)
└── vercel.json      # Vercel configuration
```

---

## UI/UX Specification

### Layout Structure
- **Header:** Logo, navigation, connection status indicator
- **Sidebar:** Device list, quick actions
- **Main Content:** Dashboard with device cards, real-time charts
- **Footer:** System status, last sync time

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Design

#### Color Palette
- **Primary:** #0D1B2A (Deep Navy)
- **Secondary:** #1B263B (Dark Slate)
- **Accent:** #00D9FF (Cyan Neon)
- **Success:** #00FF88 (Neon Green)
- **Warning:** #FFB800 (Amber)
- **Error:** #FF4757 (Coral Red)
- **Background:** #0A0F1A (Near Black)
- **Surface:** #151F2E (Card Dark)
- **Text Primary:** #FFFFFF
- **Text Secondary:** #8892A0

#### Typography
- **Font Family:** "JetBrains Mono" for data, "Outfit" for UI
- **Headings:** Outfit, 600 weight
- **Body:** Outfit, 400 weight
- **Data/Code:** JetBrains Mono, 400 weight

#### Spacing System
- Base unit: 8px
- Margins: 8px, 16px, 24px, 32px, 48px
- Card padding: 24px
- Gap between cards: 16px

#### Visual Effects
- Card shadows: 0 4px 24px rgba(0, 217, 255, 0.1)
- Glow effects on active devices: 0 0 20px rgba(0, 217, 255, 0.3)
- Smooth transitions: 200ms ease-out
- Subtle gradient overlays on cards

### Components

#### Device Card
- Device name and status indicator (online/offline)
- Real-time sensor readings display
- Last communication timestamp
- Quick action buttons (refresh, configure, disconnect)
- States: online (green glow), offline (dim), connecting (pulsing cyan)

#### Dashboard Grid
- 3-column layout on desktop, 2 on tablet, 1 on mobile
- Auto-refresh every 5 seconds
- Pull-to-refresh on mobile

#### Command Panel
- Input field for sending commands to ESP8266
- Command history dropdown
- Quick command buttons (LED ON, LED OFF, RESTART, STATUS)
- Response display area

#### Real-time Chart
- Line chart for sensor data over time
- Time range selector (1min, 5min, 15min, 1hr)
- Zoom and pan capabilities

#### Connection Manager
- Device registration form
- Connection status log
- Auto-reconnect toggle

---

## Functionality Specification

### Core Features

#### 1. Device Management
- Register new ESP8266 devices with unique ID
- View all connected devices in dashboard
- Remove/disconnect devices
- Device nickname assignment

#### 2. Real-time Monitoring
- Receive sensor data from ESP8266 via WebSocket
- Display temperature, humidity, voltage readings
- Auto-refresh dashboard with latest data
- Historical data storage (last 100 readings per device)

#### 3. Command Control
- Send commands to ESP8266 devices
- Pre-defined command templates:
  - `LED_ON` - Turn on onboard LED
  - `LED_OFF` - Turn off onboard LED
  - `STATUS` - Get device status
  - `RESTART` - Reboot device
  - `READ_SENSORS` - Read all sensors
- Custom command input

#### 4. Connection Handling
- WebSocket connection to backend
- Auto-reconnect on connection loss
- Connection status indicators
- Manual connect/disconnect

#### 5. Data Visualization
- Real-time line charts for sensor data
- Gauge displays for current values
- Data export capability (JSON)

### User Interactions
1. **Add Device:** Click "Add Device" → Enter device ID → Connect
2. **Send Command:** Select device → Choose command → View response
3. **View Data:** Dashboard shows all devices → Click device for details
4. **Monitor:** Real-time updates appear automatically

### API Endpoints

#### REST API
- `GET /api/devices` - List all registered devices
- `POST /api/devices` - Register new device
- `DELETE /api/devices/:id` - Remove device
- `POST /api/command` - Send command to device
- `GET /api/data/:deviceId` - Get device sensor history

#### WebSocket
- `ws://server/ws` - Real-time data stream
- Client sends: `{ type: 'register', deviceId: 'xxx' }`
- Server sends: `{ type: 'sensorData', deviceId: 'xxx', data: {...} }`

### Edge Cases
- Device goes offline → Show offline status, queue commands
- Network disconnection → Auto-reconnect with exponential backoff
- Invalid device ID → Show error message
- Command timeout → Display timeout error after 10 seconds

---

## Vercel Deployment Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "react",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

### Project Scripts
- `npm run dev` - Start development (concurrent client + server)
- `npm run build` - Build for production
- `npm run start` - Start production server

---

## Acceptance Criteria

### Visual Checkpoints
- [ ] Dark theme with cyan accent colors applied
- [ ] Device cards display with glow effects
- [ ] Real-time chart updates smoothly
- [ ] Responsive layout works on all breakpoints
- [ ] Connection status indicators visible

### Functional Checkpoints
- [ ] Can register a new ESP8266 device
- [ ] WebSocket connection establishes successfully
- [ ] Commands can be sent to devices
- [ ] Sensor data displays in real-time
- [ ] Application builds without errors
- [ ] Vercel deployment succeeds

### Performance
- [ ] Initial load < 3 seconds
- [ ] Real-time updates < 500ms latency
- [ ] Smooth animations at 60fps