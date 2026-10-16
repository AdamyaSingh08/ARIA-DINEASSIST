# DineAssist — Smart Restaurant Service System
### Presentation-Ready Robot Management Operations Dashboard for INNOTech Hackathon

**DineAssist** is an enterprise-grade restaurant robot management dashboard built for physical AI robots (such as **XiaoZhi / Xhaizi** ESP32-S3 rovers). It connects autonomous dining rovers with kitchen staff, table managers, and cashiers in real time.

---

## 🚀 Key Features

1. **Operations Overview**:
   - Live telemetry cards for New Requests, In-Progress Calls, Resolved Today, Kitchen Queue, Open Bills, and Active Connected Robots.
   - Real-time event streams, urgent waiting tables, and rover status indicators calculated directly from SQLite.
2. **Live Service Requests (Core Feature)**:
   - Real-time customer requests: *Water*, *Call Waiter*, *Request Bill*, *Assistance*, and *Custom Requests*.
   - Multi-step staff state machine: `New` ➔ `Acknowledged` ➔ `In Progress` ➔ `Completed` (or `Cancelled` with reason).
   - Audio notification chime (Web Audio API synthesized bell with mute toggle).
   - Overdue warning alerts for tables waiting > 5 minutes.
3. **Food Ordering Module**:
   - Kitchen pipeline: `Received` ➔ `Confirmed` ➔ `Preparing` ➔ `Ready` ➔ `Served`.
   - Authoritative backend pricing: Robot voice submissions are calculated strictly from database menu items to prevent price tampering.
   - Interactive sample menu catalog (Veg / Non-Veg indicators, categories, and INR ₹ pricing).
4. **Tables and Robot Fleet Management**:
   - Floor layout with table occupancy (`available`, `occupied`, `bill_requested`).
   - Dynamic robot rover assignment and unassignment.
   - Active connectivity detection: Rover heartbeat tracker that detects true offline rovers when telemetry times out.
   - Zero-downtime robot rover registration.
5. **Billing & Receipts (Full POS Integration)**:
   - Full invoice generation from confirmed table food orders without accidental duplicate billing.
   - Thermal/paper print-ready receipt view (`@media print` and instant `window.print()`).
   - Pre-finalization staff adjustments (add/remove items with audit trail).
   - Payment settlement recording for **Cash**, **UPI / QR**, and **Card** with transaction reference.
6. **Request & Order History**:
   - Persistent SQLite archive with date filtering, table search, and full audit logs.
7. **XiaoZhi Robot Integration & Judge Demo Mode**:
   - Dedicated interactive Hackathon Judge Toolbar with 1-click simulation triggers.
   - Authenticated gateway (`X-API-Key`) with idempotency deduplication (`event_id`).
   - Interactive in-browser API payload tester with immediate HTTP response debugging.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Socket.IO Client.
- **Backend**: Node.js v24, Express, TypeScript, Socket.IO Server.
- **Database**: Native Node.js `node:sqlite` (`DatabaseSync` engine) — 100% zero external C++ build tool dependencies, native performance, rock-solid Windows reliability.
- **Real-Time Communication**: WebSocket & Polling fallback via Socket.IO.
- **Architecture**: Modular adapter architecture separating raw voice audio WebSockets from normalized business event ingestion.

---

## 📂 Project Structure

```
e:/innotech/
├── backend/
│   ├── src/
│   │   ├── adapters/
│   │   │   └── xiaozhiAdapter.ts     # XiaoZhi hardware contracts & TTS outbound bridge
│   │   ├── db/
│   │   │   ├── index.ts              # SQLite database schema, PRAGMA, and audit logger
│   │   │   └── seed.ts               # Demo data seeder (tables, rovers, menu, orders)
│   │   ├── middleware/
│   │   │   └── auth.ts               # Robot API Key authentication (X-API-Key / Bearer)
│   │   ├── routes/
│   │   │   ├── overview.ts           # Overview metrics & floor telemetry
│   │   │   ├── requests.ts           # Service request state machine & filters
│   │   │   ├── orders.ts             # Food orders pipeline & authoritative menu prices
│   │   │   ├── tables.ts             # Table occupancy & robot assignments
│   │   │   ├── robots.ts             # Fleet telemetry & rover registration
│   │   │   ├── bills.ts              # POS invoices, receipt generation, and settlements
│   │   │   ├── history.ts            # Historical logs & archives
│   │   │   ├── integrations.ts       # Authenticated robot event & heartbeat gateway
│   │   │   └── settings.ts           # Application config, demo scenarios, and DB reset
│   │   ├── services/
│   │   │   ├── billingService.ts     # Authoritative tax, discounts, and recalculations
│   │   │   ├── eventService.ts       # Event normalization, idempotency, and broadcasts
│   │   │   └── robotMonitor.ts       # Periodic background heartbeat timeout watcher
│   │   ├── sockets/
│   │   │   └── index.ts              # Real-time Socket.IO hub
│   │   ├── types/
│   │   │   └── index.ts              # Backend TypeScript interfaces
│   │   └── server.ts                 # Express HTTP server & static frontend host
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx            # System header, clock, sound mute, connection badge
│   │   │   ├── Sidebar.tsx           # Responsive drawer navigation with live badge counts
│   │   │   ├── DemoBar.tsx           # Judge demonstration toolbar with quick triggers
│   │   │   ├── NotificationToast.tsx # Real-time visual toast notifications
│   │   │   ├── ReceiptModal.tsx      # Printable thermal invoice & settlement modal
│   │   │   ├── ManualRequestModal.tsx# Staff service call modal
│   │   │   └── ManualOrderModal.tsx  # Interactive menu browser & order builder
│   │   ├── pages/
│   │   │   ├── OverviewPage.tsx      # Real-time command center
│   │   │   ├── LiveRequestsPage.tsx  # Customer call cards & response buttons
│   │   │   ├── FoodOrdersPage.tsx    # Kitchen pipeline & restaurant menu
│   │   │   ├── TablesRobotsPage.tsx  # Table layout & XiaoZhi fleet management
│   │   │   ├── BillingReceiptsPage.tsx# POS billing overview & print receipts
│   │   │   ├── HistoryPage.tsx       # Audit trail & past transactions
│   │   │   └── SettingsIntegrationPage.tsx # Robot API keys, documentation, and live tester
│   │   ├── context/
│   │   │   └── SocketContext.tsx     # Real-time WebSocket provider & sound alerts
│   │   ├── services/
│   │   │   ├── api.ts                # Typed REST client
│   │   │   └── sound.ts              # Web Audio API harmonic chime synthesizer
│   │   ├── types.ts                  # Frontend TypeScript contracts
│   │   ├── App.tsx                   # Master page router & modal coordinator
│   │   └── index.css                 # Tailwind utilities & @media print styles
│   ├── package.json
│   ├── vite.config.ts                # Dev server with reverse proxy
│   └── tailwind.config.js
├── docs/
│   └── ROBOT_INTEGRATION.md          # Complete hardware integration & ESP32 guide
├── scripts/
│   └── test_robot_event.js           # CLI testing utility for robot payloads & edge cases
├── package.json                      # Root concurrent runner scripts
└── README.md
```

