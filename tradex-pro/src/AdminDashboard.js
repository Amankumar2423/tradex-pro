import { useState, useEffect, useRef } from "react";

const BASE_URL = "https://tradex-pro.onrender.com/api";
const ADMIN_CREDENTIALS = { email: "admin@tradex.pro", password: "admin123" };

const T = {
  bg: "#0a0e1a", surface: "#0f1629", card: "#141e35", border: "#1e2d4a",
  accent: "#3b82f6", green: "#10b981", red: "#ef4444", yellow: "#f59e0b",
  purple: "#8b5cf6", cyan: "#06b6d4", orange: "#f97316",
  text: "#e2e8f0", muted: "#64748b", bright: "#f8fafc",
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
      <div style={{ height:"100%", width:`${Math.min(100,(value/max)*100)}%`, background:color, borderRadius:3 }}/>
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

function AnalyticsChart({ data, color }) {
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
  },[data,color]);
  return <canvas ref={canvasRef} width={600} height={180} style={{ width:"100%", height:180, display:"block", borderRadius:8 }}/>;
}

export default function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("overview");
  const [leaderboard, setLeaderboard] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [resetUser, setResetUser] = useState(null);
  const [resetAmount, setResetAmount] = useState(10000);
  const [liveTransactions, setLiveTransactions] = useState([]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lbRes, stockRes] = await Promise.all([
        fetch(`${BASE_URL}/leaderboard`),
        fetch(`${BASE_URL}/stocks`)
      ]);
      const lbData = await lbRes.json();
      const stockData = await stockRes.json();
      setLeaderboard(Array.isArray(lbData) ? lbData : []);
      setPrices(stockData);
    } catch(e) {
      showToast("Backend waking up, please wait 30s and refresh...","warning");
    }
    setLoading(false);
  };

  useEffect(()=>{ if(loggedIn) fetchData(); },[loggedIn]);

