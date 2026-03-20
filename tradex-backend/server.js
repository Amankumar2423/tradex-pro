const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors({ origin: "*" }));
app.use(express.json());

const JWT_SECRET = "tradex_pro_secret_2024";

// ─── SIMPLE JSON DATABASE (works everywhere, no native modules) ───────────────
const DB_FILE = path.join(__dirname, "tradex-data.json");

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], transactions: [], watchlist: [], orders: [], nextId: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getNextId() {
  const db = loadDB();
  const id = db.nextId;
  db.nextId += 1;
  saveDB(db);
  return id;
}

console.log("✅ JSON Database ready: tradex-data.json");

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
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  const db = loadDB();
  if (db.users.find(u => u.email === email))
    return res.status(400).json({ error: "Email already registered" });
  const hashed = bcrypt.hashSync(password, 10);
  const user = { id: getNextId(), name, email, password: hashed, cash: 10000, createdAt: new Date().toISOString() };
  db.users.push(user);
  saveDB(db);
  const token = jwt.sign({ id: user.id, email, name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name, email, cash: 10000 } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid email or password" });
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, cash: user.cash } });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, cash: user.cash });
});

// ─── STOCK ROUTES ─────────────────────────────────────────────────────────────
app.get("/api/stocks", (req, res) => res.json(getPrices()));

app.get("/api/stocks/:symbol", (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  if (!STOCK_PRICES[sym]) return res.status(404).json({ error: "Stock not found" });
  res.json({ symbol: sym, ...STOCK_PRICES[sym], change: priceChanges[sym] });
});

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
app.get("/api/portfolio", authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  const userTx = db.transactions.filter(t => t.userId === req.user.id);
  const holdings = {};
  userTx.forEach(t => {
    if (!holdings[t.symbol]) holdings[t.symbol] = { symbol: t.symbol, quantity: 0, avgBuyPrice: 0, totalCost: 0 };
    if (t.type === "BUY") {
      holdings[t.symbol].totalCost += t.total;
      holdings[t.symbol].quantity += t.quantity;
      holdings[t.symbol].avgBuyPrice = holdings[t.symbol].totalCost / holdings[t.symbol].quantity;
    } else {
      holdings[t.symbol].quantity -= t.quantity;
    }
  });
  const activeHoldings = Object.values(holdings)
    .filter(h => h.quantity > 0)
    .map(h => ({
      ...h,
      currentPrice: STOCK_PRICES[h.symbol]?.price || 0,
      currentValue: (STOCK_PRICES[h.symbol]?.price || 0) * h.quantity,
      pnl: ((STOCK_PRICES[h.symbol]?.price || 0) - h.avgBuyPrice) * h.quantity,
    }));
  res.json({ cash: user.cash, holdings: activeHoldings });
});

// ─── TRADE ────────────────────────────────────────────────────────────────────
app.post("/api/trade", authMiddleware, (req, res) => {
  const { symbol, type, quantity, orderType = "market" } = req.body;
  const sym = symbol?.toUpperCase();
  if (!sym || !type || !quantity)
    return res.status(400).json({ error: "symbol, type and quantity are required" });
  if (!STOCK_PRICES[sym])
    return res.status(404).json({ error: "Stock not found" });

  const db = loadDB();
  const userIdx = db.users.findIndex(u => u.id === req.user.id);
  const user = db.users[userIdx];
  const price = STOCK_PRICES[sym].price;
  const total = parseFloat((price * quantity).toFixed(2));

  if (type === "BUY") {
    if (user.cash < total)
      return res.status(400).json({ error: "Insufficient balance" });
    db.users[userIdx].cash = parseFloat((user.cash - total).toFixed(2));
  } else {
    const userTx = db.transactions.filter(t => t.userId === req.user.id && t.symbol === sym);
    let held = 0;
    userTx.forEach(t => { held += t.type === "BUY" ? t.quantity : -t.quantity; });
    if (held < quantity)
      return res.status(400).json({ error: "Not enough shares" });
    db.users[userIdx].cash = parseFloat((user.cash + total).toFixed(2));
  }

  const tx = {
    id: getNextId(), userId: req.user.id, symbol: sym, type,
    quantity, price, total, orderType, createdAt: new Date().toISOString()
  };
  db.transactions.push(tx);
  saveDB(db);
  res.json({ success: true, transaction: tx, newCash: db.users[userIdx].cash });
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
app.get("/api/transactions", authMiddleware, (req, res) => {
  const db = loadDB();
  const txs = db.transactions.filter(t => t.userId === req.user.id).reverse();
  res.json(txs);
});

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
app.get("/api/watchlist", authMiddleware, (req, res) => {
  const db = loadDB();
  const items = db.watchlist.filter(w => w.userId === req.user.id);
  res.json(items);
});

app.post("/api/watchlist/:symbol", authMiddleware, (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const db = loadDB();
  if (db.watchlist.find(w => w.userId === req.user.id && w.symbol === sym))
    return res.status(400).json({ error: "Already in watchlist" });
  db.watchlist.push({ id: getNextId(), userId: req.user.id, symbol: sym, addedAt: new Date().toISOString() });
  saveDB(db);
  res.json({ success: true });
});

app.delete("/api/watchlist/:symbol", authMiddleware, (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const db = loadDB();
  db.watchlist = db.watchlist.filter(w => !(w.userId === req.user.id && w.symbol === sym));
  saveDB(db);
  res.json({ success: true });
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
app.get("/api/orders", authMiddleware, (req, res) => {
  const db = loadDB();
  res.json(db.orders.filter(o => o.userId === req.user.id && o.status === "pending"));
});

app.post("/api/orders", authMiddleware, (req, res) => {
  const { symbol, tradeType, orderType, quantity, triggerPrice } = req.body;
  if (!symbol || !tradeType || !orderType || !quantity || !triggerPrice)
    return res.status(400).json({ error: "All fields required" });
  const db = loadDB();
  const order = { id: getNextId(), userId: req.user.id, symbol: symbol.toUpperCase(), tradeType, orderType, quantity, triggerPrice, status: "pending", createdAt: new Date().toISOString() };
  db.orders.push(order);
  saveDB(db);
  res.json({ success: true, orderId: order.id });
});

app.delete("/api/orders/:id", authMiddleware, (req, res) => {
  const db = loadDB();
  db.orders = db.orders.filter(o => !(o.id === parseInt(req.params.id) && o.userId === req.user.id));
  saveDB(db);
  res.json({ success: true });
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
app.get("/api/leaderboard", (req, res) => {
  const db = loadDB();
  const leaders = db.users.map(u => {
    const txs = db.transactions.filter(t => t.userId === u.id);
    const pnl = txs.reduce((s, t) => s + (t.type === "SELL" ? t.total : -t.total), 0);
    return { id: u.id, name: u.name, trades: txs.length, pnl: parseFloat(pnl.toFixed(2)) };
  }).sort((a, b) => b.pnl - a.pnl).slice(0, 10);
  res.json(leaders);
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "TradeX Pro Backend Running ✅", time: new Date() }));

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
io.on("connection", socket => {
  console.log("📡 Client connected:", socket.id);
  socket.emit("price_update", getPrices());
  socket.on("disconnect", () => console.log("📡 Client disconnected:", socket.id));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       TradeX Pro Backend Server       ║
  ║       Running on port ${PORT}            ║
  ╠═══════════════════════════════════════╣
  ║  REST API  →  http://localhost:${PORT}   ║
  ║  WebSocket →  ws://localhost:${PORT}     ║
  ║  Database  →  tradex-data.json        ║
  ╚═══════════════════════════════════════╝
  `);
});
