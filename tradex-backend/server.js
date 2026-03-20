const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const JWT_SECRET = "tradex_pro_secret_2024";

// ─── DATABASE SETUP ───────────────────────────────────────────────────────────
const db = new sqlite3.Database("tradex.db", (err) => {
  if (err) console.error("DB Error:", err);
  else console.log("✅ Connected to SQLite database: tradex.db");
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    cash REAL DEFAULT 10000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    avg_buy_price REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, symbol)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    order_type TEXT DEFAULT 'market',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, symbol)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pending_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    order_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    trigger_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  console.log("✅ All database tables ready");
});

// ─── HELPER: promisify db queries ─────────────────────────────────────────────
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

// ─── LIVE STOCK PRICES ────────────────────────────────────────────────────────
const STOCK_PRICES = {
  AAPL:  { name: "Apple Inc.",       sector: "Technology",     price: 254.48 },
  TSLA:  { name: "Tesla Inc.",       sector: "EV / Energy",    price: 397.24 },
  GOOGL: { name: "Alphabet Inc.",    sector: "Technology",     price: 307.68 },
  AMZN:  { name: "Amazon.com",       sector: "E-Commerce",     price: 213.55 },
  MSFT:  { name: "Microsoft Corp.",  sector: "Technology",     price: 412.30 },
  NVDA:  { name: "NVIDIA Corp.",     sector: "Semiconductors", price: 875.50 },
  META:  { name: "Meta Platforms",   sector: "Social Media",   price: 521.70 },
  NFLX:  { name: "Netflix Inc.",     sector: "Streaming",      price: 698.40 },
};
const priceChanges = {};
Object.keys(STOCK_PRICES).forEach(sym => priceChanges[sym] = 0);

// Simulate live prices every 2 seconds
setInterval(() => {
  Object.keys(STOCK_PRICES).forEach(sym => {
    const delta = (Math.random() - 0.495) * STOCK_PRICES[sym].price * 0.003;
    STOCK_PRICES[sym].price = parseFloat((STOCK_PRICES[sym].price + delta).toFixed(2));
    priceChanges[sym] = parseFloat((priceChanges[sym] + (Math.random() - 0.5) * 0.08).toFixed(2));
  });
  io.emit("price_update", getPrices());
}, 2000);

function getPrices() {
  const result = {};
  Object.entries(STOCK_PRICES).forEach(([sym, data]) => {
    result[sym] = { ...data, change: priceChanges[sym] };
  });
  return result;
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const result = await dbRun(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );
    const token = jwt.sign({ id: result.lastID, email, name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: result.lastID, name, email, cash: 10000 } });
  } catch (e) {
    if (e.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email already registered" });
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, cash: user.cash } });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await dbGet(
    "SELECT id, name, email, cash, created_at FROM users WHERE id = ?",
    [req.user.id]
  );
  res.json(user);
});

// ─── STOCK ROUTES ─────────────────────────────────────────────────────────────
app.get("/api/stocks", (req, res) => {
  res.json(getPrices());
});

app.get("/api/stocks/:symbol", (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  if (!STOCK_PRICES[sym]) return res.status(404).json({ error: "Stock not found" });
  res.json({ symbol: sym, ...STOCK_PRICES[sym], change: priceChanges[sym] });
});

// ─── PORTFOLIO ROUTES ─────────────────────────────────────────────────────────
app.get("/api/portfolio", authMiddleware, async (req, res) => {
  const holdings = await dbAll(
    "SELECT * FROM portfolio WHERE user_id = ? AND quantity > 0",
    [req.user.id]
  );
  const user = await dbGet("SELECT cash FROM users WHERE id = ?", [req.user.id]);
  const portfolioWithValue = holdings.map(h => ({
    ...h,
    currentPrice: STOCK_PRICES[h.symbol]?.price || 0,
    currentValue: (STOCK_PRICES[h.symbol]?.price || 0) * h.quantity,
    pnl: ((STOCK_PRICES[h.symbol]?.price || 0) - h.avg_buy_price) * h.quantity,
  }));
  res.json({ cash: user.cash, holdings: portfolioWithValue });
});

