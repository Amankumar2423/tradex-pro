import { useState, useEffect, useRef } from "react";

const BASE_URL = "http://localhost:5000/api";
const ADMIN_CREDENTIALS = { email: "admin@tradex.pro", password: "admin123" };

const T = {
  bg: "#0a0e1a", surface: "#0f1629", card: "#141e35", border: "#1e2d4a",
  accent: "#3b82f6", green: "#10b981", red: "#ef4444", yellow: "#f59e0b",
  purple: "#8b5cf6", cyan: "#06b6d4", orange: "#f97316",
  text: "#e2e8f0", muted: "#64748b", bright: "#f8fafc",
};

const MOCK_USERS = [
  { id:1, name:"Alex Morgan",  email:"demo@tradex.pro",   cash:7204.50, trades:7,  status:"active",  joined:"2026-03-01" },
  { id:2, name:"Sarah K.",     email:"sarah@email.com",   cash:1580.20, trades:47, status:"active",  joined:"2026-02-15" },
  { id:3, name:"Rahul M.",     email:"rahul@email.com",   cash:3690.00, trades:38, status:"active",  joined:"2026-02-20" },
  { id:4, name:"Priya S.",     email:"priya@email.com",   cash:5810.50, trades:55, status:"suspended",joined:"2026-02-10"},
  { id:5, name:"James T.",     email:"james@email.com",   cash:6250.00, trades:29, status:"active",  joined:"2026-03-05" },
  { id:6, name:"Li Wei",       email:"liwei@email.com",   cash:7020.00, trades:41, status:"active",  joined:"2026-02-28" },
];

const MOCK_TRANSACTIONS = [
  { id:1,  user:"Alex Morgan",  symbol:"AAPL",  type:"BUY",  qty:10, price:254.48, total:2544.80, time:"10:05:11" },
  { id:2,  user:"Sarah K.",     symbol:"NVDA",  type:"BUY",  qty:5,  price:875.50, total:4377.50, time:"10:12:33" },
  { id:3,  user:"Rahul M.",     symbol:"TSLA",  type:"SELL", qty:3,  price:397.24, total:1191.72, time:"10:18:47" },
  { id:4,  user:"Alex Morgan",  symbol:"MSFT",  type:"BUY",  qty:5,  price:412.30, total:2061.50, time:"10:22:15" },
  { id:5,  user:"James T.",     symbol:"GOOGL", type:"BUY",  qty:8,  price:307.68, total:2461.44, time:"10:31:02" },
  { id:6,  user:"Li Wei",       symbol:"META",  type:"SELL", qty:2,  price:521.70, total:1043.40, time:"10:45:18" },
  { id:7,  user:"Sarah K.",     symbol:"AAPL",  type:"SELL", qty:3,  price:256.10, total:768.30,  time:"11:02:44" },
  { id:8,  user:"Rahul M.",     symbol:"AMZN",  type:"BUY",  qty:10, price:213.55, total:2135.50, time:"11:15:30" },
];

