import { useState, useEffect, useRef, useCallback } from "react";

const STOCKS_DATA = {
  AAPL: { name: "Apple Inc.",      sector: "Technology",    basePrice: 254.48, change: 0.7  },
  TSLA: { name: "Tesla Inc.",      sector: "EV / Energy",   basePrice: 397.24, change: 0.4  },
  GOOGL:{ name: "Alphabet Inc.",   sector: "Technology",    basePrice: 307.68, change: -1.2 },
  AMZN: { name: "Amazon.com",      sector: "E-Commerce",    basePrice: 213.55, change: -0.8 },
  MSFT: { name: "Microsoft Corp.", sector: "Technology",    basePrice: 412.30, change: 1.1  },
  NVDA: { name: "NVIDIA Corp.",    sector: "Semiconductors",basePrice: 875.50, change: 2.3  },
  META: { name: "Meta Platforms",  sector: "Social Media",  basePrice: 521.70, change: -0.5 },
  NFLX: { name: "Netflix Inc.",    sector: "Streaming",     basePrice: 698.40, change: 1.8  },
};

const DEMO_USER = { email: "demo@tradex.pro", password: "demo123", name: "Alex Morgan", avatar: "AM" };

const NEWS_FEED = [
  { id:1,  sym:"AAPL",  headline:"Apple unveils next-gen M4 chip with 40% performance boost",          sentiment:"positive", time:"2m ago",  source:"Bloomberg"  },
  { id:2,  sym:"TSLA",  headline:"Tesla Q1 deliveries miss estimates amid production challenges",       sentiment:"negative", time:"15m ago", source:"Reuters"    },
  { id:3,  sym:"NVDA",  headline:"NVIDIA secures $40B AI chip deal with major hyperscalers",           sentiment:"positive", time:"32m ago", source:"WSJ"        },
  { id:4,  sym:"GOOGL", headline:"Alphabet faces EU antitrust probe over search market dominance",     sentiment:"negative", time:"1h ago",  source:"FT"         },
  { id:5,  sym:"MSFT",  headline:"Microsoft Azure revenue surges 31% on strong AI cloud demand",       sentiment:"positive", time:"2h ago",  source:"CNBC"       },
  { id:6,  sym:"AMZN",  headline:"Amazon expands same-day delivery to 20 new metro cities",            sentiment:"positive", time:"3h ago",  source:"TechCrunch" },
  { id:7,  sym:"META",  headline:"Meta launches AI assistant across WhatsApp, Instagram globally",     sentiment:"positive", time:"4h ago",  source:"Wired"      },
  { id:8,  sym:"NFLX",  headline:"Netflix password-sharing crackdown adds 9M new subscribers",        sentiment:"positive", time:"5h ago",  source:"Variety"    },
  { id:9,  sym:"TSLA",  headline:"Cybertruck recall issued over accelerator pedal safety concern",     sentiment:"negative", time:"6h ago",  source:"NHTSA"      },
  { id:10, sym:"AAPL",  headline:"Apple Services revenue hits all-time high of $24B this quarter",    sentiment:"positive", time:"7h ago",  source:"9to5Mac"    },
];

const LEADERBOARD_SEED = [
  { rank:1, name:"Sarah K.",   avatar:"SK", pnl:8420, trades:47, winRate:72 },
  { rank:2, name:"Rahul M.",   avatar:"RM", pnl:6310, trades:38, winRate:68 },
  { rank:3, name:"Alex Morgan",avatar:"AM", pnl:0,    trades:0,  winRate:0,  isMe:true },
  { rank:4, name:"Priya S.",   avatar:"PS", pnl:4190, trades:55, winRate:61 },
  { rank:5, name:"James T.",   avatar:"JT", pnl:3750, trades:29, winRate:65 },
  { rank:6, name:"Li Wei",     avatar:"LW", pnl:2980, trades:41, winRate:58 },
];

const DARK = {
  bg:"#0d1117", surface:"#161b22", card:"#1c2333", border:"#30363d",
  accent:"#58a6ff", green:"#3fb950", red:"#f85149", yellow:"#d29922",
  text:"#e6edf3", muted:"#8b949e", purple:"#bc8cff", orange:"#ffa657",
  cardHover:"#222d3d",
};
const LIGHT = {
  bg:"#f0f4f8", surface:"#ffffff", card:"#ffffff", border:"#d0d7de",
  accent:"#0969da", green:"#1a7f37", red:"#cf222e", yellow:"#9a6700",
  text:"#1f2328", muted:"#656d76", purple:"#8250df", orange:"#bc4c00",
  cardHover:"#f6f8fa",
};

function generatePriceHistory(base, days=60) {
  let p = base * 0.82;
  return Array.from({length:days}, (_, i) => {
    p += (Math.random() - 0.47) * p * 0.022;
    p = Math.max(p, base * 0.55);
    return { day: i+1, price: parseFloat(p.toFixed(2)) };
  });
}

function calcRSI(prices, period=14) {
  const gains=[], losses=[];
  for(let i=1;i<prices.length;i++){
    const d=prices[i]-prices[i-1];
    gains.push(d>0?d:0);
    losses.push(d<0?Math.abs(d):0);
  }
  const rsi=[null];
  for(let i=0;i<gains.length;i++){
    if(i<period-1){rsi.push(null);continue;}
    const avgG=gains.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period;
    const avgL=losses.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period;
    rsi.push(avgL===0?100:parseFloat((100-100/(1+avgG/avgL)).toFixed(2)));
  }
  return rsi;
}

function calcMACD(prices) {
  const ema=(arr,n)=>{
    const k=2/(n+1); let e=arr[0];
    return arr.map((v,i)=>{if(i===0)return e; e=v*k+e*(1-k); return parseFloat(e.toFixed(4));});
  };
  const e12=ema(prices,12), e26=ema(prices,26);
  const macd=prices.map((_,i)=>parseFloat((e12[i]-e26[i]).toFixed(4)));
  const signal=ema(macd,9);
  const hist=macd.map((v,i)=>parseFloat((v-signal[i]).toFixed(4)));
  return {macd, signal, hist};
}

function calcBollinger(prices, period=20) {
  return prices.map((_,i)=>{
    if(i<period-1) return {mid:null,upper:null,lower:null};
    const slice=prices.slice(i-period+1,i+1);
    const mid=slice.reduce((a,b)=>a+b,0)/period;
    const std=Math.sqrt(slice.reduce((a,b)=>a+(b-mid)**2,0)/period);
    return {
      mid:parseFloat(mid.toFixed(2)),
      upper:parseFloat((mid+2*std).toFixed(2)),
      lower:parseFloat((mid-2*std).toFixed(2))
    };
  });
}

function MiniChart({data, color, width=120, height=40}) {
  if(!data||data.length<2) return null;
  const prices=data.map(d=>d.price);
  const min=Math.min(...prices), max=Math.max(...prices), range=max-min||1;
  const pts=prices.map((p,i)=>`${(i/(prices.length-1))*width},${height-((p-min)/range)*height}`).join(" ");
  return (
    <svg width={width} height={height} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function Badge({label, color}) {
  return (
    <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:color+"22",color,fontWeight:700,letterSpacing:0.3}}>
      {label}
    </span>
  );
}