// ─── TRADE ROUTES ─────────────────────────────────────────────────────────────
app.post("/api/trade", authMiddleware, async (req, res) => {
  const { symbol, type, quantity, orderType = "market" } = req.body;
  const sym = symbol?.toUpperCase();
  if (!sym || !type || !quantity)
    return res.status(400).json({ error: "symbol, type and quantity are required" });
  if (!STOCK_PRICES[sym])
    return res.status(404).json({ error: "Stock not found" });
  if (!["BUY", "SELL"].includes(type))
    return res.status(400).json({ error: "type must be BUY or SELL" });

  const price = STOCK_PRICES[sym].price;
  const total = parseFloat((price * quantity).toFixed(2));
  const user = await dbGet("SELECT * FROM users WHERE id = ?", [req.user.id]);

  try {
    if (type === "BUY") {
      if (user.cash < total)
        return res.status(400).json({ error: "Insufficient balance" });

      await dbRun("UPDATE users SET cash = cash - ? WHERE id = ?", [total, req.user.id]);

      const existing = await dbGet(
        "SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?",
        [req.user.id, sym]
      );
      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = ((existing.avg_buy_price * existing.quantity) + total) / newQty;
        await dbRun(
          "UPDATE portfolio SET quantity = ?, avg_buy_price = ? WHERE user_id = ? AND symbol = ?",
          [newQty, newAvg, req.user.id, sym]
        );
      } else {
        await dbRun(
          "INSERT INTO portfolio (user_id, symbol, quantity, avg_buy_price) VALUES (?, ?, ?, ?)",
          [req.user.id, sym, quantity, price]
        );
      }
    } else {
      const holding = await dbGet(
        "SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?",
        [req.user.id, sym]
      );
      if (!holding || holding.quantity < quantity)
        return res.status(400).json({ error: "Not enough shares" });

      await dbRun("UPDATE users SET cash = cash + ? WHERE id = ?", [total, req.user.id]);
      await dbRun(
        "UPDATE portfolio SET quantity = ? WHERE user_id = ? AND symbol = ?",
        [holding.quantity - quantity, req.user.id, sym]
      );
    }

    const tx = await dbRun(
      "INSERT INTO transactions (user_id, symbol, type, quantity, price, total, order_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.user.id, sym, type, quantity, price, total, orderType]
    );
    const updatedUser = await dbGet("SELECT cash FROM users WHERE id = ?", [req.user.id]);

    res.json({
      success: true,
      transaction: { id: tx.lastID, symbol: sym, type, quantity, price, total, orderType },
      newCash: updatedUser.cash,
    });
  } catch (e) {
    res.status(500).json({ error: "Trade failed: " + e.message });
  }
});

// ─── TRANSACTION HISTORY ──────────────────────────────────────────────────────
app.get("/api/transactions", authMiddleware, async (req, res) => {
  const txs = await dbAll(
    "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(txs);
});

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
app.get("/api/watchlist", authMiddleware, async (req, res) => {
  const items = await dbAll(
    "SELECT symbol, added_at FROM watchlist WHERE user_id = ?",
    [req.user.id]
  );
  res.json(items);
});

app.post("/api/watchlist/:symbol", authMiddleware, async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    await dbRun("INSERT INTO watchlist (user_id, symbol) VALUES (?, ?)", [req.user.id, sym]);
    res.json({ success: true, message: `${sym} added to watchlist` });
  } catch {
    res.status(400).json({ error: "Already in watchlist" });
  }
});

app.delete("/api/watchlist/:symbol", authMiddleware, async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  await dbRun("DELETE FROM watchlist WHERE user_id = ? AND symbol = ?", [req.user.id, sym]);
  res.json({ success: true, message: `${sym} removed from watchlist` });
});

// ─── PENDING ORDERS ───────────────────────────────────────────────────────────
app.get("/api/orders", authMiddleware, async (req, res) => {
  const orders = await dbAll(
    "SELECT * FROM pending_orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(orders);
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  const { symbol, tradeType, orderType, quantity, triggerPrice } = req.body;
  const sym = symbol?.toUpperCase();
  if (!sym || !tradeType || !orderType || !quantity || !triggerPrice)
    return res.status(400).json({ error: "All fields required" });
  const order = await dbRun(
    "INSERT INTO pending_orders (user_id, symbol, trade_type, order_type, quantity, trigger_price) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, sym, tradeType, orderType, quantity, triggerPrice]
  );
  res.json({ success: true, orderId: order.lastID });
});

app.delete("/api/orders/:id", authMiddleware, async (req, res) => {
  await dbRun(
    "DELETE FROM pending_orders WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
app.get("/api/leaderboard", async (req, res) => {
  const leaders = await dbAll(`
    SELECT u.id, u.name,
      COUNT(t.id) as trades,
      COALESCE(SUM(CASE WHEN t.type='SELL' THEN t.total ELSE -t.total END), 0) as pnl
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    GROUP BY u.id
    ORDER BY pnl DESC
    LIMIT 10
  `);
  res.json(leaders);
});

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);
  socket.emit("price_update", getPrices());
  socket.on("disconnect", () => console.log("📡 Client disconnected:", socket.id));
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       TradeX Pro Backend Server       ║
  ║       Running on port ${PORT}            ║
  ╠═══════════════════════════════════════╣
  ║  REST API  →  http://localhost:5000   ║
  ║  WebSocket →  ws://localhost:5000     ║
  ║  Database  →  tradex.db (SQLite)      ║
  ╚═══════════════════════════════════════╝
  `);
});
