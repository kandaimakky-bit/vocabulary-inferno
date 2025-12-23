import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, User, Lock, Key, Sparkles, Orbit, X, CheckCircle, Crown, ShoppingBag, Feather, Hexagon, Shield, Zap, Eye, Compass, Sword, Ghost, Skull, History, Clock } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, runTransaction, query, orderBy, limit, deleteField } from "firebase/firestore";
import { db } from "./firebase";

// --- Constants & Config ---
const ADMIN_SECRET_KEY = "teacher777";
const COOLDOWN_HOURS = 24; // 攻撃のクールダウン時間

// アイテム定義
const ARTIFACTS = [
  // Common / Misc
  { id: 'art_f_dust', rank: 'F', name: '星屑の残滓', cost: 500, maxStock: 999, icon: <Ghost />, desc: '微かな魔力。コレクション用。', color: 'text-slate-400', border: 'border-slate-600' },
  { id: 'art_e_pen', rank: 'E', name: '見習いの羽ペン', cost: 1500, maxStock: 50, icon: <Feather />, desc: '思考記録用。', color: 'text-emerald-200', border: 'border-emerald-700' },
  { id: 'art_d_compass', rank: 'D', name: '壊れた羅針盤', cost: 2500, maxStock: 30, icon: <Compass />, desc: '迷いもまた学習。', color: 'text-emerald-400', border: 'border-emerald-500' },
  { id: 'art_c_lantern', rank: 'C', name: '知恵のランタン', cost: 4000, maxStock: 20, icon: <Zap />, desc: '暗闇を照らす。', color: 'text-blue-400', border: 'border-blue-500' },
  
  // Battle Items (High Cost)
  { id: 'art_b_sword', rank: 'B', name: '断罪の剣', cost: 8000, maxStock: 999, icon: <Sword />, desc: '【攻撃用】他者からアイテムを奪う権利を得る。所持していると1日1回攻撃が可能になる（永続）。', color: 'text-red-400', border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  { id: 'art_a_shield', rank: 'A', name: '概念のイージス', cost: 5000, maxStock: 10, icon: <Shield />, desc: '【防御用】攻撃された際、一度だけ自動で無効化して消滅する（消耗品）。', color: 'text-purple-400', border: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' },
  
  // Rare Targets
  { id: 'art_s_prism', rank: 'S', name: '虚空のプリズム', cost: 15000, maxStock: 3, icon: <Hexagon />, desc: '【限定3個】世界を観測する瞳。', color: 'text-orange-400', border: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]' },
  { id: 'art_ss_core', rank: 'SS', name: '原初のコア', cost: 30000, maxStock: 2, icon: <Orbit />, desc: '【限定2個】宇宙創造の種子。', color: 'text-rose-400', border: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]' },
  { id: 'art_sss_eye', rank: 'SSS', name: '真理の瞳', cost: 50000, maxStock: 1, icon: <Eye />, desc: '【限定1個】神の視座。到達者の証。', color: 'text-yellow-200', border: 'border-yellow-200 shadow-[0_0_30px_rgba(253,224,71,0.8)] bg-yellow-500/10' },
];

const getStage = (points) => {
  if (points >= 10000) return { idx: 9, name: "根源の劫火", color: "text-white", glow: "shadow-[0_0_40px_rgba(255,255,255,0.8)] border-white" };
  if (points >= 7000) return { idx: 8, name: "絶対零度", color: "text-indigo-200", glow: "shadow-[0_0_30px_rgba(165,180,252,0.6)] border-indigo-200" };
  if (points >= 5000) return { idx: 7, name: "天空の閃光", color: "text-blue-400", glow: "shadow-[0_0_30px_rgba(96,165,250,0.5)] border-blue-400" };
  if (points >= 3000) return { idx: 6, name: "蒼き使徒", color: "text-cyan-400", glow: "shadow-[0_0_30px_rgba(34,211,238,0.4)] border-cyan-400" };
  if (points >= 2000) return { idx: 5, name: "紫炎の精霊", color: "text-fuchsia-400", glow: "shadow-[0_0_20px_rgba(232,121,249,0.4)] border-fuchsia-400" };
  if (points >= 1000) return { idx: 4, name: "深紅の騎士", color: "text-rose-500", glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)] border-rose-500" };
  if (points >= 500) return { idx: 3, name: "緋色の聖騎士", color: "text-orange-500", glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500" };
  if (points >= 200) return { idx: 2, name: "琥珀の斥候", color: "text-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)] border-amber-500" };
  if (points >= 100) return { idx: 1, name: "熾火の戦士", color: "text-orange-300", glow: "shadow-[0_0_10px_rgba(253,186,116,0.3)] border-orange-300" };
  return { idx: 0, name: "漂う種火", color: "text-slate-400", glow: "shadow-none border-slate-700" };
};

export default function App() {
  const [myId, setMyId] = useState(localStorage.getItem('vocab_uid') || '');
  const [myName, setMyName] = useState(localStorage.getItem('vocab_name') || '');
  const [players, setPlayers] = useState([]);
  const [battleLogs, setBattleLogs] = useState([]);
  const [inputScore, setInputScore] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(!myId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [config, setConfig] = useState({ isOpen: false, pass: '', sessionId: '' });
  const [shopStock, setShopStock] = useState({});
  const [logoClicks, setLogoClicks] = useState(0);
  const [shopClicks, setShopClicks] = useState(0); // ショップアイコンクリック数管理
  const [showShop, setShowShop] = useState(false);
  
  // Battle States
  const [battleTarget, setBattleTarget] = useState(null);
  const [isBattleAnimating, setIsBattleAnimating] = useState(false);
  const [battleResult, setBattleResult] = useState(null);

  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(data.sort((a, b) => b.points - a.points));
    });
    const unsubConfig = onSnapshot(doc(db, "settings", "global"), (doc) => { if (doc.exists()) setConfig(doc.data()); });
    const unsubStock = onSnapshot(doc(db, "settings", "shop"), (doc) => { if (doc.exists()) setShopStock(doc.data()); else setShopStock({}); });
    const q = query(collection(db, "battle_logs"), orderBy("createdAt", "desc"), limit(20));
    const unsubLogs = onSnapshot(q, (snapshot) => {
      setBattleLogs(snapshot.docs.map(doc => doc.data()));
    });
    return () => { unsubPlayers(); unsubConfig(); unsubStock(); unsubLogs(); };
  }, []);

  const me = players.find(p => p.id === myId) || { points: 0, name: myName || 'Guest', inventory: {}, lastAttackAt: 0 };
  const currentStage = getStage(me.points);

  const getTimeUntilAttack = () => {
    if (!me.lastAttackAt) return 0;
    const now = Date.now();
    const diff = now - me.lastAttackAt;
    const cooldownMillis = COOLDOWN_HOURS * 60 * 60 * 1000;
    return Math.max(0, cooldownMillis - diff);
  };

  const formatTime = (millis) => {
    const hours = Math.floor(millis / (1000 * 60 * 60));
    const minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // --- Actions ---
  const processCharge = async (isGamble) => {
    if (!config.isOpen) return;
    if (studentPass !== config.pass) return alert("パスコード不一致");
    const score = Number(inputScore);
    if (!score || score < 0 || score > 30) return alert("0-30で入力");
    
    let points = score;
    let msg = `チャージ: +${points}`;
    if (isGamble) {
      const r = Math.random();
      if (r < 0.05) { points *= 3; msg = `覚醒！3倍！ +${points}`; }
      else if (r < 0.15) { points *= 2; msg = `奔流！2倍！ +${points}`; }
      else if (r < 0.3) { points = Math.round(points * 1.5); msg = `共鳴！1.5倍！ +${points}`; }
      else { points = 0; msg = `霧散... 0pts`; }
    }
    await updateDoc(doc(db, "players", myId), { 
      points: increment(points), 
      lastChargedSessionId: config.sessionId
    });
    alert(msg);
    setInputScore(''); setStudentPass('');
  };

  const buyArtifact = async (item) => {
    if (item.id === 'art_a_shield' && me.inventory?.[item.id]) return alert("防御シールドは1つしか持てません");
    if (item.id !== 'art_a_shield' && me.inventory?.[item.id]) return alert("既に所持しています");
    if (me.points < item.cost) return alert("ポイント不足");
    if (item.maxStock < 999 && (shopStock[item.id] || 0) >= item.maxStock) return alert("SOLD OUT");

    try {
      await runTransaction(db, async (transaction) => {
        const stockRef = doc(db, "settings", "shop");
        const playerRef = doc(db, "players", myId);
        const stockDoc = await transaction.get(stockRef);
        const playerDoc = await transaction.get(playerRef);
        
        const currentStock = stockDoc.data()?.[item.id] || 0;
        if (item.maxStock < 999 && currentStock >= item.maxStock) throw "在庫切れ";
        if (playerDoc.data().points < item.cost) throw "ポイント不足";

        transaction.update(stockRef, { [item.id]: increment(1) });
        transaction.update(playerRef, { 
          points: increment(-item.cost),
          [`inventory.${item.id}`]: true 
        });
      });
      alert(`購入成功: ${item.name}`);
    } catch (e) {
      alert(`エラー: ${e}`);
    }
  };

  const initBattle = (targetPlayer, item) => {
    if (targetPlayer.id === myId) return;
    if (!me.inventory?.['art_b_sword']) {
      return alert("攻撃には『断罪の剣 (Bランク)』が必要です。\nまずはショップで剣を購入してください。");
    }
    const waitTime = getTimeUntilAttack();
    if (waitTime > 0) {
      return alert(`攻撃クールダウン中です。\nあと ${formatTime(waitTime)} で再攻撃可能です。`);
    }
    setBattleTarget({ player: targetPlayer, item: item });
  };

  const executeBattle = async () => {
    if (!battleTarget) return;
    const { player: enemy, item } = battleTarget;
    setIsBattleAnimating(true);

    try {
      await runTransaction(db, async (transaction) => {
        const myRef = doc(db, "players", myId);
        const enemyRef = doc(db, "players", enemy.id);
        const logRef = doc(collection(db, "battle_logs"));

        const myDoc = await transaction.get(myRef);
        const enemyDoc = await transaction.get(enemyRef);
        const myData = myDoc.data();
        const enemyData = enemyDoc.data();

        if (!myData.inventory?.['art_b_sword']) throw "剣がない";
        if (myData.lastAttackAt && (Date.now() - myData.lastAttackAt < COOLDOWN_HOURS * 3600 * 1000)) throw "クールダウン中";
        if (!enemyData.inventory?.[item.id]) throw "相手がアイテムを持っていない";

        transaction.update(myRef, { lastAttackAt: Date.now() });

        if (enemyData.inventory?.['art_a_shield']) {
           transaction.update(enemyRef, {
             [`inventory.art_a_shield`]: deleteField()
           });
           transaction.set(logRef, {
             attacker: myData.name, defender: enemyData.name, item: item.name, result: 'DEFENDED', createdAt: new Date().toISOString()
           });
           setBattleResult('DEFENDED');
           return;
        }

        const winChance = myData.points / (myData.points + enemyData.points); 
        const adjustedChance = Math.max(0.1, Math.min(0.9, winChance));
        const isWin = Math.random() < adjustedChance;

        if (isWin) {
          transaction.update(enemyRef, { [`inventory.${item.id}`]: deleteField() });
          transaction.update(myRef, { [`inventory.${item.id}`]: true });
          transaction.set(logRef, {
             attacker: myData.name, defender: enemyData.name, item: item.name, result: 'WIN', createdAt: new Date().toISOString()
           });
           setBattleResult('WIN');
        } else {
          transaction.set(logRef, {
             attacker: myData.name, defender: enemyData.name, item: item.name, result: 'LOSE', createdAt: new Date().toISOString()
           });
           setBattleResult('LOSE');
        }
      });
    } catch (e) {
      alert("戦闘エラー: " + e);
      setIsBattleAnimating(false);
      setBattleTarget(null);
    }
  };

  // --- UI Parts ---
  if (isJoinMode) {
    return (
      <div className="min-h-screen bg-[#050511] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-sm w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl">
          <h1 className="text-4xl font-black mb-2">INFERNO</h1>
          <p className="text-xs text-slate-400 mb-8">WAR PROTOCOL v2</p>
          <input type="text" placeholder="NAME" className="w-full p-4 bg-black/40 rounded-xl text-center text-white mb-4" value={myName} onChange={e => setMyName(e.target.value)} />
          <button onClick={() => {
            const newId = Date.now().toString();
            localStorage.setItem('vocab_uid', newId); setMyId(newId);
            setDoc(doc(db, "players", newId), { name: myName, points: 0, inventory: {} });
            setIsJoinMode(false);
          }} className="w-full bg-cyan-600 py-4 rounded-xl font-bold">CONNECT</button>
        </div>
      </div>
    );
  }

  const waitTime = getTimeUntilAttack();

  return (
    <div className="min-h-screen bg-[#030309] text-white pb-24 font-sans relative overflow-x-hidden">
      
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#030309] to-black -z-10" />

      {/* Header */}
      <header className="px-6 py-4 fixed top-0 w-full z-30 flex justify-between items-center backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-2" onClick={() => { setLogoClicks(c => c + 1); if(logoClicks>=4) setShowAdminAuth(true); }}>
           <Flame size={16} className="text-cyan-500" /><span className="font-bold tracking-widest text-xs">INFERNO</span>
        </div>
        <div className="flex items-center gap-3">
          {/* ショップボタン：3回クリックで発動 */}
          <button 
            onClick={() => {
              const nextCount = shopClicks + 1;
              if (nextCount >= 3) {
                setShowShop(true);
                setShopClicks(0);
              } else {
                setShopClicks(nextCount);
              }
            }} 
            className="w-8 h-8 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 active:scale-95 transition-transform"
          >
            <ShoppingBag size={14} />
          </button>
          <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full flex items-center gap-2">
            <User size={12}/>
            <span className="text-xs font-bold truncate max-w-[80px]">{me.name}</span>
          </div>
        </div>
      </header>

      {/* Battle Animation Modal */}
      <AnimatePresence>
        {isBattleAnimating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            {!battleResult ? (
              <div className="text-center">
                 <Sword size={80} className="text-red-500 mx-auto animate-pulse mb-8" />
                 <h2 className="text-4xl font-black text-red-500 tracking-widest italic">EXECUTING</h2>
                 <p className="text-slate-400 font-mono mt-4">Breaking Concept Barriers...</p>
                 <WaitAndShowResult setResult={executeBattle} />
              </div>
            ) : (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center p-8 bg-slate-900 border border-white/10 rounded-3xl max-w-sm mx-4">
                {battleResult === 'WIN' && (
                  <>
                    <Crown size={60} className="text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-yellow-400 mb-2">SUCCESS</h2>
                    <p className="text-sm text-slate-300">略奪成功。アイテムを獲得しました。<br/><span className="text-xs text-red-400 mt-2 block">(クールダウン開始: 24h)</span></p>
                  </>
                )}
                {battleResult === 'LOSE' && (
                  <>
                    <Skull size={60} className="text-slate-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-slate-500 mb-2">FAILED</h2>
                    <p className="text-sm text-slate-300">略奪失敗。相手の防衛網を突破できず。<br/><span className="text-xs text-red-400 mt-2 block">(クールダウン開始: 24h)</span></p>
                  </>
                )}
                {battleResult === 'DEFENDED' && (
                  <>
                    <Shield size={60} className="text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-purple-400 mb-2">BLOCKED</h2>
                    <p className="text-sm text-slate-300">相手の『イージス』により無効化されました。<br/>(相手の盾を破壊しました)</p>
                  </>
                )}
                <button onClick={() => { setIsBattleAnimating(false); setBattleResult(null); setBattleTarget(null); }} className="mt-8 w-full py-3 bg-white/10 rounded-xl font-bold">CLOSE</button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Confirm Modal */}
      {battleTarget && !isBattleAnimating && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
           <div className="bg-[#15161e] border border-red-500/50 rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-center text-red-500 font-black tracking-widest text-lg mb-6 flex items-center justify-center gap-2"><Sword size={18}/> WARNING</h3>
              <p className="text-center text-xs text-slate-400 mb-6">
                この攻撃を実行すると、<br/>
                <span className="text-white font-bold">24時間のクールダウン</span>が発生します。<br/>
                本当に実行しますか？
              </p>
              
              <div className="bg-black/50 p-4 rounded mb-6 flex justify-between items-center border border-white/5">
                 <span className="text-xs font-bold text-slate-300">ターゲット</span>
                 <div className="flex items-center gap-2 font-bold text-white text-sm">
                    {battleTarget.item.icon} {battleTarget.item.name}
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setBattleTarget(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-xs">CANCEL</button>
                 <button onClick={executeBattle} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-red-900/50">ASSAULT (START CD)</button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-24 px-6 max-w-md mx-auto space-y-10">
        
        {/* Status Card */}
        <section className="text-center">
          <div className={`inline-flex p-10 rounded-full border border-white/5 bg-white/5 ${currentStage.glow}`}>
             <Flame size={50} className={`${currentStage.color}`} />
          </div>
          <div className="mt-4">
             <h2 className={`text-lg font-black tracking-widest ${currentStage.color}`}>{currentStage.name}</h2>
             <div className="text-5xl font-black text-white mt-2 tracking-tighter">{me.points} <span className="text-lg text-slate-500">pts</span></div>
          </div>
          
          <div className="mt-6 flex justify-center">
             {waitTime > 0 ? (
                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-full text-slate-400 text-xs font-mono">
                   <Clock size={12} className="animate-spin-slow"/> Next Attack: <span className="text-white font-bold">{formatTime(waitTime)}</span>
                </div>
             ) : (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/50 px-4 py-2 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                   <Sword size={12} className="animate-pulse"/> Attack Ready
                </div>
             )}
          </div>
        </section>

        {/* Action Panel */}
        {config.isOpen && (
           <section className="bg-[#0B0C15] border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
             <div className="grid grid-cols-2 gap-4">
               <input type="number" placeholder="SCORE" value={inputScore} onChange={e=>setInputScore(e.target.value)} className="bg-black/50 border border-slate-700 p-3 rounded-xl text-center text-xl text-white outline-none font-mono" />
               <input type="text" placeholder="KEY" value={studentPass} onChange={e=>setStudentPass(e.target.value)} className="bg-black/50 border border-slate-700 p-3 rounded-xl text-center text-xl text-white outline-none font-mono uppercase" />
             </div>
             {/* ボタンエリア: 通常とギャンブルを並列表示 */}
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => processCharge(false)} className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors">
                 通常チャージ
               </button>
               <button onClick={() => processCharge(true)} className="py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-xs font-bold text-white shadow-lg tracking-widest hover:opacity-90 transition-opacity">
                 幻想 (GAMBLE)
               </button>
             </div>
           </section>
        )}

        {/* Battle Logs */}
        {battleLogs.length > 0 && (
          <section className="bg-black/40 border border-white/5 rounded-xl p-4 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={10}/> CONFLICT LOG</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
               {battleLogs.map((log, i) => (
                 <div key={i} className="text-[10px] flex items-center gap-2 border-b border-white/5 pb-1">
                    <span className={`font-bold ${log.result === 'WIN' ? 'text-red-400' : 'text-slate-500'}`}>{log.attacker}</span>
                    <span className="text-[8px] text-slate-600">vs</span>
                    <span className="font-bold text-slate-300">{log.defender}</span>
                    <span className="ml-auto text-[8px] font-mono opacity-50">
                      {log.result === 'WIN' ? 'STOLE' : log.result === 'DEFENDED' ? 'BLOCKED' : 'FAILED'}
                    </span>
                 </div>
               ))}
            </div>
          </section>
        )}

        {/* Player List (Targets) */}
        <section className="space-y-4 pb-20">
          <h3 className="text-center text-[10px] tracking-[.4em] font-black text-slate-500 uppercase">TARGETS</h3>
          {players.map((p, i) => (
            <div key={p.id} className={`relative flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/5 ${p.id === myId ? '!border-cyan-500/50 !bg-cyan-900/10' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono text-sm font-bold text-slate-500">{i+1}</span>
                <div>
                   <div className="flex items-center gap-2">
                     <span className={`font-bold text-sm ${p.id===myId?'text-cyan-300':'text-slate-300'}`}>{p.name}</span>
                     {/* Inventory */}
                     <div className="flex -space-x-1 pl-2">
                        {ARTIFACTS.filter(a => p.inventory?.[a.id]).map(item => (
                          <div key={item.id} className="relative group">
                            <div className={`w-5 h-5 rounded-full bg-black border ${item.border} flex items-center justify-center relative z-10`}>
                               {React.cloneElement(item.icon, { size: 10, className: item.color })}
                            </div>
                            {/* Attack Button Overlay */}
                            {p.id !== myId && ['art_s_prism', 'art_ss_core', 'art_sss_eye'].includes(item.id) && (
                               <button onClick={() => initBattle(p, item)} className="absolute -top-3 -right-2 z-20 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 font-bold transition-opacity shadow-lg scale-90 hover:scale-110">
                                 奪う
                               </button>
                            )}
                          </div>
                        ))}
                     </div>
                   </div>
                   <span className={`text-[9px] font-black opacity-60 ${getStage(p.points).color}`}>{getStage(p.points).name}</span>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-slate-500">{p.points}</span>
            </div>
          ))}
        </section>
      </main>

      {/* Shop Modal */}
      <AnimatePresence>
        {showShop && (
           <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-40 bg-[#0B0C15] overflow-y-auto">
             <div className="p-6 pb-20 max-w-lg mx-auto">
               <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#0B0C15] z-10 py-4 border-b border-white/5">
                 <h2 className="text-xl font-black text-amber-400 tracking-widest uppercase italic flex gap-2"><ShoppingBag/> Kameya Market</h2>
                 <button onClick={() => setShowShop(false)} className="bg-white/10 p-2 rounded-full"><X size={20}/></button>
               </div>
               <div className="grid gap-3">
                 {ARTIFACTS.map(item => {
                   const stock = shopStock[item.id] || 0;
                   const isSoldOut = item.maxStock < 999 && stock >= item.maxStock;
                   const isOwned = me.inventory?.[item.id];
                   const isShield = item.id === 'art_a_shield';
                   
                   return (
                     <div key={item.id} className={`p-4 rounded-xl border bg-slate-900/50 flex gap-4 ${item.border} ${isSoldOut ? 'opacity-50 grayscale' : ''}`}>
                        <div className={`w-12 h-12 rounded bg-black flex items-center justify-center border border-white/10 ${item.color}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                             <h3 className={`font-bold ${item.color}`}>{item.name}</h3>
                             {item.maxStock < 999 && <span className="text-[10px] bg-red-900/50 text-red-200 px-2 rounded border border-red-500/30">残: {Math.max(0, item.maxStock - stock)}</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 my-1">{item.desc}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-mono text-white text-lg font-bold">{item.cost.toLocaleString()} <span className="text-xs font-normal text-slate-500">pts</span></span>
                            {isOwned && !isShield ? (
                              <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle size={12}/> 所持済</span>
                            ) : isSoldOut ? (
                              <span className="text-xs font-bold text-red-500">SOLD OUT</span>
                            ) : (
                              <button onClick={() => buyArtifact(item)} className="px-4 py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-cyan-400 uppercase tracking-widest">
                                購入
                              </button>
                            )}
                          </div>
                        </div>
                     </div>
                   )
                 })}
               </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      {showAdminAuth && (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center">
           <div className="bg-slate-900 p-8 rounded-xl border border-cyan-500 w-64 space-y-4 text-center">
             <h3 className="font-bold text-cyan-500">ADMIN</h3>
             {!isAdmin ? (
               <input type="password" autoFocus className="w-full bg-black p-2 text-white text-center" onChange={e => { if(e.target.value===ADMIN_SECRET_KEY) setIsAdmin(true); }} />
             ) : (
               <>
                 <button onClick={() => setDoc(doc(db, "settings", "global"), { ...config, isOpen: !config.isOpen, sessionId: Date.now().toString() })} className="w-full py-2 bg-cyan-600 rounded font-bold">{config.isOpen ? "CLOSE" : "OPEN"}</button>
                 <input type="text" value={config.pass} onChange={e => setDoc(doc(db, "settings", "global"), { ...config, pass: e.target.value })} className="w-full bg-black text-white p-2 text-center" />
                 <button onClick={() => setDoc(doc(db, "settings", "shop"), {})} className="w-full py-2 bg-red-900 rounded font-bold text-[10px]">ショップ在庫リセット</button>
                 <button onClick={() => { setIsAdmin(false); setShowAdminAuth(false); }} className="text-slate-500 text-xs">EXIT</button>
               </>
             )}
           </div>
        </div>
      )}
    </div>
  );
}

function WaitAndShowResult({ setResult }) {
  useEffect(() => { const t = setTimeout(setResult, 2000); return () => clearTimeout(t); }, []);
  return null;
}
