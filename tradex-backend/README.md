# TradeX Pro — Full Stack Setup Guide

## Project Structure
```
Desktop/
├── TraderX/
│   ├── tradex-pro/          ← React Frontend (port 3000)
│   │   └── src/
│   │       ├── App.js
│   │       └── api.js       ← copy this file here
│   │
│   └── tradex-backend/      ← Node.js Backend (port 5000)
│       ├── server.js
│       ├── package.json
│       └── tradex.db        ← auto-created SQLite database
```

---

## Backend Setup (Do this ONCE)

Open a NEW terminal in VS Code and run:

```bash
cd C:\Users\Lenovo\Desktop\TraderX\tradex-backend
npm install
npm start
```

You should see:
```
╔═══════════════════════════════════════╗
║       TradeX Pro Backend Server       ║
║       Running on port 5000            ║
╚═══════════════════════════════════════╝
```

---

## Frontend Setup (In a SECOND terminal)

```bash
cd C:\Users\Lenovo\Desktop\TraderX\tradex-pro
npm start
```

---

## Running Both Together

You need TWO terminals open at the same time:

| Terminal 1 (Backend)         | Terminal 2 (Frontend)        |
|------------------------------|------------------------------|
| cd tradex-backend            | cd tradex-pro                |
| npm start                    | npm start                    |
| Runs on port 5000            | Runs on port 3000            |

Open browser at: http://localhost:3000

---

## API Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | /api/auth/register    | Register new user        |
| POST   | /api/auth/login       | Login user               |
| GET    | /api/auth/me          | Get current user         |
| GET    | /api/stocks           | Get all stock prices     |
| GET    | /api/stocks/:symbol   | Get single stock         |
| GET    | /api/portfolio        | Get user portfolio       |
| POST   | /api/trade            | Execute buy/sell trade   |
| GET    | /api/transactions     | Get trade history        |
| GET    | /api/watchlist        | Get watchlist            |
| POST   | /api/watchlist/:sym   | Add to watchlist         |
| DELETE | /api/watchlist/:sym   | Remove from watchlist    |
| GET    | /api/orders           | Get pending orders       |
| POST   | /api/orders           | Place limit/stop order   |
| DELETE | /api/orders/:id       | Cancel order             |
| GET    | /api/leaderboard      | Get top traders          |

---

## Tech Stack (Tell Your Teacher)

### Frontend
- React.js (Component-based UI)
- Canvas API (Custom charts — RSI, MACD, Bollinger Bands)
- Socket.IO Client (Real-time WebSocket prices)
- CSS-in-JS Styling

### Backend
- Node.js + Express.js (REST API Server)
- Socket.IO (WebSocket for live price streaming)
- SQLite + better-sqlite3 (Persistent database)
- JWT (JSON Web Tokens for authentication)
- bcryptjs (Password hashing & security)

### Database Tables
- users — stores registered accounts
- portfolio — tracks stock holdings per user
- transactions — full trade history
- watchlist — user's saved stocks
- pending_orders — limit & stop-loss orders

---

## Database (tradex.db)

The SQLite database file `tradex.db` is automatically created
when you first run the backend. It saves:
- All user accounts (passwords are encrypted with bcrypt)
- Every trade ever made
- Portfolio positions
- Watchlist items
- Pending limit/stop orders
- Leaderboard data

You can open it with: https://sqlitebrowser.org (free tool)
