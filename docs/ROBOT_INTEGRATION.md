# XiaoZhi (Xhaizi) Physical Robot Hardware Integration Guide

This document provides step-by-step technical instructions for connecting physical restaurant robots powered by the **XiaoZhi (Xhaizi)** framework to the **DineAssist** Smart Restaurant Operations Dashboard.

---

## 1. Architectural Overview & Honest Technical Boundary

### How XiaoZhi Framework Operates
The native XiaoZhi open-source framework (commonly deployed on ESP32-S3 boards like the ESP32-S3-BOX or custom robotics chassis) uses:
1. **Low-Latency Audio Pipeline**: WebSocket + Opus audio / UDP to an LLM speech server for continuous bidirectional conversational AI (Wake word -> VAD -> ASR -> LLM -> TTS).
2. **Audio protocol separation**: XiaoZhi's raw audio WebSocket protocol is **NOT** a general-purpose restaurant ordering database API. Audio frames should never be routed directly to a restaurant staff dashboard.
3. **Intent / Tool-Calling Extension Point**: When a customer tells the robot:
   - *"Please bring a bottle of cold water"*
   - *"We would like to order 2 Paneer Tikka and 2 Butter Naan"*
   - *"Can you get us the bill?"*
   The LLM agent on the XiaoZhi backend or the ESP32 firmware executes a **Function Call (Tool Call)** or webhook.
4. **The DineAssist Role**: DineAssist exposes high-performance, authenticated HTTP REST endpoints and Socket.IO hubs to consume these normalized business events, authoritatively verify menu prices, manage table occupancy, print invoices, and update staff in real-time.

```
┌──────────────────────────────────────┐
│  Customer at Table (e.g. Table 4)    │
└──────────────────┬───────────────────┘
                   │ Speaks: "Bring us water"
                   ▼
┌──────────────────────────────────────┐
│  XiaoZhi Hardware (ESP32-S3 Robot)   │
│  - Microphone / Speaker via I2S      │
│  - Audio WebSocket to AI Voice Model │
└──────────────────┬───────────────────┘
                   │ Tool Call Triggered:
                   │ POST /api/integrations/robot/events
                   ▼
┌──────────────────────────────────────┐
│  DineAssist Backend Gateway (Port 5000)
│  - X-API-Key Authentication          │
│  - Idempotency & Deduplication       │
│  - SQLite Database Persistence       │
│  - Real-Time Broadcast via Socket.IO │
└──────────────────┬───────────────────┘
                   │ Instant WebSocket Event
                   ▼
┌──────────────────────────────────────┐
│  Staff Operations Dashboard (Port 3000)
│  - Real-time Chime & Visual Alert    │
│  - Staff Acknowledges & Dispatches   │
└──────────────────────────────────────┘
```

---

## 2. Network Arrangement: Local Wi-Fi Configuration

When DineAssist is hosted locally on a laptop:
- **CRITICAL**: The physical XiaoZhi robot cannot reach `http://localhost:5000` or `http://127.0.0.1:5000`. `localhost` refers only to the robot itself!
- Both the laptop and the robot must be connected to the **same Wi-Fi network** (or phone hotspot).

### Step 1: Find your Laptop's LAN IPv4 Address
Open PowerShell on your Windows laptop and run:
```powershell
ipconfig
```
Look for your active Wi-Fi adapter:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.105
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
```
In this example, your gateway URL is:
```
http://192.168.1.105:5000
```

### Step 2: Windows Firewall Configuration
By default, Windows Firewall may block incoming connections from external Wi-Fi devices on port 5000.
To allow the XiaoZhi robot to send HTTP requests, run PowerShell as **Administrator**:
```powershell
New-NetFirewallRule -DisplayName "DineAssist IoT Gateway" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```
*(Or navigate to Windows Defender Firewall -> Advanced Settings -> Inbound Rules -> New Rule -> Port -> TCP 5000 -> Allow the connection).*

---

## 3. Authentication & API Headers

All device write endpoints require the Robot API Key.

| Header Name | Format | Example |
| :--- | :--- | :--- |
| `X-API-Key` | String | `xiaozhi_secret_key_innotech2026` |
| `Authorization` | Bearer Token | `Bearer xiaozhi_secret_key_innotech2026` |
| `Content-Type` | MIME type | `application/json` |

The secret key can be viewed and configured on the **Settings & Robot Integration** dashboard tab or set via `.env`:
```env
ROBOT_API_KEY=xiaozhi_secret_key_innotech2026
```

---

## 4. Gateway Endpoints & Event Payloads

### 4.1 Health Check (Unauthenticated)
```http
GET /api/integrations/robot/health
```
**Response:**
```json
{
  "status": "healthy",
  "system": "DineAssist IoT Gateway",
  "version": "1.0.0",
  "timestamp": "2026-10-16T11:30:00.000Z"
}
```

---

### 4.2 Inbound Robot Events
```http
POST /api/integrations/robot/events
Headers:
  X-API-Key: xiaozhi_secret_key_innotech2026
  Content-Type: application/json