---

## ⚡ Quick Start Instructions (Windows Laptop)

### 1. Prerequisites
- **Node.js**: v20+ or v24+ installed on your laptop. (Verify with `node -v`).
- **Web Browser**: Chrome, Edge, Firefox, or Brave.

### 2. Installation
Open PowerShell in the `e:\innotech` directory:
```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 3. Build & Seed Demo Database
Initialize SQLite database with default tables, robots, menu items, and active orders:
```powershell
npm run seed
```

### 4. Run Application
To start both the Backend Gateway and the Frontend Dashboard concurrently with a single command:
```powershell
npm run dev
```

- **Staff Dashboard UI**: Open `http://localhost:3000` (or `http://localhost:5000`)
- **Backend API & Socket.IO**: Running on `http://localhost:5000`
- **Robot Ingestion Endpoint**: `http://localhost:5000/api/integrations/robot/events`

---

## 🎯 How to Demonstrate to Hackathon Judges

### Method 1: Interactive Judge Toolbar (Zero Setup)
1. Open the dashboard at `http://localhost:3000`.
2. Notice the prominent **INNOTech Judge Demonstration Toolbar** at the top of the screen.
3. Click any scenario button:
   - 💧 **Table 4 Requests Water**: Instantly triggers chime, adds yellow badge, displays card.
   - 🛎️ **Table 2 Calls Waiter**: Table 2 requests staff attendance.
   - 🧾 **Table 3 Requests Bill**: Generates invoice `INV-2026-001` with GST and items.
   - 🍲 **Table 1 Places Food Order**: Kitchen ticket appears in real time.
   - 📶 **Robot 1 Online**: Dispatches rover keep-alive telemetry.
   - 🔄 **Reset Demo DB**: Reseeds the database to a clean starting state.

### Method 2: Command-Line Robot Simulator Script
Open a second PowerShell window and test robot events via CLI:
```powershell
# Simulate customer asking for water
node scripts/test_robot_event.js water

# Simulate food order submitted by robot
node scripts/test_robot_event.js food

# Simulate bill requested from table
node scripts/test_robot_event.js bill

# Run full automated test suite (including auth rejection & duplicate tests)
node scripts/test_robot_event.js all
```

---

## 🤖 Physical Robot Connection (XiaoZhi / Xhaizi)

For full step-by-step ESP32 hardware guides, code snippets, and firewall settings, consult:
📄 **[docs/ROBOT_INTEGRATION.md](docs/ROBOT_INTEGRATION.md)**

### Key Inbound Endpoint
```http
POST http://<LAPTOP_LAN_IP>:5000/api/integrations/robot/events
Headers:
  X-API-Key: xiaozhi_secret_key_innotech2026
  Content-Type: application/json
```

### Sample cURL Command
```bash
curl -X POST http://127.0.0.1:5000/api/integrations/robot/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: xiaozhi_secret_key_innotech2026" \
  -d '{
    "event_id": "evt-curl-101",
    "robot_id": "robot-04",
    "table_id": "T04",
    "type": "service_request",
    "request_type": "water",
    "message": "Water requested via cURL test"
  }'
```

---

## 🧪 Testing Checklist & Edge Cases Covered

- ✅ **Backend Price Verification**: Dish prices in orders are calculated on the server from the menu DB, never trusted blindly from robot payloads.
- ✅ **Duplicate Prevention / Idempotency**: Repeated delivery of identical `event_id` returns HTTP 200 with `duplicate: true` without duplicating rows.
- ✅ **Security**: Device endpoints reject invalid or missing `X-API-Key` with HTTP 401.
- ✅ **Receipt Printing**: Print receipt opens a clean thermal/paper format without dashboard sidebars (`@media print`).
- ✅ **Active Connectivity**: Robots that stop sending heartbeats transition automatically to `offline` via the background sweep monitor.
- ✅ **Data Persistence**: All requests, table states, orders, and bills remain preserved across application restarts in local SQLite storage.