function TradeModal({modal, onClose, prices, cash, portfolio, T}) {
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState("market");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [, forceRender] = useState(0);

  const S = {
    inp: {background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
    label: {fontSize:10,color:T.muted,marginBottom:4,letterSpacing:0.8,textTransform:"uppercase"},
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:28,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:18,fontWeight:800,color:modal.type==="BUY"?T.green:T.red}}>{modal.type==="BUY"?"Buy":"Sell"} {modal.sym}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:3}}>{STOCKS_DATA[modal.sym]?.name}</div>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{...S.label,marginBottom:8}}>Order Type</div>
          <div style={{display:"flex",gap:8}}>
            {[["market","Market"],["limit","Limit"],["stop","Stop-Loss"]].map(([v,l])=>(
              <button key={v} onClick={()=>setOrderType(v)}
                style={{flex:1,background:orderType===v?T.accent:T.bg,color:orderType===v?"#000":T.muted,border:`1px solid ${orderType===v?T.accent:T.border}`,borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                {l}
              </button>
            ))}
          </div>
          {orderType==="limit"&&<div style={{fontSize:11,color:T.muted,marginTop:6}}>Executes when price reaches your target level.</div>}
          {orderType==="stop"&&<div style={{fontSize:11,color:T.red,marginTop:6}}>Auto-sells to protect losses when price drops to trigger.</div>}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:T.bg,borderRadius:10,padding:12}}>
            <div style={{...S.label}}>Market Price</div>
            <div style={{fontWeight:800,fontSize:20,marginTop:4}}>${prices[modal.sym]?.toFixed(2)}</div>
          </div>
          <div style={{background:T.bg,borderRadius:10,padding:12}}>
            <div style={{...S.label}}>{modal.type==="BUY"?"Cash Available":"Shares Held"}</div>
            <div style={{fontWeight:800,fontSize:20,marginTop:4,color:T.accent}}>
              {modal.type==="BUY"?`$${cash.toFixed(2)}`:`${portfolio[modal.sym]||0}`}
            </div>
          </div>
        </div>

        <div style={{marginBottom:12}}>
          <div style={{...S.label,marginBottom:6}}>Quantity</div>
          <input type="number" value={qty} min={1} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} style={{...S.inp}}/>
        </div>

        {(orderType==="limit"||orderType==="stop")&&(
          <div style={{marginBottom:12}}>
            <div style={{...S.label,marginBottom:6}}>{orderType==="limit"?"Limit Price ($)":"Stop Price ($)"}</div>
            <input type="number" step="0.01" value={triggerPrice} onChange={e=>setTriggerPrice(e.target.value)}
              placeholder={`e.g. ${(prices[modal.sym]*0.97).toFixed(2)}`} style={{...S.inp}}/>
          </div>
        )}

        <div style={{background:T.bg,borderRadius:10,padding:14,marginBottom:16}}>
          {[["Price per share",`$${prices[modal.sym]?.toFixed(2)}`],["Quantity",qty],["Order",orderType.toUpperCase()]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:8,color:T.muted}}>
              <span>{l}</span><span style={{color:T.text}}>{v}</span>
            </div>
          ))}
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:15}}>
            <span>Total</span>
            <span style={{color:modal.type==="BUY"?T.red:T.green}}>
              {modal.type==="BUY"?"-":"+"}${(prices[modal.sym]*qty).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:10,padding:13,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button
            onClick={()=>onClose({sym:modal.sym,type:modal.type,qty,orderType,triggerPrice:parseFloat(triggerPrice)||null})}
            style={{flex:2,background:modal.type==="BUY"?"#1a3320":"#2e0e0e",color:modal.type==="BUY"?T.green:T.red,border:`1px solid ${modal.type==="BUY"?T.green:T.red}`,borderRadius:10,padding:13,fontSize:14,cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
            {orderType==="market"?`Confirm ${modal.type}`:`Place ${orderType.toUpperCase()} Order`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdvancedChart({symbol, data, indicator, T}) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas||!data||data.length<2) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const prices = data.map(d=>d.price);
    const PAD = {l:52, r:16, t:20, b: indicator==="none" ? 30 : 95};
    const chartH = H-PAD.t-PAD.b;
    const chartW = W-PAD.l-PAD.r;
    const min = Math.min(...prices)*0.993, max = Math.max(...prices)*1.007, range = max-min;
    const toY = v => PAD.t + chartH - ((v-min)/range)*chartH;
    const toX = i => PAD.l + (i/(data.length-1))*chartW;

    ctx.strokeStyle = T===DARK ? "#21262d" : "#e1e4e8";
    ctx.lineWidth = 0.5;
    for(let i=0;i<=4;i++){
      const y = PAD.t+(i/4)*chartH;
      ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(W-PAD.r,y); ctx.stroke();
      const val = max-((i/4)*range);
      ctx.fillStyle = T.muted; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText("$"+val.toFixed(0), PAD.l-4, y+4);
    }

    if(indicator==="bb") {
      const bb = calcBollinger(prices);
      const uppers=bb.map(b=>b.upper), lowers=bb.map(b=>b.lower);
      ctx.beginPath();
      uppers.forEach((v,i)=>{ if(v==null)return; i===0||uppers[i-1]==null?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)); });
      lowers.slice().reverse().forEach((v,i)=>{ const ri=lowers.length-1-i; if(v==null)return; ctx.lineTo(toX(ri),toY(v)); });
      ctx.closePath();
      ctx.fillStyle = T===DARK?"rgba(88,166,255,0.07)":"rgba(9,105,218,0.07)"; ctx.fill();
      const drawLine=(arr,color,dash=[])=>{ ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.setLineDash(dash); arr.forEach((v,i)=>{if(v==null)return;i===0||arr[i-1]==null?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v));}); ctx.stroke();ctx.setLineDash([]); };
      drawLine(bb.map(b=>b.upper), T.accent, [4,3]);
      drawLine(bb.map(b=>b.lower), T.accent, [4,3]);
      drawLine(bb.map(b=>b.mid), T.purple);
    }

    ctx.beginPath(); ctx.moveTo(toX(0),toY(prices[0]));
    prices.forEach((p,i)=>i>0&&ctx.lineTo(toX(i),toY(p)));
    ctx.lineTo(toX(prices.length-1),PAD.t+chartH); ctx.lineTo(toX(0),PAD.t+chartH); ctx.closePath();
    const grad=ctx.createLinearGradient(0,PAD.t,0,PAD.t+chartH);
    grad.addColorStop(0,T===DARK?"rgba(88,166,255,0.18)":"rgba(9,105,218,0.12)");
    grad.addColorStop(1,"rgba(88,166,255,0)");
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle=T.accent; ctx.lineWidth=2; ctx.setLineDash([]);
    prices.forEach((p,i)=>i===0?ctx.moveTo(toX(i),toY(p)):ctx.lineTo(toX(i),toY(p)));
    ctx.stroke();

    const barW=Math.max(2,(chartW/data.length)*0.55);
    data.forEach((d,i)=>{
      const prev=data[i-1]?.price||d.price, open=prev, close=d.price;
      const high=Math.max(open,close)*(1+Math.random()*0.004), low=Math.min(open,close)*(1-Math.random()*0.004);
      const isUp=close>=open, color=isUp?T.green:T.red, x=toX(i);
      ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(high)); ctx.lineTo(x,toY(low)); ctx.stroke();
      ctx.fillStyle=color;
      ctx.fillRect(x-barW/2, Math.min(toY(open),toY(close)), barW, Math.max(2,Math.abs(toY(open)-toY(close))));
    });

    ctx.fillStyle=T.muted; ctx.font="10px monospace"; ctx.textAlign="center";
    for(let i=0;i<=6;i++){
      const idx=Math.round((i/6)*(data.length-1));
      ctx.fillText("D"+data[idx].day, toX(idx), H-PAD.b+14);
    }

    if(indicator==="rsi") {
      const rsiVals=calcRSI(prices);
      const subTop=H-PAD.b+20, subH=62;
      ctx.fillStyle=T.muted; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText("RSI(14)", PAD.l, subTop-5);
      [30,50,70].forEach(level=>{
        const y=subTop+subH-((level/100)*subH);
        ctx.beginPath(); ctx.strokeStyle=T===DARK?"#21262d":"#e1e4e8"; ctx.lineWidth=0.5;
        ctx.moveTo(PAD.l,y); ctx.lineTo(W-PAD.r,y); ctx.stroke();
        ctx.fillStyle=T.muted; ctx.textAlign="right";
        ctx.fillText(level, PAD.l-4, y+3);
      });
      ctx.beginPath(); ctx.strokeStyle=T.purple; ctx.lineWidth=1.5;
      rsiVals.forEach((v,i)=>{
        if(v==null)return;
        const x=toX(i), y=subTop+subH-((v/100)*subH);
        i===0||rsiVals[i-1]==null?ctx.moveTo(x,y):ctx.lineTo(x,y);
      });
      ctx.stroke();
    }

    if(indicator==="macd") {
      const {macd,signal,hist}=calcMACD(prices);
      const subTop=H-PAD.b+20, subH=62;
      const vals=hist.filter(Boolean);
      const mMin=Math.min(...vals)*1.2, mMax=Math.max(...vals)*1.2, mRange=mMax-mMin||1;
      const toMY=v=>subTop+subH-((v-mMin)/mRange)*subH;
      ctx.fillStyle=T.muted; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText("MACD", PAD.l, subTop-5);
      hist.forEach((v,i)=>{
        if(v==null)return;
        ctx.fillStyle=v>=0?T.green:T.red;
        const bw=Math.max(2,(chartW/data.length)*0.5);
        ctx.fillRect(toX(i)-bw/2, toMY(Math.max(0,v)), bw, Math.max(1,Math.abs(toMY(v)-toMY(0))));
      });
      const drawSub=(arr,color)=>{ ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.5; arr.forEach((v,i)=>{if(v==null)return;const x=toX(i),y=toMY(v);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}); ctx.stroke(); };
      drawSub(macd,T.accent); drawSub(signal,T.orange);
    }
  }, [data, indicator, T]);

  return (
    <canvas ref={canvasRef} width={760} height={340}
      style={{width:"100%",height:340,borderRadius:8,display:"block"}}/>
  );
}

 function LoginScreen({onLogin, T}) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@tradex.pro");
  const [pass, setPass] = useState("demo123");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const inp = {
    background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
    padding:"12px 16px", color:T.text, fontSize:14, fontFamily:"inherit",
    outline:"none", width:"100%", boxSizing:"border-box", marginBottom:12
  };

  const handleLogin = async () => {
    if(!email||!pass){setErr("Fill all fields");return;}
    setLoading(true); setErr("");
    try {
      const res = await fetch("https://tradex-pro.onrender.com/api/auth/login",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password:pass})
      });
      const data = await res.json();
      if(data.token){
        localStorage.setItem("tradex_token", data.token);
        localStorage.setItem("tradex_user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setErr(data.error||"Login failed");
      }
    } catch {
      // fallback to demo login if backend is sleeping
      if(email==="demo@tradex.pro"&&pass==="demo123"){
        onLogin({name:"Alex Morgan",email:"demo@tradex.pro",cash:10000});
      } else {
        setErr("Server is starting up, try again in 30 seconds!");
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if(!name||!email||!pass||!confirm){setErr("Fill all fields");return;}
    if(pass!==confirm){setErr("Passwords do not match");return;}
    if(pass.length<6){setErr("Password must be at least 6 characters");return;}
    setLoading(true); setErr("");
    try {
      const res = await fetch("https://tradex-pro.onrender.com/api/auth/register",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,email,password:pass})
      });
      const data = await res.json();
      if(data.token){
        localStorage.setItem("tradex_token", data.token);
        localStorage.setItem("tradex_user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setErr(data.error||"Registration failed");
      }
    } catch {
      setErr("Server is starting up, please try again in 30 seconds!");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{width:"100%",maxWidth:420,padding:16}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:"linear-gradient(135deg,#58a6ff,#bc8cff)",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px"}}>📈</div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:0.5}}>TradeX Pro</div>
          <div style={{fontSize:13,color:T.muted,marginTop:6}}>Professional Stock Trading Platform</div>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,padding:28}}>

          {/* Tab switcher */}
          <div style={{display:"flex",background:T.bg,borderRadius:10,padding:4,marginBottom:24}}>
            <button onClick={()=>{setMode("login");setErr("");setEmail("demo@tradex.pro");setPass("demo123");}}
              style={{flex:1,background:mode==="login"?T.card:"transparent",color:mode==="login"?T.accent:T.muted,border:"none",borderRadius:8,padding:"8px",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:mode==="login"?800:400,transition:"all 0.2s"}}>
              Sign In
            </button>
            <button onClick={()=>{setMode("register");setErr("");setEmail("");setPass("");}}
              style={{flex:1,background:mode==="register"?T.card:"transparent",color:mode==="register"?T.accent:T.muted,border:"none",borderRadius:8,padding:"8px",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:mode==="register"?800:400,transition:"all 0.2s"}}>
              Register
            </button>
          </div>

          {mode==="login" ? (
            <div>
              <div style={{fontSize:13,color:T.muted,marginBottom:16}}>Welcome back! Sign in to trade.</div>
              <input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/>
              <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password"/>
              {err&&<div style={{color:T.red,fontSize:12,marginBottom:10}}>{err}</div>}
              <button onClick={handleLogin} disabled={loading}
                style={{width:"100%",background:"linear-gradient(135deg,#58a6ff,#bc8cff)",color:"#000",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",opacity:loading?0.7:1}}>
                {loading?"Signing in...":"SIGN IN →"}
              </button>
              <div style={{textAlign:"center",marginTop:16,padding:"10px",background:T.bg,borderRadius:8}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Demo Account</div>
                <div style={{fontSize:11,color:T.accent}}>demo@tradex.pro / demo123</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:13,color:T.muted,marginBottom:16}}>Create your account and get $10,000 to trade!</div>
              <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name"/>
              <input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/>
              <input style={inp} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password (min 6 characters)"/>
              <input style={inp} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm Password"/>
              {err&&<div style={{color:T.red,fontSize:12,marginBottom:10}}>{err}</div>}
              <button onClick={handleRegister} disabled={loading}
                style={{width:"100%",background:"linear-gradient(135deg,#3fb950,#58a6ff)",color:"#000",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",opacity:loading?0.7:1}}>
                {loading?"Creating Account...":"CREATE ACCOUNT →"}
              </button>
              <div style={{textAlign:"center",marginTop:12,fontSize:11,color:T.muted}}>
                🎁 Start with $10,000 virtual cash!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradingDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const T = darkMode ? DARK : LIGHT;
  const [tab, setTab] = useState("market");
  const [prices, setPrices] = useState(()=>Object.fromEntries(Object.entries(STOCKS_DATA).map(([k,v])=>[k,v.basePrice])));
  const [changes, setChanges] = useState(()=>Object.fromEntries(Object.entries(STOCKS_DATA).map(([k,v])=>[k,v.change])));
  const [histories] = useState(()=>Object.fromEntries(Object.entries(STOCKS_DATA).map(([k,v])=>[k,generatePriceHistory(v.basePrice)])));
  const [cash, setCash] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [watchlist, setWatchlist] = useState(["AAPL","NVDA"]);
  const [transactions, setTransactions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [modal, setModal] = useState(null);
  const [chartSymbol, setChartSymbol] = useState("AAPL");
  const [indicator, setIndicator] = useState("none");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [predicting, setPredicting] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [newsFilter, setNewsFilter] = useState("ALL");
  const [orderFormSym, setOrderFormSym] = useState("AAPL");
  const [orderFormType, setOrderFormType] = useState("limit");
  const [orderFormTrade, setOrderFormTrade] = useState("BUY");
  const [orderFormQty, setOrderFormQty] = useState(1);
  const [orderFormTrigger, setOrderFormTrigger] = useState("");
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  useEffect(()=>{
    const tick = setInterval(()=>{
      setPrices(prev=>{
        const next={};
        Object.keys(prev).forEach(sym=>{ next[sym]=parseFloat((prev[sym]+(Math.random()-0.495)*prev[sym]*0.003).toFixed(2)); });
        return next;
      });
      setChanges(prev=>{
        const next={};
        Object.keys(prev).forEach(sym=>next[sym]=parseFloat((prev[sym]+(Math.random()-0.5)*0.08).toFixed(2)));
        return next;
      });
    },2000);
    return ()=>clearInterval(tick);
  },[]);

  const portfolioValue = Object.entries(portfolio).reduce((sum,[sym,qty])=>sum+(prices[sym]||0)*qty,0);
  const totalValue = cash+portfolioValue;
  const buyTotal = transactions.filter(t=>t.type==="BUY").reduce((s,t)=>s+t.price*t.qty,0);
  const sellTotal = transactions.filter(t=>t.type==="SELL").reduce((s,t)=>s+t.price*t.qty,0);
  const pnl = sellTotal - buyTotal + portfolioValue;

  const runPrediction = useCallback((sym)=>{
    setPredicting(sym);
    setTimeout(()=>{
      const p=histories[sym].map(d=>d.price);
      const last=p[p.length-1];
      const trend=p.slice(-10).reduce((a,b,i,arr)=>i===0?0:a+(b-arr[i-1]),0)/10;
      const vol=Math.sqrt(p.slice(-14).reduce((a,b,i,arr)=>i===0?0:a+(b-arr[i-1])**2,0)/14);
      setPredictions(prev=>({...prev,[sym]:{
        pred7:parseFloat((last+trend*7+(Math.random()-0.5)*vol).toFixed(2)),
        pred14:parseFloat((last+trend*14+(Math.random()-0.4)*vol*1.5).toFixed(2)),
        pred30:parseFloat((last+trend*30+(Math.random()-0.35)*vol*2.5).toFixed(2)),
        sentiment:changes[sym]>0?"Bullish":"Bearish",
        confidence:Math.floor(55+Math.random()*30),
        generated:new Date().toLocaleTimeString()
      }}));
      setPredicting(null);
      showToast(`AI prediction ready for ${sym}`,"info");
    },1800);
  },[histories,changes]);

  const handleModalClose = (result) => {
    if(!result){setModal(null);return;}
    const {sym,type,qty,orderType,triggerPrice} = result;
    if(orderType!=="market"){
      if(!triggerPrice) return showToast("Enter a trigger price","error");
      setPendingOrders(p=>[...p,{id:Date.now(),sym,tradeType:type,qty,orderType,triggerPrice,placedAt:new Date().toLocaleTimeString()}]);
      showToast(`${orderType.toUpperCase()} order placed: ${type} ${qty} ${sym}`,"info");
      setModal(null); return;
    }
    const execPrice = prices[sym];
    if(type==="BUY"){
      const cost=execPrice*qty;
      if(cost>cash){showToast("Insufficient balance!","error");return;}
      setCash(c=>parseFloat((c-cost).toFixed(2)));
      setPortfolio(p=>({...p,[sym]:(p[sym]||0)+qty}));
      setTransactions(t=>[{id:Date.now(),sym,type,qty,price:execPrice,time:new Date().toLocaleTimeString(),orderType},...t]);
      showToast(`Bought ${qty} ${sym} @ $${execPrice.toFixed(2)}`);
    } else {
      const held=portfolio[sym]||0;
      if(held<qty){showToast("Not enough shares!","error");return;}
      setCash(c=>parseFloat((c+execPrice*qty).toFixed(2)));
      setPortfolio(p=>{const n={...p};n[sym]-=qty;if(n[sym]===0)delete n[sym];return n;});
      setTransactions(t=>[{id:Date.now(),sym,type,qty,price:execPrice,time:new Date().toLocaleTimeString(),orderType},...t]);
      showToast(`Sold ${qty} ${sym} @ $${execPrice.toFixed(2)}`,"warning");
    }
    setModal(null);
  };

  const exportCSV = () => {
    if(!transactions.length){showToast("No transactions to export","error");return;}
    const rows=["Type,Symbol,Qty,Price,Total,OrderType,Time",...transactions.map(t=>`${t.type},${t.sym},${t.qty},${t.price.toFixed(2)},${(t.price*t.qty).toFixed(2)},${t.orderType},${t.time}`)].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([rows],{type:"text/csv"}));
    a.download="tradex_portfolio.csv"; a.click();
    showToast("Portfolio exported as CSV!");
  };

  const toggleWatch = sym => setWatchlist(w=>w.includes(sym)?w.filter(s=>s!==sym):[...w,sym]);
  const filteredStocks = Object.keys(STOCKS_DATA).filter(s=>s.includes(search.toUpperCase())||STOCKS_DATA[s].name.toLowerCase().includes(search.toLowerCase()));
  const topGainers = Object.keys(changes).sort((a,b)=>changes[b]-changes[a]).slice(0,4);
  const topLosers = Object.keys(changes).sort((a,b)=>changes[a]-changes[b]).slice(0,4);
  const filteredNews = newsFilter==="ALL"?NEWS_FEED:NEWS_FEED.filter(n=>n.sym===newsFilter);
  const lbData = LEADERBOARD_SEED
    .map(r=>r.isMe?{...r,pnl:parseFloat(pnl.toFixed(2)),trades:transactions.length,winRate:transactions.length>0?Math.round((transactions.filter(t=>t.type==="SELL").length/transactions.length)*100)||50:0}:r)
    .sort((a,b)=>b.pnl-a.pnl).map((r,i)=>({...r,rank:i+1}));

  const NAV=[
    {id:"market",icon:"📊",label:"Market"},
    {id:"portfolio",icon:"💼",label:"Portfolio"},
    {id:"watchlist",icon:"⭐",label:"Watchlist"},
    {id:"charts",icon:"📈",label:"Charts"},
    {id:"news",icon:"📰",label:"News"},
    {id:"orders",icon:"📋",label:"Orders"},
    {id:"leaderboard",icon:"🏆",label:"Leaderboard"},
    {id:"history",icon:"🕐",label:"History"},
  ];

  const C={
    card:{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 20px"},
    btn:(color)=>({background:color+"22",color,border:`1px solid ${color}`,borderRadius:8,padding:"5px 13px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700}),
    inp:{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 13px",color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
    lbl:{fontSize:10,color:T.muted,letterSpacing:0.8,textTransform:"uppercase"},
  };

  if(!loggedIn) return <LoginScreen onLogin={()=>setLoggedIn(true)} T={T}/>;

  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'IBM Plex Mono','Courier New',monospace",color:T.text,transition:"background 0.3s,color 0.3s"}}>

      {toast&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:200,background:{success:"#1a3320",error:"#2e0e0e",warning:"#2e2000",info:"#0d1e3a"}[toast.type]||"#0d1e3a",border:`1px solid ${{success:T.green,error:T.red,warning:T.yellow,info:T.accent}[toast.type]||T.accent}`,borderRadius:10,padding:"12px 20px",color:{success:T.green,error:T.red,warning:T.yellow,info:T.accent}[toast.type]||T.accent,fontSize:13,fontWeight:700,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",maxWidth:320}}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:50,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#58a6ff,#bc8cff)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📈</div>
          <span style={{fontWeight:800,fontSize:14,letterSpacing:0.5}}>TradeX Pro</span>
          <span style={{fontSize:10,background:T===DARK?"#1a3320":"#dafbe1",color:T.green,borderRadius:4,padding:"2px 6px",fontWeight:700}}>● LIVE</span>
        </div>
        <div style={{display:"flex",gap:2,overflowX:"auto",flex:1,justifyContent:"center"}}>
          {NAV.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{background:tab===t.id?T.card:"transparent",color:tab===t.id?T.accent:T.muted,border:tab===t.id?`1px solid ${T.border}`:"1px solid transparent",borderRadius:7,padding:"4px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:tab===t.id?700:400,whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:T.muted}}>Total Value</div>
            <div style={{fontSize:13,fontWeight:800,color:T.accent}}>${totalValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </div>
          <button onClick={()=>setDarkMode(d=>!d)} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",fontSize:13,cursor:"pointer",color:T.text}}>{darkMode?"☀️":"🌙"}</button>
          <button onClick={()=>setLoggedIn(false)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",color:T.muted,fontFamily:"inherit"}}>Logout</button>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#58a6ff,#bc8cff)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#000"}}>{DEMO_USER.avatar}</div>
        </div>
      </div>

      {/* SUMMARY BAR */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"7px 18px",display:"flex",gap:24,overflowX:"auto"}}>
        {[
          {l:"Cash",v:`$${cash.toLocaleString("en-US",{minimumFractionDigits:2})}`,c:T.accent},
          {l:"Portfolio",v:`$${portfolioValue.toLocaleString("en-US",{minimumFractionDigits:2})}`,c:T.purple},
          {l:"P&L",v:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`,c:pnl>=0?T.green:T.red},
          {l:"Positions",v:Object.keys(portfolio).length,c:T.text},
          {l:"Trades",v:transactions.length,c:T.text},
          {l:"Pending",v:pendingOrders.length,c:T.yellow},
          ...["AAPL","TSLA","NVDA","MSFT"].map(s=>({l:s,v:`$${prices[s]?.toFixed(2)}`,c:changes[s]>=0?T.green:T.red})),
        ].map(s=>(
          <div key={s.l} style={{whiteSpace:"nowrap"}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:1}}>{s.l}</div>
            <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{padding:"16px 18px",maxWidth:1440,margin:"0 auto"}}>

        {/* ══ MARKET ══ */}
        {tab==="market"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search..." style={{...C.inp,width:220}}/>
              {[["S&P 500","5,782",true],["NASDAQ","18,241",true],["DOW","43,128",false],["VIX","14.2",false]].map(([n,v,up])=>(
                <div key={n} style={{...C.card,padding:"7px 13px"}}>
                  <div style={{fontSize:10,color:T.muted}}>{n}</div>
                  <div style={{fontSize:12,fontWeight:700,color:up?T.green:T.red}}>{v} {up?"▲":"▼"}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 0.8fr 1.1fr 1.6fr 2fr",padding:"6px 14px",fontSize:10,color:T.muted,borderBottom:`1px solid ${T.border}`,letterSpacing:0.8,textTransform:"uppercase"}}>
              <div>Symbol</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Chg%</div>
              <div style={{textAlign:"right"}}>Held</div><div style={{textAlign:"center"}}>Trend</div>
              <div style={{textAlign:"center"}}>AI Signal</div><div style={{textAlign:"right"}}>Actions</div>
            </div>
            <div style={{display:"grid",gap:5,marginTop:5}}>
              {filteredStocks.map(sym=>{
                const info=STOCKS_DATA[sym], price=prices[sym], change=changes[sym], held=portfolio[sym]||0, isUp=change>=0, pred=predictions[sym];
                return(
                  <div key={sym} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 0.8fr 1.1fr 1.6fr 2fr",padding:"11px 14px",...C.card,alignItems:"center",gap:4}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:13,color:T.accent}}>{sym}</div>
                      <div style={{fontSize:10,color:T.muted}}>{info.name}</div>
                      <Badge label={info.sector} color={T.purple}/>
                    </div>
                    <div style={{textAlign:"right",fontWeight:800,fontSize:14}}>${price?.toFixed(2)}</div>
                    <div style={{textAlign:"right",color:isUp?T.green:T.red,fontWeight:700,fontSize:12}}>{isUp?"▲":"▼"}{Math.abs(change).toFixed(2)}%</div>
                    <div style={{textAlign:"right",fontSize:11,color:held>0?T.text:T.muted}}>{held>0?`${held}sh`:"—"}</div>
                    <div style={{display:"flex",justifyContent:"center"}}><MiniChart data={histories[sym]?.slice(-14)} color={isUp?T.green:T.red} width={88} height={30}/></div>
                    <div style={{textAlign:"center"}}>
                      {pred?(
                        <div>
                          <div style={{fontSize:10,color:pred.sentiment==="Bullish"?T.green:T.red,fontWeight:700}}>{pred.sentiment} {pred.confidence}%</div>
                          <div style={{fontSize:9,color:T.muted}}>7d: ${pred.pred7}</div>
                        </div>
                      ):(
                        <button onClick={()=>runPrediction(sym)} disabled={predicting===sym} style={{...C.btn(T.purple),padding:"3px 9px",fontSize:10,opacity:predicting===sym?0.6:1}}>
                          {predicting===sym?"...":"🤖 AI"}
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex",gap:4,justifyContent:"flex-end",flexWrap:"wrap"}}>
                      <button onClick={()=>toggleWatch(sym)} style={{...C.btn(watchlist.includes(sym)?T.yellow:T.muted),padding:"4px 8px"}}>{watchlist.includes(sym)?"★":"☆"}</button>
                      <button onClick={()=>setModal({sym,type:"BUY"})} style={{...C.btn(T.green)}}>BUY</button>
                      <button onClick={()=>setModal({sym,type:"SELL"})} style={{...C.btn(T.red)}}>SELL</button>
                      <button onClick={()=>{setChartSymbol(sym);setTab("charts");}} style={{...C.btn(T.accent)}}>CHART</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:18}}>
              {[[topGainers,"🚀 TOP GAINERS",T.green],[topLosers,"📉 TOP LOSERS",T.red]].map(([list,title,color])=>(
                <div key={title} style={C.card}>
                  <div style={{fontSize:11,fontWeight:800,color,marginBottom:10,letterSpacing:0.8}}>{title}</div>
                  {list.map(sym=>(
                    <div key={sym} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div><div style={{fontWeight:700,fontSize:12}}>{sym}</div><div style={{fontSize:10,color:T.muted}}>${prices[sym]?.toFixed(2)}</div></div>
                      <div style={{color,fontWeight:700,fontSize:12}}>{changes[sym]>=0?"+":""}{changes[sym]?.toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PORTFOLIO ══ */}
        {tab==="portfolio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11,marginBottom:18}}>
              {[{l:"Cash",v:`$${cash.toLocaleString("en-US",{minimumFractionDigits:2})}`,c:T.accent},{l:"Invested",v:`$${portfolioValue.toLocaleString("en-US",{minimumFractionDigits:2})}`,c:T.purple},{l:"Total P&L",v:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`,c:pnl>=0?T.green:T.red},{l:"Positions",v:Object.keys(portfolio).length,c:T.text}].map(s=>(
                <div key={s.l} style={C.card}><div style={{...C.lbl}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:s.c,marginTop:5}}>{s.v}</div></div>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
              <button onClick={exportCSV} style={{...C.btn(T.green),padding:"7px 16px"}}>⬇ Export CSV</button>
            </div>
            {Object.keys(portfolio).length===0?(
              <div style={{textAlign:"center",padding:"60px 0",color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>📂</div><div>No positions yet.</div></div>
            ):(
              <>
                <div style={{display:"grid",gap:7}}>
                  {Object.entries(portfolio).map(([sym,qty])=>{
                    const price=prices[sym],change=changes[sym],value=price*qty,isUp=change>=0,pred=predictions[sym];
                    return(
                      <div key={sym} style={{...C.card,display:"grid",gridTemplateColumns:"1.5fr 0.8fr 0.9fr 1fr 0.8fr 1.4fr",alignItems:"center",gap:10}}>
                        <div>
                          <div style={{fontWeight:800,color:T.accent,fontSize:15}}>{sym}</div>
                          <div style={{fontSize:10,color:T.muted}}>{STOCKS_DATA[sym]?.name}</div>
                          {pred&&<div style={{fontSize:10,color:pred.sentiment==="Bullish"?T.green:T.red,marginTop:2}}>{pred.sentiment} {pred.confidence}%</div>}
                        </div>
                        <div><div style={{...C.lbl}}>Shares</div><div style={{fontWeight:700,fontSize:14}}>{qty}</div></div>
                        <div><div style={{...C.lbl}}>Price</div><div style={{fontWeight:700,fontSize:14}}>${price?.toFixed(2)}</div></div>
                        <div><div style={{...C.lbl}}>Value</div><div style={{fontWeight:700,fontSize:14,color:T.purple}}>${value.toFixed(2)}</div></div>
                        <div style={{color:isUp?T.green:T.red,fontWeight:700,fontSize:12}}>{isUp?"▲":"▼"}{Math.abs(change).toFixed(2)}%</div>
                        <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
                          <button onClick={()=>runPrediction(sym)} style={{...C.btn(T.purple),padding:"4px 9px",fontSize:10}}>🤖</button>
                          <button onClick={()=>setModal({sym,type:"SELL"})} style={{...C.btn(T.red)}}>SELL</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{...C.card,marginTop:16}}>
                  <div style={{...C.lbl,marginBottom:12}}>Allocation</div>
                  {Object.entries(portfolio).map(([sym,qty])=>{
                    const value=prices[sym]*qty, pct=portfolioValue>0?(value/portfolioValue)*100:0;
                    const cc={AAPL:T.accent,TSLA:T.red,GOOGL:T.green,AMZN:T.yellow,MSFT:T.purple,NVDA:"#ff7b72",META:"#79c0ff",NFLX:"#ffa657"}[sym]||T.accent;
                    return(
                      <div key={sym} style={{marginBottom:9}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                          <span style={{fontWeight:700}}>{sym}</span>
                          <span style={{color:T.muted}}>{pct.toFixed(1)}% · ${value.toFixed(2)}</span>
                        </div>
                        <div style={{height:7,background:T.bg,borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:cc,borderRadius:4,transition:"width 0.5s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ WATCHLIST ══ */}
        {tab==="watchlist"&&(
          <div>
            {watchlist.length===0?(
              <div style={{textAlign:"center",padding:"60px 0",color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>⭐</div><div>Star stocks in the Market tab.</div></div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(256px,1fr))",gap:13}}>
                {watchlist.map(sym=>{
                  const price=prices[sym],change=changes[sym],isUp=change>=0,pred=predictions[sym];
                  return(
                    <div key={sym} style={{...C.card,padding:17}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
                        <div><div style={{fontWeight:800,fontSize:17,color:T.accent}}>{sym}</div><div style={{fontSize:10,color:T.muted}}>{STOCKS_DATA[sym]?.name}</div></div>
                        <button onClick={()=>toggleWatch(sym)} style={{background:"none",border:"none",color:T.yellow,fontSize:17,cursor:"pointer"}}>★</button>
                      </div>
                      <div style={{fontSize:24,fontWeight:800,marginBottom:3}}>${price?.toFixed(2)}</div>
                      <div style={{color:isUp?T.green:T.red,fontWeight:700,fontSize:12,marginBottom:9}}>{isUp?"▲":"▼"}{Math.abs(change).toFixed(2)}%</div>
                      <MiniChart data={histories[sym]?.slice(-20)} color={isUp?T.green:T.red} width={218} height={42}/>
                      {pred&&(
                        <div style={{marginTop:9,background:T.bg,borderRadius:8,padding:"8px 10px",fontSize:10}}>
                          <div style={{color:pred.sentiment==="Bullish"?T.green:T.red,fontWeight:700,marginBottom:3}}>{pred.sentiment} · {pred.confidence}% confidence</div>
                          <div style={{color:T.muted}}>7d: ${pred.pred7} · 14d: ${pred.pred14} · 30d: ${pred.pred30}</div>
                        </div>
                      )}
                      <div style={{display:"flex",gap:7,marginTop:11}}>
                        <button onClick={()=>setModal({sym,type:"BUY"})} style={{flex:1,...C.btn(T.green),padding:"7px"}}>BUY</button>
                        <button onClick={()=>runPrediction(sym)} disabled={predicting===sym} style={{flex:1,...C.btn(T.purple),padding:"7px",fontSize:11,opacity:predicting===sym?0.6:1}}>🤖 AI</button>
                        <button onClick={()=>{setChartSymbol(sym);setTab("charts");}} style={{flex:1,...C.btn(T.accent),padding:"7px"}}>CHART</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ CHARTS ══ */}
        {tab==="charts"&&(
          <div>
            <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              {Object.keys(STOCKS_DATA).map(sym=>(
                <button key={sym} onClick={()=>setChartSymbol(sym)} style={{background:chartSymbol===sym?T.accent:T.card,color:chartSymbol===sym?"#000":T.muted,border:`1px solid ${chartSymbol===sym?T.accent:T.border}`,borderRadius:7,padding:"5px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{sym}</button>
              ))}
              <div style={{marginLeft:"auto",display:"flex",gap:5}}>
                {[["none","Price"],["rsi","RSI"],["macd","MACD"],["bb","Bollinger"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setIndicator(v)} style={{background:indicator===v?T.purple:T.card,color:indicator===v?"#000":T.muted,border:`1px solid ${indicator===v?T.purple:T.border}`,borderRadius:7,padding:"4px 11px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={C.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:T.accent}}>{chartSymbol}</div>
                  <div style={{fontSize:11,color:T.muted}}>{STOCKS_DATA[chartSymbol]?.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:800}}>${prices[chartSymbol]?.toFixed(2)}</div>
                  <div style={{color:changes[chartSymbol]>=0?T.green:T.red,fontWeight:700,fontSize:12}}>{changes[chartSymbol]>=0?"▲":"▼"}{Math.abs(changes[chartSymbol]||0).toFixed(2)}%</div>
                </div>
              </div>
              <AdvancedChart symbol={chartSymbol} data={histories[chartSymbol]} indicator={indicator} T={T}/>
              <div style={{display:"flex",gap:7,marginTop:8,fontSize:10,color:T.muted,flexWrap:"wrap"}}>
                <span style={{background:T.accent+"33",color:T.accent,borderRadius:4,padding:"2px 8px"}}>— Price</span>
                {indicator==="bb"&&<><span style={{background:T.accent+"22",color:T.accent,borderRadius:4,padding:"2px 8px"}}>--- Bands</span><span style={{background:T.purple+"22",color:T.purple,borderRadius:4,padding:"2px 8px"}}>— Mid</span></>}
                {indicator==="macd"&&<><span style={{background:T.accent+"22",color:T.accent,borderRadius:4,padding:"2px 8px"}}>— MACD</span><span style={{background:T.orange+"22",color:T.orange,borderRadius:4,padding:"2px 8px"}}>— Signal</span></>}
                {indicator==="rsi"&&<span style={{background:T.purple+"22",color:T.purple,borderRadius:4,padding:"2px 8px"}}>— RSI(14)</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginTop:13}}>
                {[["Open",`$${(prices[chartSymbol]*0.998).toFixed(2)}`],["High",`$${(prices[chartSymbol]*1.014).toFixed(2)}`],["Low",`$${(prices[chartSymbol]*0.986).toFixed(2)}`],["Volume",`${(Math.random()*50+10).toFixed(1)}M`]].map(([l,v])=>(
                  <div key={l} style={{background:T.bg,borderRadius:8,padding:"9px 12px"}}><div style={{...C.lbl}}>{l}</div><div style={{fontWeight:700,fontSize:13,marginTop:2}}>{v}</div></div>
                ))}
              </div>
              {predictions[chartSymbol]&&(
                <div style={{background:T.bg,borderRadius:10,padding:13,marginTop:13}}>
                  <div style={{fontSize:12,fontWeight:800,color:T.purple,marginBottom:9}}>🤖 AI Price Prediction</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
                    {[["7 Day",predictions[chartSymbol].pred7],["14 Day",predictions[chartSymbol].pred14],["30 Day",predictions[chartSymbol].pred30]].map(([l,v])=>(
                      <div key={l} style={{background:T.card,borderRadius:8,padding:"10px 11px"}}>
                        <div style={{...C.lbl}}>{l}</div>
                        <div style={{fontSize:16,fontWeight:800,color:v>prices[chartSymbol]?T.green:T.red,marginTop:2}}>${v}</div>
                        <div style={{fontSize:10,color:T.muted,marginTop:2}}>{v>prices[chartSymbol]?"+":""}{((v-prices[chartSymbol])/prices[chartSymbol]*100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:8}}>Confidence: {predictions[chartSymbol].confidence}% · Generated: {predictions[chartSymbol].generated}</div>
                </div>
              )}
              <div style={{display:"flex",gap:9,marginTop:14}}>
                <button onClick={()=>setModal({sym:chartSymbol,type:"BUY"})} style={{flex:1,...C.btn(T.green),padding:"11px",fontSize:13}}>BUY {chartSymbol}</button>
                <button onClick={()=>runPrediction(chartSymbol)} disabled={predicting===chartSymbol} style={{flex:0.6,...C.btn(T.purple),padding:"11px",fontSize:12,opacity:predicting===chartSymbol?0.6:1}}>{predicting===chartSymbol?"Analyzing...":"🤖 Predict"}</button>
                <button onClick={()=>setModal({sym:chartSymbol,type:"SELL"})} style={{flex:1,...C.btn(T.red),padding:"11px",fontSize:13}}>SELL {chartSymbol}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ NEWS ══ */}
        {tab==="news"&&(
          <div>
            <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
              {["ALL",...Object.keys(STOCKS_DATA)].map(s=>(
                <button key={s} onClick={()=>setNewsFilter(s)} style={{background:newsFilter===s?T.accent:T.card,color:newsFilter===s?"#000":T.muted,border:`1px solid ${newsFilter===s?T.accent:T.border}`,borderRadius:7,padding:"4px 11px",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{s}</button>
              ))}
            </div>
            <div style={{display:"grid",gap:9}}>
              {filteredNews.map(n=>(
                <div key={n.id} style={{...C.card,display:"flex",gap:13,alignItems:"flex-start"}}>
                  <div style={{width:5,minHeight:50,borderRadius:3,background:n.sentiment==="positive"?T.green:T.red,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                      <Badge label={n.sym} color={T.accent}/>
                      <Badge label={n.sentiment==="positive"?"BULLISH":"BEARISH"} color={n.sentiment==="positive"?T.green:T.red}/>
                      <Badge label={n.source} color={T.muted}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,lineHeight:1.5}}>{n.headline}</div>
                    <div style={{fontSize:10,color:T.muted,marginTop:5}}>{n.time}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                    <button onClick={()=>setModal({sym:n.sym,type:"BUY"})} style={{...C.btn(T.green),padding:"4px 10px",fontSize:11}}>BUY</button>
                    <button onClick={()=>{setChartSymbol(n.sym);setTab("charts");}} style={{...C.btn(T.accent),padding:"4px 10px",fontSize:11}}>CHART</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{...C.card,marginTop:16}}>
              <div style={{...C.lbl,marginBottom:11}}>Market Sentiment</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(115px,1fr))",gap:9}}>
                {Object.keys(STOCKS_DATA).map(sym=>{
                  const rel=NEWS_FEED.filter(n=>n.sym===sym), bull=rel.filter(n=>n.sentiment==="positive").length;
                  const pct=rel.length>0?Math.round((bull/rel.length)*100):50;
                  return(
                    <div key={sym} style={{background:T.bg,borderRadius:8,padding:"9px 11px"}}>
                      <div style={{fontWeight:700,fontSize:12,color:T.accent}}>{sym}</div>
                      <div style={{fontSize:11,color:pct>=50?T.green:T.red,fontWeight:700,marginTop:2}}>{pct}% Bullish</div>
                      <div style={{height:4,background:T.border,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:pct>=50?T.green:T.red,borderRadius:2}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ ORDERS ══ */}
        {tab==="orders"&&(
          <div>
            <div style={{...C.card,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:11}}>Order Types Guide</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[["Market","Execute immediately at current price. Best for quick entry/exit.",T.accent],["Limit","Execute only when price reaches your target. Buy low / Sell high.",T.green],["Stop-Loss","Auto-sell when price drops below threshold. Protects your capital.",T.red]].map(([t,d,c])=>(
                  <div key={t} style={{background:T.bg,borderRadius:9,padding:13,borderLeft:`3px solid ${c}`}}>
                    <div style={{fontWeight:700,fontSize:12,color:c,marginBottom:5}}>{t} Order</div>
                    <div style={{fontSize:11,color:T.muted,lineHeight:1.6}}>{d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{...C.card,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:13}}>Place New Order</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><div style={{...C.lbl,marginBottom:5}}>Stock Symbol</div>
                  <select value={orderFormSym} onChange={e=>setOrderFormSym(e.target.value)} style={{...C.inp}}>
                    {Object.keys(STOCKS_DATA).map(s=><option key={s} value={s}>{s} — {STOCKS_DATA[s].name}</option>)}
                  </select>
                </div>
                <div><div style={{...C.lbl,marginBottom:5}}>Order Type</div>
                  <select value={orderFormType} onChange={e=>setOrderFormType(e.target.value)} style={{...C.inp}}>
                    <option value="limit">Limit</option><option value="stop">Stop-Loss</option>
                  </select>
                </div>
                <div><div style={{...C.lbl,marginBottom:5}}>Trade</div>
                  <select value={orderFormTrade} onChange={e=>setOrderFormTrade(e.target.value)} style={{...C.inp}}>
                    <option value="BUY">BUY</option><option value="SELL">SELL</option>
                  </select>
                </div>
                <div><div style={{...C.lbl,marginBottom:5}}>Quantity</div>
                  <input type="number" min={1} value={orderFormQty} onChange={e=>setOrderFormQty(Math.max(1,parseInt(e.target.value)||1))} style={{...C.inp}}/>
                </div>
                <div style={{gridColumn:"span 2"}}><div style={{...C.lbl,marginBottom:5}}>Trigger Price ($)</div>
                  <input type="number" step="0.01" value={orderFormTrigger} onChange={e=>setOrderFormTrigger(e.target.value)} placeholder={`Current: $${prices[orderFormSym]?.toFixed(2)}`} style={{...C.inp}}/>
                </div>
              </div>
              <button onClick={()=>{
                const tp=parseFloat(orderFormTrigger);
                if(!tp){showToast("Enter a trigger price","error");return;}
                setPendingOrders(p=>[...p,{id:Date.now(),sym:orderFormSym,tradeType:orderFormTrade,qty:orderFormQty,orderType:orderFormType,triggerPrice:tp,placedAt:new Date().toLocaleTimeString()}]);
                showToast(`${orderFormType.toUpperCase()} order placed: ${orderFormTrade} ${orderFormQty} ${orderFormSym} @ $${tp}`,"info");
                setOrderFormTrigger("");
              }} style={{...C.btn(T.accent),width:"100%",padding:"11px",fontSize:13}}>Place Order</button>
            </div>

            <div style={{fontSize:12,color:T.muted,marginBottom:10}}>Pending Orders ({pendingOrders.length})</div>
            {pendingOrders.length===0?(
              <div style={{...C.card,textAlign:"center",padding:"36px 0",color:T.muted}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div>No pending orders.</div></div>
            ):(
              <div style={{display:"grid",gap:7}}>
                {pendingOrders.map(o=>(
                  <div key={o.id} style={{...C.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",gap:13,alignItems:"center"}}>
                      <Badge label={o.orderType.toUpperCase()} color={o.orderType==="limit"?T.green:T.red}/>
                      <div>
                        <div style={{fontWeight:700,color:T.accent,fontSize:13}}>{o.tradeType} {o.qty} {o.sym}</div>
                        <div style={{fontSize:10,color:T.muted}}>Trigger @ ${o.triggerPrice?.toFixed(2)} · {o.placedAt}</div>
                      </div>
                    </div>
                    <button onClick={()=>setPendingOrders(p=>p.filter(x=>x.id!==o.id))} style={{...C.btn(T.red),padding:"4px 11px",fontSize:11}}>Cancel</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD ══ */}
        {tab==="leaderboard"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Weekly Trading Competition</div>
              <div style={{fontSize:22,fontWeight:800}}>Top Traders Leaderboard</div>
            </div>
            <div style={{display:"grid",gap:9}}>
              {lbData.map((r,i)=>{
                const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
                const medalColor=i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":T.muted;
                const isMe=r.isMe||r.name===DEMO_USER.name;
                return(
                  <div key={r.rank} style={{...C.card,display:"grid",gridTemplateColumns:"48px 46px 1fr 1fr 1fr 1fr",alignItems:"center",gap:11,border:isMe?`2px solid ${T.accent}`:`1px solid ${T.border}`,background:isMe?T.cardHover:T.card}}>
                    <div style={{fontSize:16,fontWeight:800,color:medalColor,textAlign:"center"}}>{medal||`#${r.rank}`}</div>
                    <div style={{width:36,height:36,borderRadius:"50%",background:isMe?"linear-gradient(135deg,#58a6ff,#bc8cff)":T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:isMe?"#000":T.text}}>{r.avatar}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{r.name}{isMe&&<span style={{fontSize:10,color:T.accent,marginLeft:6}}>(You)</span>}</div>
                      <div style={{fontSize:10,color:T.muted}}>Active Trader</div>
                    </div>
                    <div><div style={{...C.lbl}}>P&L</div><div style={{fontWeight:800,fontSize:14,color:r.pnl>=0?T.green:T.red}}>{r.pnl>=0?"+":""}${r.pnl.toLocaleString()}</div></div>
                    <div><div style={{...C.lbl}}>Trades</div><div style={{fontWeight:700,fontSize:14}}>{r.trades}</div></div>
                    <div><div style={{...C.lbl}}>Win Rate</div><div style={{fontWeight:700,fontSize:14,color:r.winRate>=60?T.green:r.winRate>=40?T.yellow:T.red}}>{r.winRate}%</div></div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:18}}>
              {[{l:"Your Rank",v:`#${lbData.findIndex(r=>r.isMe||r.name===DEMO_USER.name)+1}`,c:T.accent},{l:"Your P&L",v:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`,c:pnl>=0?T.green:T.red},{l:"Trades",v:transactions.length,c:T.text}].map(s=>(
                <div key={s.l} style={C.card}><div style={{...C.lbl}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:s.c,marginTop:5}}>{s.v}</div></div>
              ))}
            </div>
          </div>
        )}

        {/* ══ HISTORY ══ */}
        {tab==="history"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:12,color:T.muted}}>{transactions.length} transactions</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={exportCSV} style={{...C.btn(T.green),padding:"6px 14px"}}>⬇ Export CSV</button>
                {transactions.length>0&&<button onClick={()=>setTransactions([])} style={{...C.btn(T.red),padding:"6px 14px"}}>Clear</button>}
              </div>
            </div>
            {transactions.length===0?(
              <div style={{textAlign:"center",padding:"60px 0",color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>No transactions yet.</div></div>
            ):(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:16}}>
                  {[{l:"Total Bought",v:`$${buyTotal.toFixed(2)}`,c:T.red},{l:"Total Sold",v:`$${sellTotal.toFixed(2)}`,c:T.green},{l:"Net P&L",v:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`,c:pnl>=0?T.green:T.red}].map(s=>(
                    <div key={s.l} style={C.card}><div style={{...C.lbl}}>{s.l}</div><div style={{fontSize:19,fontWeight:800,color:s.c,marginTop:5}}>{s.v}</div></div>
                  ))}
                </div>
                <div style={{display:"grid",gap:6}}>
                  <div style={{display:"grid",gridTemplateColumns:"70px 1fr 0.8fr 0.9fr 1fr 70px 70px",padding:"5px 13px",fontSize:10,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>
                    <div>Type</div><div>Symbol</div><div>Qty</div><div>Price</div><div>Total</div><div>Order</div><div>Time</div>
                  </div>
                  {transactions.map(t=>(
                    <div key={t.id} style={{display:"grid",gridTemplateColumns:"70px 1fr 0.8fr 0.9fr 1fr 70px 70px",padding:"10px 13px",...C.card,fontSize:12,alignItems:"center"}}>
                      <Badge label={t.type} color={t.type==="BUY"?T.green:T.red}/>
                      <div style={{fontWeight:700,color:T.accent}}>{t.sym}</div>
                      <div>{t.qty}sh</div>
                      <div>${t.price.toFixed(2)}</div>
                      <div style={{fontWeight:700}}>${(t.price*t.qty).toFixed(2)}</div>
                      <Badge label={t.orderType||"mkt"} color={T.muted}/>
                      <div style={{fontSize:10,color:T.muted}}>{t.time}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {modal&&<TradeModal modal={modal} onClose={handleModalClose} prices={prices} cash={cash} portfolio={portfolio} T={T}/>}
    </div>
  );
}
