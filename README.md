# Lumentech Monitor

**Lumentech Monitor** is a mission-critical, real-time Business Intelligence Dashboard designed to run 24/7. It provides an "airport control tower" view of sales performance, split between business units (Orglight and Perfil).

## 🚀 Tech Stack

- **Backend:** Elixir + Phoenix Framework
    - Uses `GenServer` for fault-tolerant data ingestion.
    - Uses `Phoenix.Channels` for real-time WebSocket updates.
    - **Resilience:** Designed to keep the last known good state if the data source fails.
- **Frontend:** React + TypeScript (Vite)
    - **Visualization:** Apache ECharts (Maps, Donuts, Bar Charts).
    - **Styling:** TailwindCSS.
    - **State:** Real-time sync via WebSockets.

## 🛠️ Prerequisites

- **Elixir** (v1.14+) & **Erlang/OTP**
- **Node.js** (v18+) & **NPM**

## 📦 Installation & execution

### 1. Backend (Phoenix)

The backend acts as the source of truth, polling the data source (Mock or Google Sheets) and broadcasting updates.

```bash
cd backend

# Install dependencies
mix deps.get

# Start the server
mix phx.server
```
*The API will be available at `http://localhost:4000`.*
*The WebSocket endpoint is `ws://localhost:4000/socket`.*

### 2. Frontend (React)

The frontend connects to the backend channel and renders the dashboard.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*Access the dashboard at `http://localhost:5173`.*

## 📂 Project Structure

```
lumentech-dashboard/
├── backend/                  # Phoenix Application
│   ├── lib/
│   │   ├── lumentech_monitor/data_ingestion/
│   │   │   ├── sheet_client.ex   # Data Source (Mock)
│   │   │   └── sheet_watcher.ex  # GenServer (State & Polling)
│   │   └── lumentech_monitor_web/channels/
│   └── ...
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # KPI Cards, Charts
│   │   ├── hooks/            # WebSocket logic
│   │   ├── lib/              # Business Logic & Types
│   │   └── App.tsx           # Main Layout
│   └── ...
└── README.md
```

## ⚙️ Configuration

### Environment Variables
For the MVP, configuration is minimal. In the future, for Google Sheets integration, create a `.env` file in the `backend` directory (see `.env.example`):

```env
GOOGLE_APPLICATION_CREDENTIALS=./path-to-key.json
SPREADSHEET_ID=your_id_here
```

## 🧪 Testing Fault Tolerance

The system is designed to handle failures.
1.  **Simulate API Failure:** You can modify `backend/lib/lumentech_monitor/data_ingestion/sheet_client.ex` to return `{:error, ...}` randomly. The dashboard will **not** crash and will continue showing the last valid data.
2.  **Simulate Connection Loss:** Stop the backend server. The frontend will show a red "RECONNECTING" indicator. Restart the backend, and it will auto-recover.

## 📝 License
Proprietary - Lumentech.