let MOCK_STOCKS = {
  AAPL:  { name:"Apple Inc.",       sector:"Technology",     price:254.48, active:true  },
  TSLA:  { name:"Tesla Inc.",       sector:"EV / Energy",    price:397.24, active:true  },
  GOOGL: { name:"Alphabet Inc.",    sector:"Technology",     price:307.68, active:true  },
  AMZN:  { name:"Amazon.com",       sector:"E-Commerce",     price:213.55, active:true  },
  MSFT:  { name:"Microsoft Corp.",  sector:"Technology",     price:412.30, active:true  },
  NVDA:  { name:"NVIDIA Corp.",     sector:"Semiconductors", price:875.50, active:true  },
  META:  { name:"Meta Platforms",   sector:"Social Media",   price:521.70, active:true  },
  NFLX:  { name:"Netflix Inc.",     sector:"Streaming",      price:698.40, active:true  },
};

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"18px 20px", borderTop:`3px solid ${color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, color:T.muted, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:28 }}>{icon}</div>
      </div>
    </div>
  );
}

function Badge({ label, color }) {
  return <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:color+"22", color, fontWeight:700 }}>{label}</span>;
}

function MiniBar({ value, max, color }) {
  return (
    <div style={{ height:6, background:T.surface, borderRadius:3, overflow:"hidden", width:"100%" }}>
      <div style={{ height:"100%", width:`${Math.min(100,(value/max)*100)}%`, background:color, borderRadius:3, transition:"width 0.5s" }}/>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("admin@tradex.pro");
  const [pass, setPass] = useState("admin123");
  const [err, setErr] = useState("");
  const inp = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", color:T.text, fontSize:14, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box", marginBottom:12 };
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
      <div style={{ width:"100%", maxWidth:400, padding:16 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, background:`linear-gradient(135deg,${T.accent},${T.purple})`, borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>⚙️</div>
          <div style={{ fontSize:26, fontWeight:800, color:T.bright }}>TradeX Admin</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:6 }}>Administration Panel</div>
        </div>
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:18, padding:28 }}>
          <div style={{ fontSize:13, color:T.muted, marginBottom:16 }}>Admin credentials required</div>
          <input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin Email"/>
          <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password"/>
          {err && <div style={{ color:T.red, fontSize:12, marginBottom:10 }}>{err}</div>}
          <button onClick={()=>{ if(email===ADMIN_CREDENTIALS.email&&pass===ADMIN_CREDENTIALS.password) onLogin(); else setErr("Invalid admin credentials"); }}
            style={{ width:"100%", background:`linear-gradient(135deg,${T.accent},${T.purple})`, color:"#fff", border:"none", borderRadius:10, padding:"13px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            LOGIN AS ADMIN →
          </button>
          <div style={{ textAlign:"center", marginTop:14, fontSize:11, color:T.muted }}>admin@tradex.pro / admin123</div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsChart({ data, color, label }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const PAD = { l:50, r:16, t:16, b:30 };
    const cW = W-PAD.l-PAD.r, cH = H-PAD.t-PAD.b;
    const min = Math.min(...data)*0.95, max = Math.max(...data)*1.05, range = max-min||1;
    const toX = i => PAD.l+(i/(data.length-1))*cW;
    const toY = v => PAD.t+cH-((v-min)/range)*cH;
    ctx.strokeStyle = "#1e2d4a"; ctx.lineWidth = 0.5;
    for(let i=0;i<=4;i++){
      const y=PAD.t+(i/4)*cH;
      ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(W-PAD.r,y); ctx.stroke();
      ctx.fillStyle=T.muted; ctx.font="9px monospace"; ctx.textAlign="right";
      ctx.fillText((max-(i/4)*range).toFixed(0), PAD.l-4, y+3);
    }
    ctx.beginPath(); ctx.moveTo(toX(0),toY(data[0]));
    data.forEach((v,i)=>i>0&&ctx.lineTo(toX(i),toY(v)));
    ctx.lineTo(toX(data.length-1),PAD.t+cH); ctx.lineTo(PAD.l,PAD.t+cH); ctx.closePath();
    const grad=ctx.createLinearGradient(0,PAD.t,0,PAD.t+cH);
    grad.addColorStop(0,color+"33"); grad.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=2.5;
    data.forEach((v,i)=>i===0?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)));
    ctx.stroke();
    const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    ctx.fillStyle=T.muted; ctx.font="9px monospace"; ctx.textAlign="center";
    data.forEach((_,i)=>{ if(i%Math.ceil(data.length/7)===0) ctx.fillText(days[Math.floor(i/data.length*7)]||"", toX(i), H-8); });
  },[data,color]);
  return <canvas ref={canvasRef} width={600} height={180} style={{ width:"100%", height:180, display:"block", borderRadius:8 }}/>;
}

export default function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState(MOCK_USERS);
  const [stocks, setStocks] = useState(MOCK_STOCKS);
  const [transactions] = useState(MOCK_TRANSACTIONS);
  const [prices, setPrices] = useState(()=>Object.fromEntries(Object.keys(MOCK_STOCKS).map(k=>[k,MOCK_STOCKS[k].price])));
  const [toast, setToast] = useState(null);
  const [newStock, setNewStock] = useState({ symbol:"", name:"", sector:"", price:"" });
  const [resetUser, setResetUser] = useState(null);
  const [resetAmount, setResetAmount] = useState(10000);
  const [liveTransactions, setLiveTransactions] = useState(MOCK_TRANSACTIONS);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  useEffect(()=>{
    const tick = setInterval(()=>{
      setPrices(prev=>{
        const next={};
        Object.keys(prev).forEach(k=>{ next[k]=parseFloat((prev[k]+(Math.random()-.495)*prev[k]*.003).toFixed(2)); });
        return next;
      });
      const syms=Object.keys(MOCK_STOCKS);
      const names=MOCK_USERS.map(u=>u.name);
      const types=["BUY","SELL"];
      if(Math.random()>0.4){
        const newTx = {
          id: Date.now(),
          user: names[Math.floor(Math.random()*names.length)],
          symbol: syms[Math.floor(Math.random()*syms.length)],
          type: types[Math.floor(Math.random()*2)],
          qty: Math.floor(Math.random()*10)+1,
          price: parseFloat((200+Math.random()*700).toFixed(2)),
          total: 0,
          time: new Date().toLocaleTimeString(),
        };
        newTx.total = parseFloat((newTx.price*newTx.qty).toFixed(2));
        setLiveTransactions(prev=>[newTx,...prev].slice(0,50));
      }
    },2000);
    return ()=>clearInterval(tick);
  },[]);

  const totalUsers = users.length;
  const activeUsers = users.filter(u=>u.status==="active").length;
  const suspendedUsers = users.filter(u=>u.status==="suspended").length;
  const totalTrades = liveTransactions.length;
  const totalVolume = liveTransactions.reduce((s,t)=>s+t.total,0);
  const totalCash = users.reduce((s,u)=>s+u.cash,0);
  const platformRevenue = totalVolume * 0.001;

  const revenueData = Array.from({length:30},(_,i)=>800+Math.sin(i*0.3)*200+Math.random()*150+i*12);
  const tradesData = Array.from({length:30},(_,i)=>20+Math.random()*30+i*0.5);
  const usersData = Array.from({length:30},(_,i)=>i+1+Math.floor(Math.random()*2));

  const toggleSuspend = (id) => {
    setUsers(prev=>prev.map(u=>u.id===id?{...u,status:u.status==="active"?"suspended":"active"}:u));
    const u=users.find(x=>x.id===id);
    showToast(`${u.name} ${u.status==="active"?"suspended":"activated"}`, u.status==="active"?"error":"success");
  };

  const handleResetBalance = (user) => { setResetUser(user); setResetAmount(10000); };

  const confirmReset = () => {
    setUsers(prev=>prev.map(u=>u.id===resetUser.id?{...u,cash:parseFloat(resetAmount)}:u));
    showToast(`${resetUser.name}'s balance reset to $${parseFloat(resetAmount).toLocaleString()}`);
    setResetUser(null);
  };

  const toggleStock = (sym) => {
    setStocks(prev=>({...prev,[sym]:{...prev[sym],active:!prev[sym].active}}));
    showToast(`${sym} ${stocks[sym].active?"removed from":"added to"} platform`, stocks[sym].active?"error":"success");
  };

  const addStock = () => {
    if(!newStock.symbol||!newStock.name||!newStock.price) return showToast("Fill all fields","error");
    const sym = newStock.symbol.toUpperCase();
    setStocks(prev=>({...prev,[sym]:{name:newStock.name,sector:newStock.sector||"Other",price:parseFloat(newStock.price),active:true}}));
    setPrices(prev=>({...prev,[sym]:parseFloat(newStock.price)}));
    setNewStock({symbol:"",name:"",sector:"",price:""});
    showToast(`${sym} added to platform!`);
  };

  const NAV = [
    {id:"overview",icon:"📊",label:"Overview"},
    {id:"users",icon:"👥",label:"Users"},
    {id:"trades",icon:"⚡",label:"Live Trades"},
    {id:"stocks",icon:"📈",label:"Stocks"},
    {id:"transactions",icon:"📋",label:"Transactions"},
    {id:"analytics",icon:"📉",label:"Analytics"},
  ];

  const S = {
    card: { background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 20px" },
    inp: { background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 13px", color:T.text, fontSize:12, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" },
    btn: (c) => ({ background:c+"22", color:c, border:`1px solid ${c}`, borderRadius:7, padding:"5px 13px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }),
    lbl: { fontSize:9, color:T.muted, letterSpacing:1, textTransform:"uppercase", marginBottom:4 },
  };

  if(!loggedIn) return <AdminLogin onLogin={()=>setLoggedIn(true)}/>;

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'IBM Plex Mono','Courier New',monospace", color:T.text }}>

      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:200, background:{success:"#052e16",error:"#2d0a0a",warning:"#2d1f00"}[toast.type]||"#052e16", border:`1px solid ${{success:T.green,error:T.red,warning:T.yellow}[toast.type]||T.green}`, borderRadius:10, padding:"12px 20px", color:{success:T.green,error:T.red,warning:T.yellow}[toast.type]||T.green, fontSize:13, fontWeight:700, boxShadow:"0 4px 24px rgba(0,0,0,0.6)", maxWidth:320 }}>
          {toast.msg}
        </div>
      )}

      {resetUser && (
        <div onClick={()=>setResetUser(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:28, width:360 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>Reset Balance</div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:18 }}>Reset {resetUser.name}'s cash balance</div>
            <div style={{ ...S.lbl, marginBottom:6 }}>New Balance ($)</div>
            <input type="number" value={resetAmount} onChange={e=>setResetAmount(e.target.value)} style={{ ...S.inp, fontSize:18, fontWeight:800, marginBottom:18 }}/>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setResetUser(null)} style={{ flex:1, background:"transparent", color:T.muted, border:`1px solid ${T.border}`, borderRadius:8, padding:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={confirmReset} style={{ flex:2, background:T.accent+"22", color:T.accent, border:`1px solid ${T.accent}`, borderRadius:8, padding:12, cursor:"pointer", fontFamily:"inherit", fontWeight:800 }}>Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${T.accent},${T.purple})`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⚙️</div>
          <span style={{ fontWeight:800, fontSize:14 }}>TradeX Admin</span>
          <span style={{ fontSize:9, background:"#052e16", color:T.green, borderRadius:4, padding:"2px 6px", fontWeight:700 }}>● ADMIN</span>
        </div>
        <div style={{ display:"flex", gap:2 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:tab===n.id?T.card:"transparent", color:tab===n.id?T.accent:T.muted, border:tab===n.id?`1px solid ${T.border}`:"1px solid transparent", borderRadius:7, padding:"4px 11px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:tab===n.id?700:400 }}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:T.muted }}>Platform Revenue</div>
            <div style={{ fontSize:13, fontWeight:800, color:T.green }}>${platformRevenue.toFixed(2)}</div>
          </div>
          <button onClick={()=>setLoggedIn(false)} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:7, padding:"5px 10px", fontSize:11, cursor:"pointer", color:T.muted, fontFamily:"inherit" }}>Logout</button>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${T.accent},${T.purple})`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>AD</div>
        </div>
      </div>

      <div style={{ padding:"18px 20px", maxWidth:1440, margin:"0 auto" }}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              <StatCard label="Total Users" value={totalUsers} color={T.accent} icon="👥" sub={`${activeUsers} active · ${suspendedUsers} suspended`}/>
              <StatCard label="Total Trades" value={totalTrades} color={T.green} icon="⚡" sub="All time"/>
              <StatCard label="Trading Volume" value={`$${(totalVolume/1000).toFixed(1)}K`} color={T.purple} icon="💹" sub="Platform total"/>
              <StatCard label="Platform Revenue" value={`$${platformRevenue.toFixed(2)}`} color={T.yellow} icon="💰" sub="0.1% per trade"/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div style={S.card}>
                <div style={{ fontSize:11, fontWeight:800, color:T.accent, marginBottom:14, letterSpacing:.8 }}>📊 REVENUE THIS MONTH</div>
                <AnalyticsChart data={revenueData} color={T.accent} label="Revenue"/>
              </div>
              <div style={S.card}>
                <div style={{ fontSize:11, fontWeight:800, color:T.green, marginBottom:14, letterSpacing:.8 }}>⚡ DAILY TRADES</div>
                <AnalyticsChart data={tradesData} color={T.green} label="Trades"/>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div style={S.card}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:12, letterSpacing:.8, textTransform:"uppercase" }}>Top Traders</div>
                {[...users].sort((a,b)=>b.trades-a.trades).slice(0,5).map((u,i)=>(
                  <div key={u.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, color:[T.yellow,T.muted,"#cd7f32"][i]||T.muted }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:12 }}>{u.name}</div>
                        <div style={{ fontSize:10, color:T.muted }}>{u.trades} trades</div>
                      </div>
                    </div>
                    <Badge label={u.status} color={u.status==="active"?T.green:T.red}/>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:12, letterSpacing:.8, textTransform:"uppercase" }}>Most Traded Stocks</div>
                {Object.keys(stocks).slice(0,5).map((sym,i)=>{
                  const count = liveTransactions.filter(t=>t.symbol===sym).length;
                  return(
                    <div key={sym} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                        <span style={{ fontWeight:700, color:T.accent }}>{sym}</span>
                        <span style={{ color:T.muted }}>{count} trades</span>
                      </div>
                      <MiniBar value={count} max={10} color={[T.accent,T.green,T.purple,T.yellow,T.cyan][i]}/>
                    </div>
                  );
                })}
              </div>

              <div style={S.card}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:12, letterSpacing:.8, textTransform:"uppercase" }}>Platform Stats</div>
                {[
                  {l:"Active Stocks",v:Object.values(stocks).filter(s=>s.active).length,c:T.green},
                  {l:"Total Cash in Platform",v:`$${(totalCash/1000).toFixed(1)}K`,c:T.accent},
                  {l:"Avg Trades per User",v:(totalTrades/totalUsers).toFixed(1),c:T.purple},
                  {l:"Suspended Users",v:suspendedUsers,c:T.red},
                  {l:"Pending Orders",v:4,c:T.yellow},
                ].map(s=>(
                  <div key={s.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                    <span style={{ color:T.muted }}>{s.l}</span>
                    <span style={{ fontWeight:700, color:s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ USERS ══ */}
        {tab==="users" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:11, marginBottom:18 }}>
              <StatCard label="Total Users" value={totalUsers} color={T.accent} icon="👥"/>
              <StatCard label="Active" value={activeUsers} color={T.green} icon="✅"/>
              <StatCard label="Suspended" value={suspendedUsers} color={T.red} icon="🚫"/>
              <StatCard label="Total Cash" value={`$${(totalCash/1000).toFixed(1)}K`} color={T.purple} icon="💰"/>
            </div>

            <div style={{ display:"grid", gap:6 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr 1.5fr", padding:"6px 14px", fontSize:9, color:T.muted, letterSpacing:.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>
                <div>User</div><div>Email</div><div style={{textAlign:"right"}}>Cash</div><div style={{textAlign:"right"}}>Trades</div><div>Status</div><div>Joined</div><div style={{textAlign:"right"}}>Actions</div>
              </div>
              {users.map(u=>(
                <div key={u.id} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr 1.5fr", padding:"12px 14px", ...S.card, alignItems:"center", gap:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:T.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:T.accent }}>
                      {u.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12 }}>{u.name}</div>
                      <div style={{ fontSize:10, color:T.muted }}>ID #{u.id}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:T.muted }}>{u.email}</div>
                  <div style={{ textAlign:"right", fontWeight:700, fontSize:12, color:T.green }}>${u.cash.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
                  <div style={{ textAlign:"right", fontWeight:700, fontSize:12 }}>{u.trades}</div>
                  <div><Badge label={u.status} color={u.status==="active"?T.green:T.red}/></div>
                  <div style={{ fontSize:11, color:T.muted }}>{u.joined}</div>
                  <div style={{ display:"flex", gap:5, justifyContent:"flex-end" }}>
                    <button onClick={()=>handleResetBalance(u)} style={{ ...S.btn(T.yellow), padding:"4px 9px", fontSize:10 }}>💰 Reset</button>
                    <button onClick={()=>toggleSuspend(u.id)} style={{ ...S.btn(u.status==="active"?T.red:T.green), padding:"4px 9px", fontSize:10 }}>
                      {u.status==="active"?"🚫 Ban":"✅ Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LIVE TRADES ══ */}
        {tab==="trades" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <div style={{ fontSize:11, fontWeight:800, color:T.green }}>● LIVE</div>
              <div style={{ fontSize:12, color:T.muted }}>Trades updating every 2 seconds</div>
              <div style={{ marginLeft:"auto", ...S.card, padding:"6px 14px" }}>
                <span style={{ fontSize:11, color:T.muted }}>Total today: </span>
                <span style={{ fontWeight:800, color:T.accent }}>{liveTransactions.length} trades</span>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:11, marginBottom:18 }}>
              <StatCard label="Buy Orders" value={liveTransactions.filter(t=>t.type==="BUY").length} color={T.green} icon="📈"/>
              <StatCard label="Sell Orders" value={liveTransactions.filter(t=>t.type==="SELL").length} color={T.red} icon="📉"/>
              <StatCard label="Total Volume" value={`$${(liveTransactions.reduce((s,t)=>s+t.total,0)/1000).toFixed(1)}K`} color={T.purple} icon="💹"/>
              <StatCard label="Unique Traders" value={new Set(liveTransactions.map(t=>t.user)).size} color={T.accent} icon="👤"/>
            </div>

            <div style={{ display:"grid", gap:5 }}>
              <div style={{ display:"grid", gridTemplateColumns:"80px 1.5fr 1fr 1fr 1fr 1fr 1fr", padding:"6px 14px", fontSize:9, color:T.muted, letterSpacing:.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>
                <div>Type</div><div>User</div><div>Symbol</div><div style={{textAlign:"right"}}>Qty</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Total</div><div style={{textAlign:"right"}}>Time</div>
              </div>
              {liveTransactions.slice(0,20).map((t,i)=>(
                <div key={t.id} style={{ display:"grid", gridTemplateColumns:"80px 1.5fr 1fr 1fr 1fr 1fr 1fr", padding:"10px 14px", ...S.card, alignItems:"center", fontSize:12, opacity:i===0?1:i<3?0.9:0.8, transition:"opacity 0.3s" }}>
                  <Badge label={t.type} color={t.type==="BUY"?T.green:T.red}/>
                  <div style={{ fontWeight:700 }}>{t.user}</div>
                  <div style={{ fontWeight:800, color:T.accent }}>{t.symbol}</div>
                  <div style={{ textAlign:"right" }}>{t.qty}sh</div>
                  <div style={{ textAlign:"right" }}>${t.price.toFixed(2)}</div>
                  <div style={{ textAlign:"right", fontWeight:700 }}>${t.total.toFixed(2)}</div>
                  <div style={{ textAlign:"right", color:T.muted, fontSize:10 }}>{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ STOCKS ══ */}
        {tab==="stocks" && (
          <div>
            <div style={{ ...S.card, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:800, marginBottom:14 }}>➕ Add New Stock</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:10, alignItems:"end" }}>
                <div>
                  <div style={S.lbl}>Symbol</div>
                  <input value={newStock.symbol} onChange={e=>setNewStock(p=>({...p,symbol:e.target.value.toUpperCase()}))} placeholder="e.g. UBER" style={S.inp}/>
                </div>
                <div>
                  <div style={S.lbl}>Company Name</div>
                  <input value={newStock.name} onChange={e=>setNewStock(p=>({...p,name:e.target.value}))} placeholder="e.g. Uber Technologies" style={S.inp}/>
                </div>
                <div>
                  <div style={S.lbl}>Sector</div>
                  <input value={newStock.sector} onChange={e=>setNewStock(p=>({...p,sector:e.target.value}))} placeholder="e.g. Transport" style={S.inp}/>
                </div>
                <div>
                  <div style={S.lbl}>Initial Price ($)</div>
                  <input type="number" value={newStock.price} onChange={e=>setNewStock(p=>({...p,price:e.target.value}))} placeholder="e.g. 75.50" style={S.inp}/>
                </div>
                <button onClick={addStock} style={{ ...S.btn(T.green), padding:"9px 18px", fontSize:12, whiteSpace:"nowrap" }}>Add Stock</button>
              </div>
            </div>

            <div style={{ display:"grid", gap:6 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1.2fr 1fr 1fr 1fr 1fr", padding:"6px 14px", fontSize:9, color:T.muted, letterSpacing:.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>
                <div>Symbol</div><div>Company</div><div>Sector</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Trades</div><div>Status</div><div style={{textAlign:"right"}}>Action</div>
              </div>
              {Object.entries(stocks).map(([sym,data])=>{
                const tradeCount = liveTransactions.filter(t=>t.symbol===sym).length;
                return(
                  <div key={sym} style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1.2fr 1fr 1fr 1fr 1fr", padding:"12px 14px", ...S.card, alignItems:"center", gap:6 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:T.accent }}>{sym}</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:12 }}>{data.name}</div>
                    </div>
                    <Badge label={data.sector} color={T.purple}/>
                    <div style={{ textAlign:"right", fontWeight:700, fontSize:13 }}>${prices[sym]?.toFixed(2)||data.price.toFixed(2)}</div>
                    <div style={{ textAlign:"right", fontSize:12, color:T.muted }}>{tradeCount}</div>
                    <Badge label={data.active?"Active":"Disabled"} color={data.active?T.green:T.red}/>
                    <div style={{ textAlign:"right" }}>
                      <button onClick={()=>toggleStock(sym)} style={{ ...S.btn(data.active?T.red:T.green), padding:"4px 10px", fontSize:10 }}>
                        {data.active?"Disable":"Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ TRANSACTIONS ══ */}
        {tab==="transactions" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:12, color:T.muted }}>{liveTransactions.length} total transactions</div>
              <button onClick={()=>{
                const rows=["User,Symbol,Type,Qty,Price,Total,Time",...liveTransactions.map(t=>`${t.user},${t.symbol},${t.type},${t.qty},${t.price},${t.total},${t.time}`)].join("\n");
                const a=document.createElement("a");
                a.href=URL.createObjectURL(new Blob([rows],{type:"text/csv"}));
                a.download="all_transactions.csv"; a.click();
                showToast("All transactions exported!");
              }} style={{ ...S.btn(T.green), padding:"7px 16px" }}>⬇ Export All CSV</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:11, marginBottom:18 }}>
              <StatCard label="Total Buy Volume" value={`$${(liveTransactions.filter(t=>t.type==="BUY").reduce((s,t)=>s+t.total,0)/1000).toFixed(1)}K`} color={T.green} icon="📈"/>
              <StatCard label="Total Sell Volume" value={`$${(liveTransactions.filter(t=>t.type==="SELL").reduce((s,t)=>s+t.total,0)/1000).toFixed(1)}K`} color={T.red} icon="📉"/>
              <StatCard label="Platform Fees" value={`$${(liveTransactions.reduce((s,t)=>s+t.total,0)*0.001).toFixed(2)}`} color={T.yellow} icon="💰"/>
            </div>

            <div style={{ display:"grid", gap:5 }}>
              <div style={{ display:"grid", gridTemplateColumns:"70px 1.5fr 1fr 1fr 1fr 1fr 1fr", padding:"6px 14px", fontSize:9, color:T.muted, letterSpacing:.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}` }}>
                <div>Type</div><div>User</div><div>Symbol</div><div style={{textAlign:"right"}}>Qty</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Total</div><div style={{textAlign:"right"}}>Time</div>
              </div>
              {liveTransactions.map(t=>(
                <div key={t.id} style={{ display:"grid", gridTemplateColumns:"70px 1.5fr 1fr 1fr 1fr 1fr 1fr", padding:"10px 14px", ...S.card, alignItems:"center", fontSize:12 }}>
                  <Badge label={t.type} color={t.type==="BUY"?T.green:T.red}/>
                  <div style={{ fontWeight:700 }}>{t.user}</div>
                  <div style={{ fontWeight:800, color:T.accent }}>{t.symbol}</div>
                  <div style={{ textAlign:"right" }}>{t.qty}sh</div>
                  <div style={{ textAlign:"right" }}>${t.price.toFixed(2)}</div>
                  <div style={{ textAlign:"right", fontWeight:700 }}>${t.total.toFixed(2)}</div>
                  <div style={{ textAlign:"right", color:T.muted, fontSize:10 }}>{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ ANALYTICS ══ */}
        {tab==="analytics" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:11, marginBottom:18 }}>
              <StatCard label="Monthly Revenue" value={`$${revenueData.reduce((a,b)=>a+b,0).toFixed(0)}`} color={T.accent} icon="💹"/>
              <StatCard label="Total Trades" value={tradesData.reduce((a,b)=>a+b,0).toFixed(0)} color={T.green} icon="⚡"/>
              <StatCard label="New Users" value={usersData[usersData.length-1]} color={T.purple} icon="👥"/>
              <StatCard label="Avg Daily Volume" value={`$${(totalVolume/30/1000).toFixed(1)}K`} color={T.yellow} icon="📊"/>
            </div>

            <div style={{ display:"grid", gap:14 }}>
              <div style={S.card}>
                <div style={{ fontSize:11, fontWeight:800, color:T.accent, marginBottom:14, letterSpacing:.8 }}>💹 PLATFORM REVENUE — LAST 30 DAYS</div>
                <AnalyticsChart data={revenueData} color={T.accent}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={S.card}>
                  <div style={{ fontSize:11, fontWeight:800, color:T.green, marginBottom:14, letterSpacing:.8 }}>⚡ DAILY TRADES</div>
                  <AnalyticsChart data={tradesData} color={T.green}/>
                </div>
                <div style={S.card}>
                  <div style={{ fontSize:11, fontWeight:800, color:T.purple, marginBottom:14, letterSpacing:.8 }}>👥 USER GROWTH</div>
                  <AnalyticsChart data={usersData} color={T.purple}/>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div style={S.card}>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:12, letterSpacing:.8, textTransform:"uppercase" }}>Buy vs Sell Ratio</div>
                  {[["BUY Orders",liveTransactions.filter(t=>t.type==="BUY").length,T.green],["SELL Orders",liveTransactions.filter(t=>t.type==="SELL").length,T.red]].map(([l,v,c])=>(
                    <div key={l} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ fontWeight:700 }}>{l}</span>
                        <span style={{ color:T.muted }}>{v} ({((v/liveTransactions.length)*100).toFixed(1)}%)</span>
                      </div>
                      <MiniBar value={v} max={liveTransactions.length} color={c}/>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:12, letterSpacing:.8, textTransform:"uppercase" }}>Stock Popularity</div>
                  {Object.keys(stocks).map((sym,i)=>{
                    const count=liveTransactions.filter(t=>t.symbol===sym).length;
                    const colors=[T.accent,T.green,T.purple,T.yellow,T.cyan,T.orange,T.red,"#ec4899"];
                    return(
                      <div key={sym} style={{ marginBottom:9 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                          <span style={{ fontWeight:700, color:colors[i] }}>{sym}</span>
                          <span style={{ color:T.muted }}>{count} trades</span>
                        </div>
                        <MiniBar value={count} max={15} color={colors[i]}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
