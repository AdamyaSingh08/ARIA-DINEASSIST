# XiaoZhi (Xiaozhi) ESP32 Robot Hardware & MCP Integration Guide

This guide explains how to connect your physical restaurant robot powered by the **XiaoZhi (Xiaozhi) framework** to **ARIA DineAssist** using the **Model Context Protocol (MCP)** or direct HTTP gateway bridges.

---

## 1. Architecture: How XiaoZhi Integrates with ARIA DineAssist

Physical XiaoZhi robots (typically based on the **ESP32-S3** board with microphone, speaker, and Wi-Fi) run an open-source voice framework:
1. **Low-Latency Voice Stream**: The robot captures customer speech via I2S microphone and streams audio frames over WebSocket/UDP to an ASR/LLM speech server.
2. **Separation of Audio vs. Restaurant Operations**: Raw audio is **never** sent to the restaurant dashboard. The LLM agent processes customer intent (*"Bring us cold water"*, *"We want to order 2 Paneer Tikka"*, *"Can you bring the bill?"*) and triggers **Tool Calls** (Function Calls).
3. **ARIA as an MCP Tool Server**: ARIA DineAssist natively exposes an authenticated MCP JSON-RPC 2.0 server. When the customer makes a request, XiaoZhi's agent executes the appropriate ARIA tool.
4. **Authoritative Restaurant Backend**: ARIA verifies menu prices from its own trusted database, checks idempotency keys, updates table sessions, alerts waiters/chefs in real-time via Socket.IO, and returns spoken confirmations back to the robot.

```
┌──────────────────────────────────────┐
│  Customer at Table (e.g. Table 04)   │
└──────────────────┬───────────────────┘
                   │ Speaks: "Bring us chilled water"
                   ▼
┌──────────────────────────────────────┐
│  XiaoZhi Hardware (ESP32-S3 Robot)   │
│  - Microphone & Speaker via I2S      │
│  - Audio Stream to AI Speech Backend │
└──────────────────┬───────────────────┘
                   │ LLM Executes MCP Tool:
                   │ aria_create_service_request({ table_id: "T04", request_type: "water" })
                   ▼
┌──────────────────────────────────────┐
│  ARIA DineAssist Backend (Port 5000) │
│  - MCP Endpoint: POST /api/mcp       │
│  - REST Ingestion: POST /api/integrations/robot/events
│  - Idempotency & Deduplication       │
│  - Authoritative Pricing Calculation │
│  - SQLite Database Persistence       │
└──────────────────┬───────────────────┘
                   │ Real-Time Broadcast (Socket.IO)
                   ▼
┌──────────────────────────────────────┐
│  ARIA Operations Console (Port 3000) │
│  - Service Screen: Waiter Alerted    │
│  - Kitchen Display: Chef Receives KDS│
│  - Billing Screen: Bill Updated      │
└──────────────────────────────────────┘
```

---

## 2. Supported XiaoZhi Connection Models

ARIA DineAssist accommodates both physical deployment topologies:

### Model A: XiaoZhi Agent Platform Calls ARIA MCP Server (Standard)
Your XiaoZhi cloud platform (or self-hosted XiaoZhi server) acts as the MCP client, while ARIA DineAssist acts as the MCP tool server.
- **MCP Endpoint URL**: `http://<YOUR_LAPTOP_LAN_IP>:5000/api/mcp`
- **Transport**: Streamable HTTP (JSON-RPC 2.0) or Server-Sent Events (`/api/mcp/sse`)
- **Protocol Specification**: MCP 2024-11-05

### Model B: ARIA Connects to XiaoZhi Server / WebSocket Bridge
If your XiaoZhi setup hosts a WebSocket MCP server or tool bridge (e.g., `ws://192.168.1.50:8080/mcp`), ARIA DineAssist can connect as a client.
- Configurable via the **Device Setup** panel in the dashboard header or `.env`.

### Model C: Direct Firmware REST Webhooks
If your ESP32-S3 firmware invokes direct HTTP POST requests:
- **Endpoint**: `http://<YOUR_LAPTOP_LAN_IP>:5000/api/integrations/robot/events`
- **Header**: `X-API-Key: aria_secret_key_innotech2026`

---

## 3. Configuration: One Obvious Place for Endpoint & Credentials

### Option 1: In-Dashboard Device Setup (Recommended)
1. Open the ARIA DineAssist dashboard at `http://localhost:3000`.
2. Click **Device Setup** in the top header (or sidebar).
3. Paste your XiaoZhi MCP Endpoint URL (e.g. `ws://192.168.1.50:8080/mcp` or `http://192.168.1.50:8080/mcp`).
4. Enter your authentication token if required.
5. Click **Test Connection** &mdash; ARIA will perform a protocol handshake and report real latency and verified tools.
6. Click **Save & Connect**. Credentials are stored securely on the backend and are never exposed to browser bundles.

### Option 2: Backend Environment Configuration (`.env`)
In `backend/.env` (copy from `backend/.env.example`):
```env
# XiaoZhi MCP Integration
XIAOZHI_MCP_ENABLED=true
XIAOZHI_MCP_ENDPOINT=ws://192.168.1.50:8080/mcp
XIAOZHI_MCP_TRANSPORT=auto
XIAOZHI_MCP_TOKEN=your_secure_token_here
XIAOZHI_ROBOT_ID=aria-robot-01
```

---

## 4. Exposed ARIA Restaurant Operations MCP Tools

When registered with your XiaoZhi agent, the following tools become callable by the AI:

### Tool 1: `aria_create_service_request`
Records a table-side customer service request.
- **Input Parameters**:
  - `table_id` (string, required): e.g. `"T04"`
  - `robot_id` (string, required): e.g. `"aria-robot-01"`
  - `request_type` (string, required): `"water" | "waiter" | "bill" | "assistance" | "custom"`
  - `message` (string, optional): Context spoken by customer
  - `event_id` (string, optional): Idempotency key for deduplication
- **Behavior**: Appears instantly in the **Service** console under *Needs Immediate Attention* with a sound alert.

### Tool 2: `aria_submit_food_order`
Submits ordered dishes to the kitchen display system.
- **Input Parameters**:
  - `table_id` (string, required): e.g. `"T04"`
  - `robot_id` (string, required): e.g. `"aria-robot-01"`
  - `items` (array, required):
    - `menu_item_id` (string, required): e.g. `"item-001"` (Paneer Tikka)
    - `quantity` (integer, required): e.g. `2`
    - `notes` (string, optional): e.g. `"Crispy, less spicy"`
  - `special_instructions` (string, optional): Overall chef note
  - `event_id` (string, optional): Idempotency key
- **Behavior**: Authoritatively calculates prices from the restaurant menu database, creates kitchen ticket in the **Kitchen** screen under *1. New Orders*, and returns total in ₹.

### Tool 3: `aria_request_bill`
Notifies staff that the table wants their bill.
- **Input Parameters**:
  - `table_id` (string, required): e.g. `"T04"`
  - `robot_id` (string, required): e.g. `"aria-robot-01"`
  - `event_id` (string, optional): Idempotency key
- **Behavior**: Links active food orders into an open invoice, shows in **Billing** POS, and alerts waiter on the **Service** screen with a direct *[Open Bill]* action.

### Tool 4: `aria_get_table_status`
Provides the AI agent with live context about a dining table.
- **Input Parameters**:
  - `table_id` (string, required): e.g. `"T04"`
- **Returns**: Occupancy, active food orders, pending requests, and current unsettled bill amount.

---

## 5. Network Setup: Localhost vs. Laptop LAN IP Address

> [!IMPORTANT]
> When testing with physical hardware, **the robot cannot connect to `localhost:5000`**. `localhost` refers only to the robot's own microcontroller!

### Step 1: Find your Laptop's LAN IP Address
Open PowerShell and run:
```powershell
ipconfig
```
Find your active Wi-Fi IPv4 address (e.g. `192.168.1.105`).
Both your laptop and your XiaoZhi robot must be on the **same Wi-Fi network** or smartphone hotspot.

Your network endpoints are:
- **MCP Server**: `http://192.168.1.105:5000/api/mcp`
- **REST Events**: `http://192.168.1.105:5000/api/integrations/robot/events`

### Step 2: Allow Port 5000 Through Windows Firewall
Run PowerShell as **Administrator**:
```powershell
New-NetFirewallRule -DisplayName "ARIA DineAssist IoT Gateway" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

---

## 6. How to Start and Verify the System

### Starting the Applications
1. **Backend**:
   ```powershell
   cd e:\innotech\backend
   npm run dev
   ```
2. **Frontend**:
   ```powershell
   cd e:\innotech\frontend
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

### Verifying Connection & Events
1. In the dashboard header, verify the status pill reads **Connected** (when configured) or **Demo Mode**.
2. Click **Simulate Event** &rarr; click **[Request Water]**.
3. Confirm the ticket immediately appears on the **Service** screen under *Needs Immediate Attention*.
4. Click **[ACKNOWLEDGE]** &rarr; moves to *Being Handled*.
5. Click **Simulate Event** &rarr; click **[Order Food (₹580)]**.
6. Switch to the **Kitchen** screen &rarr; ticket appears under *1. New Orders*. Click **[START PREPARING]** &rarr; moves to *2. In Preparation*. Click **[MARK READY TO SERVE]** &rarr; signals waiter.
7. Switch to the **Billing** screen &rarr; inspect Table 04 invoice, print receipt, and record settlement (Cash/Card/UPI).

---

## 7. Diagnostics & Troubleshooting

| Diagnostic Message | Root Cause | Solution |
| :--- | :--- | :--- |
| **`Endpoint missing`** | No URL provided | Paste XiaoZhi endpoint in Device Setup |
| **`Connection refused`** | Server not running on specified IP/port | Verify IP address with `ipconfig` and ensure server is active |
| **`Connection timed out`** | Firewall blocking port or different Wi-Fi subnet | Check Windows Firewall rule and ensure both devices are on same Wi-Fi |
| **`Authentication failed`** | Missing or incorrect Bearer token / API key | Verify token in Device Setup |
| **`Invalid Request: jsonrpc must be "2.0"`** | Client sent non-MCP payload | Ensure client uses JSON-RPC 2.0 format |

---

## 8. Implementation Verification Status

- [x] Standard MCP Server (`POST /api/mcp`, `GET /api/mcp/sse`) implemented and tested with JSON-RPC 2.0
- [x] All 4 ARIA MCP Tools implemented with full parameter validation and authoritative pricing
- [x] Dual-transport support: Streamable HTTP and WebSocket client in adapter
- [x] In-dashboard Device Setup modal with test connection handshake and latency reporting
- [x] Clean Service, Kitchen, and Billing screens with 48px touch controls
- [x] Hackathon Demo Simulator for testing without physical robot hardware
- [ ] Physical ESP32 hardware field verification (requires physical robot presence at hackathon booth)
