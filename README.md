# 🛡️ Alert Triage Hub — Sentinel Hub

A full-stack Security Operations Center (SOC) alert triage platform built with **React + TypeScript** (frontend) and **Python Flask** (backend), backed by a **MySQL** database.

---

## 📁 Project Structure

```
SEM 4 Project/
├── alert-triage-hub-main/   # Main application (frontend + backend)
│   ├── src/                 # React TypeScript source code
│   │   ├── pages/           # Login, Dashboard, Alerts, CriticalAlerts
│   │   ├── components/      # Reusable UI components (shadcn/ui)
│   │   ├── context/         # React context providers
│   │   └── hooks/           # Custom React hooks
│   ├── app.py               # Flask REST API backend
│   ├── Sentinel_Hub.sql     # Database schema
│   ├── mock.sql             # Sample/mock data
│   └── public/              # Static assets
└── Sem 4 Docs/              # Project documentation (ER Diagram, Use Case, Scope)
```

---

## 🚀 Features

- **Role-Based Authentication** — Separate login flows for *SOC Manager* and *Junior Analyst*
- **Alert Dashboard** — Real-time view of all security alerts with status filtering (New, Claimed, Investigating, Closed)
- **Alert Triage Actions** — Claim, Investigate, and Close alerts with database persistence
- **Critical Alerts View** — Dedicated page for high-priority/critical incidents
- **Forgot Password Flow** — Two-step identity verification (Username + Email) before password reset
- **Stats Cards** — Dynamic summary cards showing alert counts per status

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite                      |
| UI         | Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons |
| State      | React Context, TanStack Query                   |
| Backend    | Python Flask, Flask-CORS                        |
| Database   | MySQL                                           |
| Auth       | Werkzeug password hashing                       |
| Testing    | Vitest, Testing Library                         |

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js >= 18
- Python >= 3.9
- MySQL Server

---

### 1. Database Setup

```sql
-- Import the schema
mysql -u root -p < alert-triage-hub-main/Sentinel_Hub.sql

-- (Optional) Load mock data
mysql -u root -p sentinel_hub < alert-triage-hub-main/mock.sql
```

---

### 2. Backend Setup (Flask)

```bash
cd alert-triage-hub-main

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install flask flask-cors mysql-connector-python werkzeug

# Update DB credentials in app.py (host, user, password)
# Then start the server
python app.py
```

Backend runs at: `http://localhost:5000`

---

### 3. Frontend Setup (React)

```bash
cd alert-triage-hub-main

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔌 API Endpoints

| Method | Endpoint              | Description                            |
|--------|-----------------------|----------------------------------------|
| GET    | `/api/alerts`         | Fetch all alerts (supports `?status=`) |
| POST   | `/api/claim-alert`    | Claim an alert (assign to analyst)     |
| POST   | `/api/login`          | User login (role-based)                |
| POST   | `/api/signup`         | Register a new user                    |
| POST   | `/api/verify-user`    | Step 1: Verify identity for password reset |
| POST   | `/api/reset-password` | Step 2: Reset password after verification |

---

## 🧪 Running Tests

```bash
cd alert-triage-hub-main
npm run test
```

---

## 📄 Documentation

Project docs (ER Diagram, Business Use Case, Project Scope) are located in the `Sem 4 Docs/` folder.
