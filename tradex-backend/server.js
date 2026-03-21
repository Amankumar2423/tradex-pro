const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors({ origin: "*" }));
app.use(express.json());

const JWT_SECRET = "tradex_pro_secret_2024";
const MONGO_URI = "mongodb+srv://tradexadmin:tradex2024@cluster0.2ft74l3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "tradexdb";

let db;

// ─── CONNECT TO MONGODB ───────────────────────────────────────────────────────
async function connectDB() {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB Atlas!");
    console.log("✅ Database: tradexdb");
  } catch(err) {
    console.error("❌ MongoDB connection error:", err);
    setTimeout(connectDB, 5000);
  }
}
connectDB();

// ─── DB MIDDLEWARE ────────────────────────────────────────────────────────────
function dbCheck(req, res, next) {
  if (!db) return res.status(503).json({ error: "Database connecting, please try again in 30 seconds" });
  next();
}

app.use("/api", dbCheck);
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
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  try {
    const existing = await db.collection("users").findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.collection("users").insertOne({
      name, email, password: hashed, cash: 10000, createdAt: new Date()
    });
    const token = jwt.sign({ id: result.insertedId, email, name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: result.insertedId, name, email, cash: 10000 } });
  } catch(e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection("users").findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, cash: user.cash } });
  } catch(e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user._id, name: user.name, email: user.email, cash: user.cash });
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── STOCK ROUTES ─────────────────────────────────────────────────────────────
app.get("/api/stocks", (req, res) => res.json(getPrices()));

app.get("/api/stocks/:symbol", (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  if (!STOCK_PRICES[sym]) return res.status(404).json({ error: "Stock not found" });
  res.json({ symbol: sym, ...STOCK_PRICES[sym], change: priceChanges[sym] });
});

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
app.get("/api/portfolio", authMiddleware, async (req, res) => {
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    const txs = await db.collection("transactions").find({ userId: req.user.id.toString() }).toArray();
    const holdings = {};
    txs.forEach(t => {
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
  } catch(e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// ─── TRADE ────────────────────────────────────────────────────────────────────
app.post("/api/trade", authMiddleware, async (req, res) => {
  const { symbol, type, quantity, orderType = "market" } = req.body;
  const sym = symbol?.toUpperCase();
  if (!sym || !type || !quantity)
    return res.status(400).json({ error: "symbol, type and quantity required" });
  if (!STOCK_PRICES[sym])
    return res.status(404).json({ error: "Stock not found" });
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    const price = STOCK_PRICES[sym].price;
    const total = parseFloat((price * quantity).toFixed(2));
    if (type === "BUY") {
      if (user.cash < total) return res.status(400).json({ error: "Insufficient balance" });
      await db.collection("users").updateOne({ _id: new ObjectId(req.user.id) }, { $inc: { cash: -total } });
    } else {
      const txs = await db.collection("transactions").find({ userId: req.user.id.toString(), symbol: sym }).toArray();
      let held = 0;
      txs.forEach(t => { held += t.type === "BUY" ? t.quantity : -t.quantity; });
      if (held < quantity) return res.status(400).json({ error: "Not enough shares" });
      await db.collection("users").updateOne({ _id: new ObjectId(req.user.id) }, { $inc: { cash: total } });
    }
    const tx = { userId: req.user.id.toString(), symbol: sym, type, quantity, price, total, orderType, createdAt: new Date() };
    const result = await db.collection("transactions").insertOne(tx);
    const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(req.user.id) });
    res.json({ success: true, transaction: { ...tx, id: result.insertedId }, newCash: updatedUser.cash });
  } catch(e) {
    res.status(500).json({ error: "Trade failed: " + e.message });
  }
});

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
app.get("/api/transactions", authMiddleware, async (req, res) => {
  try {
    const txs = await db.collection("transactions").find({ userId: req.user.id.toString() }).sort({ createdAt: -1 }).toArray();
    res.json(txs);
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
app.get("/api/watchlist", authMiddleware, async (req, res) => {
  try {
    const items = await db.collection("watchlist").find({ userId: req.user.id.toString() }).toArray();
    res.json(items);
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/watchlist/:symbol", authMiddleware, async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const existing = await db.collection("watchlist").findOne({ userId: req.user.id.toString(), symbol: sym });
    if (existing) return res.status(400).json({ error: "Already in watchlist" });
    await db.collection("watchlist").insertOne({ userId: req.user.id.toString(), symbol: sym, addedAt: new Date() });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/watchlist/:symbol", authMiddleware, async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    await db.collection("watchlist").deleteOne({ userId: req.user.id.toString(), symbol: sym });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await db.collection("orders").find({ userId: req.user.id.toString(), status: "pending" }).toArray();
    res.json(orders);
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  const { symbol, tradeType, orderType, quantity, triggerPrice } = req.body;
  if (!symbol || !tradeType || !orderType || !quantity || !triggerPrice)
    return res.status(400).json({ error: "All fields required" });
  try {
    const result = await db.collection("orders").insertOne({
      userId: req.user.id.toString(), symbol: symbol.toUpperCase(),
      tradeType, orderType, quantity, triggerPrice, status: "pending", createdAt: new Date()
    });
    res.json({ success: true, orderId: result.insertedId });
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    await db.collection("orders").deleteOne({ _id: new ObjectId(req.params.id), userId: req.user.id.toString() });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
app.get("/api/leaderboard", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).toArray();
    const leaders = await Promise.all(users.map(async u => {
      const userId = u._id.toString();
      const txs = await db.collection("transactions").find({ 
        $or: [
          { userId: userId },
          { userId: u._id }
        ]
      }).toArray();
      const pnl = txs.reduce((s, t) => s + (t.type === "SELL" ? t.total : -t.total), 0);
      return { 
        id: u._id, 
        name: u.name, 
        email: u.email, 
        trades: txs.length, 
        pnl: parseFloat(pnl.toFixed(2)), 
        cash: u.cash 
      };
    }));
    leaders.sort((a, b) => b.pnl - a.pnl);
    res.json(leaders);
  } catch(e) {
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "TradeX Pro Backend Running ✅", database: "MongoDB Atlas ✅", time: new Date() }));

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
io.on("connection", socket => {
  console.log("📡 Client connected:", socket.id);
  socket.emit("price_update", getPrices());
  socket.on("disconnect", () => console.log("📡 Disconnected:", socket.id));
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
  ║  Database  →  MongoDB Atlas           ║
  ╚═══════════════════════════════════════╝
  `);
});