```

#### Event 1: Service Request (`water`, `waiter`, `bill`, `assistance`, `custom`)
```json
{
  "event_id": "evt-xiaozhi-1001",
  "robot_id": "robot-04",
  "table_id": "T04",
  "type": "service_request",
  "request_type": "water",
  "message": "Customer requested 2 glasses of ice water",
  "timestamp": "2026-10-16T11:31:00Z"
}
```

#### Event 2: Food Order Submitted (`food_order_submitted`)
> **Note on Price Integrity**: The robot sends `menu_item_id` and `quantity`. The DineAssist backend checks and calculates all unit prices and line totals strictly against the authoritative SQLite menu database.
```json
{
  "event_id": "evt-xiaozhi-1002",
  "robot_id": "robot-01",
  "table_id": "T01",
  "type": "food_order_submitted",
  "items": [
    {
      "menu_item_id": "item-001",
      "quantity": 2,
      "notes": "Extra crispy"
    },
    {
      "menu_item_id": "item-011",
      "quantity": 3
    }
  ],
  "special_instructions": "Serve starters first",
  "timestamp": "2026-10-16T11:32:00Z"
}
```

#### Event 3: Bill Requested (`bill_requested`)
```json
{
  "event_id": "evt-xiaozhi-1003",
  "robot_id": "robot-03",
  "table_id": "T03",
  "type": "bill_requested",
  "timestamp": "2026-10-16T11:33:00Z"
}
```

#### Event 4: Periodic Heartbeat (`heartbeat`)
```http
POST /api/integrations/robot/heartbeat
Headers:
  X-API-Key: xiaozhi_secret_key_innotech2026
  Content-Type: application/json

{
  "robot_id": "robot-01",
  "battery_level": 92
}
```

---

## 5. Idempotency & Duplicate Protection

Network retries are common in hardware environments when Wi-Fi fluctuates.
DineAssist stores every received `event_id` in the `processed_events` table. If the robot sends the same `event_id` twice, the backend responds with HTTP 200:
```json
{
  "success": true,
  "duplicate": true,
  "message": "Event evt-xiaozhi-1001 has already been processed previously. Duplicate ignored.",
  "event_id": "evt-xiaozhi-1001"
}
```
No duplicate food orders, duplicate bills, or multiple service calls will ever be created.

---

## 6. XiaoZhi Firmware Integration: Code Examples

### Option A: XiaoZhi ESP32 C++ (ESP-IDF / Arduino) HTTP Webhook
Add this snippet to your XiaoZhi intent dispatch function in firmware:

```cpp
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* DINEASSIST_URL = "http://192.168.1.105:5000/api/integrations/robot/events";
const char* ROBOT_API_KEY = "xiaozhi_secret_key_innotech2026";

void sendRestaurantEvent(const char* tableId, const char* reqType, const char* message) {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.begin(DINEASSIST_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", ROBOT_API_KEY);

    StaticJsonDocument<256> doc;
    char eventId[32];
    snprintf(eventId, sizeof(eventId), "evt-esp32-%lu", millis());

    doc["event_id"] = eventId;
    doc["robot_id"] = "robot-01";
    doc["table_id"] = tableId;
    doc["type"] = "service_request";
    doc["request_type"] = reqType;
    doc["message"] = message;

    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = http.POST(jsonString);
    if (httpCode == 200) {
        Serial.println("[XiaoZhi] Event delivered to staff dashboard!");
    } else {
        Serial.printf("[XiaoZhi] Delivery failed, HTTP: %d\n", httpCode);
    }
    http.end();
}
```

### Option B: XiaoZhi Python Backend / MCP Tool Call
If your XiaoZhi setup routes tool-calls through a Python backend or bridge:

```python
import requests
import uuid

DINEASSIST_URL = "http://192.168.1.105:5000/api/integrations/robot/events"
ROBOT_API_KEY = "xiaozhi_secret_key_innotech2026"

def report_service_request(table_id: str, request_type: str, message: str = ""):
    """Tool function invoked by XiaoZhi conversational agent."""
    payload = {
        "event_id": f"evt-py-{uuid.uuid4().hex[:8]}",
        "robot_id": "robot-01",
        "table_id": table_id,
        "type": "service_request",
        "request_type": request_type,
        "message": message
    }
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": ROBOT_API_KEY
    }
    response = requests.post(DINEASSIST_URL, json=payload, headers=headers, timeout=3.0)
    return response.json()
```

---

## 7. Verification & Troubleshooting

1. **Test from Command Line**:
   Run the built-in test suite:
   ```bash
   node scripts/test_robot_event.js all
   ```
2. **Dashboard Real-Time Feedback**:
   Keep the DineAssist dashboard open in your browser (`http://localhost:3000`). When the script runs, notice:
   - Harmonic audio chime sounds immediately.
   - Unobtrusive notification toast appears in the top-right.
   - Counters in the sidebar and cards increment in real-time without page refresh.
3. **If connection times out**:
   - Verify laptop IP with `ipconfig`.
   - Ping the laptop from the robot network: `ping <LAPTOP_IP>`.
   - Ensure TCP port 5000 is open in Windows Firewall.