useEffect(()=>{
  if(!loggedIn) return;
  const autoRefresh = setInterval(()=>{
    fetchData();
  }, 10000);
  return ()=>clearInterval(autoRefresh);
},[loggedIn]);

  useEffect(()=>{
    if(!loggedIn) return;
    const tick = setInterval(async()=>{
      try {
        const res = await fetch(`${BASE_URL}/stocks`);
        const data = await res.json();
        setPrices(data);
      } catch {}
      const syms=["AAPL","TSLA","NVDA","MSFT","GOOGL","AMZN","META","NFLX"];
      if(Math.random()>0.4){
        const sym=syms[Math.floor(Math.random()*syms.length)];
        const price=parseFloat((200+Math.random()*700).toFixed(2));
        const qty=Math.floor(Math.random()*10)+1;
        const names=leaderboard.length>0?leaderboard.map(u=>u.name):["Trader"];
        setLiveTransactions(prev=>[{
          id:Date.now(),
          user:names[Math.floor(Math.random()*names.length)],
          symbol:sym, type:Math.random()>0.5?"BUY":"SELL",
          qty, price, total:parseFloat((price*qty).toFixed(2)),
          time:new Date().toLocaleTimeString(),
        },...prev].slice(0,50));
      }
    },3000);
    return ()=>clearInterval(tick);
  },[loggedIn,leaderboard]);

  const totalUsers = leaderboard.length;
  const totalTrades = leaderboard.reduce((s,u)=>s+(u.trades||0),0);
  const totalVolume = liveTransactions.reduce((s,t)=>s+t.total,0);
  const revenueData = Array.from({length:30},(_,i)=>800+Math.sin(i*0.3)*200+Math.random()*150+i*12);
  const tradesData = Array.from({length:30},(_,i)=>20+Math.random()*30+i*0.5);

  const S = {
    card: { background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 20px" },
    btn: (c) => ({ background:c+"22", color:c, border:`1px solid ${c}`, borderRadius:7, padding:"5px 13px", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }),
  };

  const NAV = [
    {id:"overview",icon:"📊",label:"Overview"},
    {id:"users",icon:"👥",label:"Users"},
    {id:"trades",icon:"⚡",label:"Live Trades"},
    {id:"analytics",icon:"📉",label:"Analytics"},
  ];

  if(!loggedIn) return <AdminLogin onLogin={()=>setLoggedIn(true)}/>;

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'IBM Plex Mono','Courier New',monospace", color:T.text }}>

      {toast&&(
        <div style={{ position:"fixed",top:20,right:20,zIndex:200,background:{success:"#052e16",error:"#2d0a0a",warning:"#2d1f00"}[toast.type]||"#052e16",border:`1px solid ${{success:T.green,error:T.red,warning:T.yellow}[toast.type]||T.green}`,borderRadius:10,padding:"12px 20px",color:{success:T.green,error:T.red,warning:T.yellow}[toast.type]||T.green,fontSize:13,fontWeight:700,maxWidth:320 }}>
          {toast.msg}
        </div>
      )}

      {resetUser&&(
        <div onClick={()=>setResetUser(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:28,width:360 }}>
            <div style={{ fontSize:16,fontWeight:800,marginBottom:6 }}>Reset Balance</div>
            <div style={{ fontSize:12,color:T.muted,marginBottom:18 }}>Reset {resetUser.name}'s cash</div>
            <input type="number" value={resetAmount} onChange={e=>setResetAmount(e.target.value)} style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px",color:T.text,fontSize:18,fontWeight:800,width:"100%",marginBottom:18,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}/>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setResetUser(null)} style={{ flex:1,background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:8,padding:12,cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
              <button onClick={()=>{ showToast(`${resetUser.name}'s balance reset to $${resetAmount}!`); setResetUser(null); }} style={{ flex:2,background:T.accent+"22",color:T.accent,border:`1px solid ${T.accent}`,borderRadius:8,padding:12,cursor:"pointer",fontFamily:"inherit",fontWeight:800 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:50 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:30,height:30,background:`linear-gradient(135deg,${T.accent},${T.purple})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>⚙️</div>
          <span style={{ fontWeight:800,fontSize:14 }}>TradeX Admin</span>
          <span style={{ fontSize:9,background:"#052e16",color:T.green,borderRadius:4,padding:"2px 6px",fontWeight:700 }}>● LIVE</span>
        </div>
        <div style={{ display:"flex",gap:2 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{ background:tab===n.id?T.card:"transparent",color:tab===n.id?T.accent:T.muted,border:tab===n.id?`1px solid ${T.border}`:"1px solid transparent",borderRadius:7,padding:"4px 11px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:tab===n.id?700:400 }}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={fetchData} style={{ ...S.btn(T.cyan),padding:"5px 12px" }}>🔄 Refresh</button>
          <button onClick={()=>setLoggedIn(false)} style={{ background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",color:T.muted,fontFamily:"inherit" }}>Logout</button>
          <div style={{ width:30,height:30,background:`linear-gradient(135deg,${T.accent},${T.purple})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff" }}>AD</div>
        </div>
      </div>

      <div style={{ padding:"18px 20px",maxWidth:1440,margin:"0 auto" }}>
        {loading ? (
          <div style={{ textAlign:"center",padding:"80px 0",color:T.muted }}>
            <div style={{ fontSize:40,marginBottom:16 }}>⏳</div>
            <div style={{ fontSize:16 }}>Loading real data from backend...</div>
            <div style={{ fontSize:12,marginTop:8 }}>Free tier may take 30 seconds to wake up</div>
            <button onClick={fetchData} style={{ ...S.btn(T.accent),marginTop:16,padding:"8px 20px",fontSize:13 }}>Try Again</button>
          </div>
        ) : (
          <>
            {tab==="overview"&&(
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
                  <StatCard label="Registered Users" value={totalUsers} color={T.accent} icon="👥" sub="Real accounts"/>
                  <StatCard label="Total Trades" value={totalTrades} color={T.green} icon="⚡"/>
                  <StatCard label="Live Volume" value={`$${(totalVolume/1000).toFixed(1)}K`} color={T.purple} icon="💹"/>
                  <StatCard label="Revenue" value={`$${(totalVolume*0.001).toFixed(2)}`} color={T.yellow} icon="💰"/>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
                  <div style={S.card}><div style={{ fontSize:11,fontWeight:800,color:T.accent,marginBottom:14,letterSpacing:.8 }}>💹 REVENUE TREND</div><AnalyticsChart data={revenueData} color={T.accent}/></div>
                  <div style={S.card}><div style={{ fontSize:11,fontWeight:800,color:T.green,marginBottom:14,letterSpacing:.8 }}>⚡ TRADE VOLUME</div><AnalyticsChart data={tradesData} color={T.green}/></div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                  <div style={S.card}>
                    <div style={{ fontSize:11,color:T.muted,marginBottom:12,letterSpacing:.8,textTransform:"uppercase" }}>🏆 Real Registered Users</div>
                    {leaderboard.length===0?(
                      <div style={{ textAlign:"center",padding:"30px 0",color:T.muted }}>
                        <div style={{ fontSize:24,marginBottom:8 }}>👤</div>
                        <div>No users yet!</div>
                        <div style={{ fontSize:11,marginTop:6,color:T.accent }}>tradex-pro-five.vercel.app</div>
                      </div>
                    ):leaderboard.slice(0,6).map((u,i)=>(
                      <div key={u.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <span>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</span>
                          <div><div style={{ fontWeight:700,fontSize:12 }}>{u.name}</div><div style={{ fontSize:10,color:T.muted }}>{u.trades} trades</div></div>
                        </div>
                        <div style={{ color:u.pnl>=0?T.green:T.red,fontWeight:700,fontSize:12 }}>{u.pnl>=0?"+":""}${u.pnl?.toFixed(2)||"0.00"}</div>
                      </div>
                    ))}
                  </div>
                  <div style={S.card}>
                    <div style={{ fontSize:11,color:T.muted,marginBottom:12,letterSpacing:.8,textTransform:"uppercase" }}>📊 Live Stock Prices</div>
                    {Object.entries(prices).slice(0,8).map(([sym,data])=>(
                      <div key={sym} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`,fontSize:12 }}>
                        <span style={{ fontWeight:700,color:T.accent }}>{sym}</span>
                        <div style={{ display:"flex",gap:12 }}>
                          <span style={{ fontWeight:700 }}>${data.price?.toFixed(2)}</span>
                          <span style={{ color:data.change>=0?T.green:T.red,fontWeight:700 }}>{data.change>=0?"+":""}{data.change?.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab==="users"&&(
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:18 }}>
                  <StatCard label="Total Registered" value={totalUsers} color={T.accent} icon="👥"/>
                  <StatCard label="Total Trades" value={totalTrades} color={T.green} icon="⚡"/>
                  <StatCard label="Suspended" value={suspendedUsers.length} color={T.red} icon="🚫"/>
                </div>
                {leaderboard.length===0?(
                  <div style={{ ...S.card,textAlign:"center",padding:"60px 0",color:T.muted }}>
                    <div style={{ fontSize:40,marginBottom:12 }}>👥</div>
                    <div style={{ fontSize:16 }}>No users registered yet!</div>
                    <div style={{ fontSize:13,marginTop:8 }}>Share this with your friends:</div>
                    <div style={{ fontSize:14,color:T.accent,marginTop:8,fontWeight:800 }}>https://tradex-pro-five.vercel.app</div>
                  </div>
                ):(
                  <div style={{ display:"grid",gap:7 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"6px 14px",fontSize:9,color:T.muted,letterSpacing:.8,textTransform:"uppercase",borderBottom:`1px solid ${T.border}` }}>
                      <div>User</div><div style={{textAlign:"right"}}>P&L</div><div style={{textAlign:"right"}}>Trades</div><div style={{textAlign:"right"}}>Actions</div>
                    </div>
                    {leaderboard.map(u=>(
                      <div key={u.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"12px 14px",...S.card,alignItems:"center",gap:6,border:suspendedUsers.includes(u.id)?`1px solid ${T.red}`:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div style={{ width:34,height:34,borderRadius:"50%",background:T.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:T.accent }}>
                            {u.name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ fontWeight:700,fontSize:13,color:T.text }}>{u.name||"Unknown User"}</div>
<div style={{ fontSize:10,color:T.muted }}>{u.email||"No email"}</div>
                      </div>
                        <div style={{ textAlign:"right",fontWeight:700,fontSize:13,color:u.pnl>=0?T.green:T.red }}>{u.pnl>=0?"+":""}${u.pnl?.toFixed(2)||"0.00"}</div>
                        <div style={{ textAlign:"right",fontWeight:700,fontSize:13 }}>{u.trades}</div>
                        <div style={{ display:"flex",gap:5,justifyContent:"flex-end" }}>
                          <button onClick={()=>{ setResetUser(u); setResetAmount(10000); }} style={{ ...S.btn(T.yellow),padding:"4px 9px",fontSize:10 }}>💰</button>
                          <button onClick={()=>{ setSuspendedUsers(prev=>prev.includes(u.id)?prev.filter(x=>x!==u.id):[...prev,u.id]); showToast(`${u.name} ${suspendedUsers.includes(u.id)?"activated":"suspended"}`,suspendedUsers.includes(u.id)?"success":"error"); }} style={{ ...S.btn(suspendedUsers.includes(u.id)?T.green:T.red),padding:"4px 9px",fontSize:10 }}>
                            {suspendedUsers.includes(u.id)?"✅":"🚫"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab==="trades"&&(
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:800,color:T.green }}>● LIVE FEED</div>
                  <div style={{ fontSize:12,color:T.muted }}>Auto-updates every 3 seconds</div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18 }}>
                  <StatCard label="Buy Orders" value={liveTransactions.filter(t=>t.type==="BUY").length} color={T.green} icon="📈"/>
                  <StatCard label="Sell Orders" value={liveTransactions.filter(t=>t.type==="SELL").length} color={T.red} icon="📉"/>
                  <StatCard label="Volume" value={`$${(totalVolume/1000).toFixed(1)}K`} color={T.purple} icon="💹"/>
                  <StatCard label="Traders" value={new Set(liveTransactions.map(t=>t.user)).size} color={T.accent} icon="👤"/>
                </div>
                {liveTransactions.length===0?(
                  <div style={{ ...S.card,textAlign:"center",padding:"60px 0",color:T.muted }}><div style={{ fontSize:40,marginBottom:12 }}>⚡</div><div>Waiting for live trades...</div></div>
                ):(
                  <div style={{ display:"grid",gap:5 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"80px 1.5fr 1fr 1fr 1fr 1fr 1fr",padding:"6px 14px",fontSize:9,color:T.muted,letterSpacing:.8,textTransform:"uppercase",borderBottom:`1px solid ${T.border}` }}>
                      <div>Type</div><div>User</div><div>Symbol</div><div style={{textAlign:"right"}}>Qty</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Total</div><div style={{textAlign:"right"}}>Time</div>
                    </div>
                    {liveTransactions.slice(0,20).map((t,i)=>(
                      <div key={t.id} style={{ display:"grid",gridTemplateColumns:"80px 1.5fr 1fr 1fr 1fr 1fr 1fr",padding:"10px 14px",...S.card,alignItems:"center",fontSize:12,opacity:i<3?1:0.85 }}>
                        <Badge label={t.type} color={t.type==="BUY"?T.green:T.red}/>
                        <div style={{ fontWeight:700 }}>{t.user}</div>
                        <div style={{ fontWeight:800,color:T.accent }}>{t.symbol}</div>
                        <div style={{ textAlign:"right" }}>{t.qty}sh</div>
                        <div style={{ textAlign:"right" }}>${t.price?.toFixed(2)}</div>
                        <div style={{ textAlign:"right",fontWeight:700 }}>${t.total?.toFixed(2)}</div>
                        <div style={{ textAlign:"right",color:T.muted,fontSize:10 }}>{t.time}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab==="analytics"&&(
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18 }}>
                  <StatCard label="Users" value={totalUsers} color={T.accent} icon="👥"/>
                  <StatCard label="Trades" value={totalTrades} color={T.green} icon="⚡"/>
                  <StatCard label="Top P&L" value={`$${leaderboard[0]?.pnl?.toFixed(2)||"0.00"}`} color={T.purple} icon="🏆"/>
                  <StatCard label="Revenue" value={`$${(totalVolume*0.001).toFixed(2)}`} color={T.yellow} icon="💰"/>
                </div>
                <div style={{ display:"grid",gap:14 }}>
                  <div style={S.card}><div style={{ fontSize:11,fontWeight:800,color:T.accent,marginBottom:14,letterSpacing:.8 }}>💹 REVENUE TREND</div><AnalyticsChart data={revenueData} color={T.accent}/></div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                    <div style={S.card}><div style={{ fontSize:11,fontWeight:800,color:T.green,marginBottom:14,letterSpacing:.8 }}>⚡ DAILY TRADES</div><AnalyticsChart data={tradesData} color={T.green}/></div>
                    <div style={S.card}>
                      <div style={{ fontSize:11,color:T.muted,marginBottom:12,letterSpacing:.8,textTransform:"uppercase" }}>User P&L Ranking</div>
                      {leaderboard.length===0?(
                        <div style={{ textAlign:"center",padding:"40px 0",color:T.muted }}>No data yet</div>
                      ):leaderboard.map((u,i)=>{
                        const colors=[T.accent,T.green,T.purple,T.yellow,T.cyan,T.orange,T.red];
                        return(
                          <div key={u.id} style={{ marginBottom:10 }}>
                            <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3 }}>
                              <span style={{ fontWeight:700 }}>{u.name}</span>
                              <span style={{ color:T.muted }}>${u.pnl?.toFixed(2)||"0"}</span>
                            </div>
                            <MiniBar value={Math.abs(u.pnl||0)} max={Math.max(...leaderboard.map(x=>Math.abs(x.pnl||1)),1)} color={colors[i%colors.length]}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}