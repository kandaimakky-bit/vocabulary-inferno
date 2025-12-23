import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, User, ShoppingBag, X, CheckCircle, Crown, Shield, Sword, Skull, History, Clock, Sparkles, Zap, Eye, Compass, Feather, Hexagon, Orbit, Lock, Check, Sun, Trophy } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, runTransaction, query, orderBy, limit, deleteField } from "firebase/firestore";
import { db } from "./firebase";

// --- Constants & Config ---
const ADMIN_SECRET_KEY = "teacher777";
const BASE_COOLDOWN_HOURS = 24;

// アイテム定義
const ARTIFACTS = [
  // Rank F
  { 
    id: 'art_f_dust', rank: 'F', name: '星屑の残滓', cost: 500, maxStock: 999, 
    icon: Sparkles,
    desc: '微かな魔力。チャージ時、たまにボーナスが発生する。', 
    effect: '【幸運】チャージ時10%の確率で+3pt',
    color: 'text-slate-400', border: 'border-slate-600', bg: 'bg-slate-800'
  },
  // Rank E
  { 
    id: 'art_e_pen', rank: 'E', name: '見習いの羽ペン', cost: 1500, maxStock: 50, 
    icon: Feather,
    desc: '思考を記す魔道具。儀式の成功体験を増幅させる。', 
    effect: '【増幅】儀式成功時、獲得量+10%',
    color: 'text-emerald-200', border: 'border-emerald-700', bg: 'bg-emerald-900'
  },
  // Rank D
  { 
    id: 'art_d_compass', rank: 'D', name: '壊れた羅針盤', cost: 2500, maxStock: 30, 
    icon: Compass,
    desc: '迷いもまた道。失敗してもタダでは転ばない。', 
    effect: '【保険】儀式失敗時、5pt獲得',
    color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-900'
  },
  // Rank C
  { 
    id: 'art_c_lantern', rank: 'C', name: '知恵のランタン', cost: 4000, maxStock: 20, 
    icon: Zap,
    desc: '時を照らす光。再攻撃までの時間を短縮する。', 
    effect: '【加速】攻撃クールダウン -4時間',
    color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-900'
  },
  // Rank B
  { 
    id: 'art_b_sword', rank: 'B', name: '断罪の剣', cost: 8000, maxStock: 999, 
    icon: Sword,
    desc: '他者からアイテムを奪う権利を得る。', 
    effect: '【攻撃権】1日1回、他者を攻撃可能',
    color: 'text-red-400', border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]', bg: 'bg-red-900'
  },
  // Rank A
  { 
    id: 'art_a_shield', rank: 'A', name: '概念のイージス', cost: 5000, maxStock: 10, 
    icon: Shield,
    desc: '攻撃された際、自動で無効化して消滅する。', 
    effect: '【絶対防御】攻撃を1回無効化 (消耗品)',
    color: 'text-purple-400', border: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]', bg: 'bg-purple-900'
  },
  // Rank S
  { 
    id: 'art_s_prism', rank: 'S', name: '虚空のプリズム', cost: 15000, maxStock: 3, 
    icon: Hexagon,
    desc: '世界を観測する瞳。敵の狙いを逸らす。', 
    effect: '【隠蔽】敵の略奪成功率 -20%',
    color: 'text-orange-400', border: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]', bg: 'bg-orange-900'
  },
  // Rank SS
  { 
    id: 'art_ss_core', rank: 'SS', name: '原初のコア', cost: 30000, maxStock: 2, 
    icon: Orbit,
    desc: '宇宙創造の種子。奇跡の確率を引き上げる。', 
    effect: '【覚醒】儀式3倍確率が2倍 (10%)',
    color: 'text-rose-400', border: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]', bg: 'bg-rose-900'
  },
  // Rank SSS (Golden Emperor)
  {
    id: 'art_sss_gold', rank: 'SSS', name: '黄金帝の威光', cost: 50000, maxStock: 1,
    icon: Sun,
    desc: '世界を黄金色に染め上げる絶対者の証。',
    effect: '【支配】全ショップ価格半額 + 黄金の輝き',
    color: 'text-yellow-400', border: 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]', bg: 'bg-yellow-900'
  },
];

// ステージ定義
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
  const [betAmount, setBetAmount] = useState('');
  
  // States
  const [isJoinMode, setIsJoinMode] = useState(!myId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [config, setConfig] = useState({ isOpen: false, pass: '', sessionId: '' });
  const [shopStock, setShopStock] = useState({});
  const [logoClicks, setLogoClicks] = useState(0);
  const [shopClicks, setShopClicks] = useState(0);
  const [showShop, setShowShop] = useState(false);
  
  // Flow States
  const [betPhase, setBetPhase] = useState('NONE'); // NONE, CHOICE, GOBLET, RESULT
  const [ritualResult, setRitualResult] = useState(null); // { type: 'WIN'|'LOSE', gain: number }
  
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

  const me = players.find(p => p.id === myId) || { points: 0, name: myName || 'Guest', inventory: {}, lastAttackAt: 0, lastChargedSessionId: '' };
  const currentStage = getStage(me.points);

  const hasSubmittedThisSession = config.isOpen && me.lastChargedSessionId === config.sessionId;
  const hasItem = (itemId) => me.inventory?.[itemId] === true;
  const isGoldenMode = hasItem('art_sss_gold');

  // --- Functions ---
  const getTimeUntilAttack = () => {
    if (!me.lastAttackAt) return 0;
    const cooldownReduction = hasItem('art_c_lantern') ? 4 : 0;
    const finalCooldownHours = Math.max(0, BASE_COOLDOWN_HOURS - cooldownReduction);
    const now = Date.now();
    const diff = now - me.lastAttackAt;
    const cooldownMillis = finalCooldownHours * 60 * 60 * 1000;
    return Math.max(0, cooldownMillis - diff);
  };

  const formatTime = (millis) => {
    const hours = Math.floor(millis / (1000 * 60 * 60));
    const minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // --- Phase 1: Submit Score ---
  const submitScore = async () => {
    if (!config.isOpen) return;
    if (hasSubmittedThisSession) return alert("このセッションは提出済みです。");
    if (studentPass !== config.pass) return alert("パスコード不一致");
    const score = Number(inputScore);
    if (isNaN(score) || score < 0 || score > 30) return alert("0-30で入力");

    let points = score;
    let extraMsg = "";

    // Stardust Bonus
    if (hasItem('art_f_dust') && Math.random() < 0.1) {
      points += 3; extraMsg = " (星屑+3)";
    }

    await updateDoc(doc(db, "players", myId), { 
      points: increment(points), 
      lastChargedSessionId: config.sessionId
    });
    
    alert(`チャージ完了: +${points}pts${extraMsg}`);
    setInputScore(''); setStudentPass('');
    
    // Move to Bet Phase
    setBetPhase('CHOICE');
  };

  // --- Phase 2 & 3: Ritual (Betting) ---
  const executeRitual = async () => {
    const wager = Number(betAmount);
    if (isNaN(wager) || wager <= 0) return alert("賭けるポイントを入力してください");
    if (wager > me.points) return alert("所持ポイントが足りません");

    setBetPhase('GOBLET'); // Show Animation
  };

  const tapGoblet = async () => {
    const wager = Number(betAmount);
    
    // Logic
    const r = Math.random();
    const tripleChance = hasItem('art_ss_core') ? 0.10 : 0.05;
    
    let multiplier = 0;
    let type = 'LOSE';
    let finalGain = 0;

    if (r < tripleChance) { multiplier = 3; type = 'WIN'; }
    else if (r < tripleChance + 0.10) { multiplier = 2; type = 'WIN'; }
    else if (r < tripleChance + 0.25) { multiplier = 1.5; type = 'WIN'; }
    else { multiplier = 0; type = 'LOSE'; }

    if (type === 'WIN') {
      let gain = Math.floor(wager * multiplier);
      // Pen Bonus
      if (hasItem('art_e_pen')) { gain = Math.floor(gain * 1.1); }
      finalGain = gain - wager; // Net increase
      await updateDoc(doc(db, "players", myId), { points: increment(finalGain) });
    } else {
      // Lose
      let loss = wager;
      // Compass Insurance
      if (hasItem('art_d_compass')) { 
        loss = wager - 5; // Get 5 back (net loss reduced)
        if(loss < 0) loss = 0; 
      }
      finalGain = -loss;
      await updateDoc(doc(db, "players", myId), { points: increment(-loss) });
    }

    setRitualResult({ type, gain: finalGain, multiplier });
    setBetPhase('RESULT');
  };

  const closeRitual = () => {
    setBetPhase('NONE');
    setBetAmount('');
    setRitualResult(null);
  };

  // --- Shop & Battle (Existing Logic) ---
  const buyArtifact = async (item) => {
    if (item.id === 'art_a_shield' && me.inventory?.[item.id]) return alert("防御シールドは1つしか持てません");
    if (item.id !== 'art_a_shield' && me.inventory?.[item.id]) return alert("既に所持しています");
    let finalCost = item.cost;
    if (isGoldenMode) finalCost = Math.floor(item.cost / 2);
    if (me.points < finalCost) return alert("ポイント不足");
    if (item.maxStock < 999 && (shopStock[item.id] || 0) >= item.maxStock) return alert("SOLD OUT");

    try {
      await runTransaction(db, async (transaction) => {
        const stockRef = doc(db, "settings", "shop");
        const playerRef = doc(db, "players", myId);
        const stockDoc = await transaction.get(stockRef);
        const playerDoc = await transaction.get(playerRef);
        if (item.maxStock < 999 && (stockDoc.data()?.[item.id] || 0) >= item.maxStock) throw "在庫切れ";
        if (playerDoc.data().points < finalCost) throw "ポイント不足";
        transaction.update(stockRef, { [item.id]: increment(1) });
        transaction.update(playerRef, { points: increment(-finalCost), [`inventory.${item.id}`]: true });
      });
      alert(`購入成功: ${item.name}`);
    } catch (e) { alert(`エラー: ${e}`); }
  };

  const initBattle = (targetPlayer, item) => {
    if (targetPlayer.id === myId) return;
    if (!me.inventory?.['art_b_sword']) return alert("攻撃には『断罪の剣 (Bランク)』が必要です。");
    const waitTime = getTimeUntilAttack();
    if (waitTime > 0) return alert(`攻撃クールダウン中です。\nあと ${formatTime(waitTime)} で再攻撃可能です。`);
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
        if (!enemyData.inventory?.[item.id]) throw "相手がアイテムを持っていない";
        transaction.update(myRef, { lastAttackAt: Date.now() });

        if (enemyData.inventory?.['art_a_shield']) {
           transaction.update(enemyRef, { [`inventory.art_a_shield`]: deleteField() });
           transaction.set(logRef, { attacker: myData.name, defender: enemyData.name, item: item.name, result: 'DEFENDED', createdAt: new Date().toISOString() });
           setBattleResult('DEFENDED');
           return;
        }

        let winChance = myData.points / (myData.points + enemyData.points);
        winChance = Math.max(0.1, Math.min(0.9, winChance));
        if (enemyData.inventory?.['art_s_prism']) winChance -= 0.2;
        if (myData.inventory?.['art_sss_eye']) winChance = 1.0;

        const isWin = Math.random() < winChance;
        if (isWin) {
          transaction.update(enemyRef, { [`inventory.${item.id}`]: deleteField() });
          transaction.update(myRef, { [`inventory.${item.id}`]: true });
          transaction.set(logRef, { attacker: myData.name, defender: enemyData.name, item: item.name, result: 'WIN', createdAt: new Date().toISOString() });
          setBattleResult('WIN');
        } else {
          transaction.set(logRef, { attacker: myData.name, defender: enemyData.name, item: item.name, result: 'LOSE', createdAt: new Date().toISOString() });
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
          <p className="text-xs text-slate-400 mb-8">WAR PROTOCOL v8</p>
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
  const ownedItems = ARTIFACTS.filter(a => me.inventory?.[a.id]);

  return (
    <div className={`min-h-screen bg-[#030309] text-white pb-24 font-sans relative overflow-x-hidden transition-all duration-1000 ${isGoldenMode ? 'shadow-[inset_0_0_100px_rgba(250,204,21,0.3)] border-[4px] border-yellow-500/30' : ''}`}>
      {isGoldenMode && <div className="fixed inset-0 bg-yellow-500/5 z-50 pointer-events-none mix-blend-overlay animate-pulse"></div>}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#030309] to-black -z-10" />

      <header className="px-6 py-4 fixed top-0 w-full z-30 flex justify-between items-center backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-2" onClick={() => { setLogoClicks(c => c + 1); if(logoClicks>=4) setShowAdminAuth(true); }}>
           <Flame size={16} className="text-cyan-500" /><span className="font-bold tracking-widest text-xs">INFERNO</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { const next = shopClicks + 1; if (next >= 3) { setShowShop(true); setShopClicks(0); } else { setShopClicks(next); } }} className="w-8 h-8 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 active:scale-95 transition-transform"><ShoppingBag size={14} /></button>
          <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-full flex items-center gap-2"><User size={12}/><span className="text-xs font-bold truncate max-w-[80px]">{me.name}</span></div>
        </div>
      </header>

      {/* RITUAL MODALS (Betting System) */}
      <AnimatePresence>
        {betPhase === 'CHOICE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
             <div className="w-full max-w-sm bg-[#0B0C15] border border-purple-500/50 rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-2 italic">THE RITUAL</h2>
                <p className="text-xs text-slate-400 mb-6">獲得した魔力を糧に、<br/>さらなる深淵（ポイント）を求めますか？</p>
                
                <div className="bg-black/50 p-4 rounded-xl mb-6">
                   <p className="text-[10px] text-slate-500 mb-1">現在の所持ポイント</p>
                   <p className="text-2xl font-mono font-bold text-white">{me.points} pts</p>
                </div>

                <div className="space-y-4">
                   <div className="relative">
                      <input type="number" placeholder="賭けるポイント" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-center text-white outline-none focus:border-purple-500 transition-colors font-mono" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">pts</span>
                   </div>
                   <button onClick={executeRitual} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg tracking-widest hover:scale-105 transition-transform">儀式開始 (IGNITE)</button>
                   <button onClick={closeRitual} className="text-xs text-slate-500 hover:text-white transition-colors">今回はやめておく</button>
                </div>
             </div>
          </motion.div>
        )}

        {betPhase === 'GOBLET' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center cursor-pointer" onClick={tapGoblet}>
             <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="relative mb-10">
                <div className="absolute inset-0 bg-purple-500 blur-[60px] opacity-40"></div>
                <Trophy size={120} className="text-amber-200 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)] relative z-10" />
                <Flame size={80} className="text-purple-500 absolute -top-10 left-1/2 -translate-x-1/2 animate-pulse drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
             </motion.div>
             <h2 className="text-2xl font-black text-purple-200 tracking-[0.5em] animate-pulse">TOUCH THE GOBLET</h2>
             <p className="text-xs text-purple-400/50 mt-4 font-mono">Fate awaits...</p>
          </motion.div>
        )}

        {betPhase === 'RESULT' && ritualResult && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-6">
             <div className="w-full max-w-sm bg-[#0B0C15] border border-white/10 rounded-3xl p-8 text-center">
                {ritualResult.type === 'WIN' ? (
                   <>
                     <Crown size={60} className="mx-auto text-yellow-400 mb-4" />
                     <h2 className="text-3xl font-black text-yellow-400 mb-2">SUCCESS</h2>
                     <p className="text-sm text-slate-300">儀式成功！<br/>運命は貴方を選びました。</p>
                     <div className="my-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                        <span className="text-3xl font-black text-yellow-200">+{ritualResult.gain} pts</span>
                        {ritualResult.multiplier > 0 && <span className="block text-xs text-yellow-500 mt-1">Multiplier: x{ritualResult.multiplier}</span>}
                     </div>
                   </>
                ) : (
                   <>
                     <Skull size={60} className="mx-auto text-slate-600 mb-4" />
                     <h2 className="text-3xl font-black text-slate-500 mb-2">FAILED</h2>
                     <p className="text-sm text-slate-400">儀式失敗...<br/>魔力は霧散しました。</p>
                     <div className="my-6 p-4 bg-slate-900 border border-slate-700 rounded-xl">
                        <span className="text-3xl font-black text-slate-400">{ritualResult.gain} pts</span>
                     </div>
                   </>
                )}
                <button onClick={closeRitual} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">閉じる</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Animation */}
      <AnimatePresence>
        {isBattleAnimating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            {!battleResult ? (
              <div className="text-center">
                 <Sword size={80} className="text-red-500 mx-auto animate-pulse mb-8" />
                 <h2 className="text-4xl font-black text-red-500 tracking-widest italic">EXECUTING</h2>
                 <p className="text-slate-400 font-mono mt-4">Calculated Probabilities...</p>
                 <WaitAndShowResult setResult={executeBattle} />
              </div>
            ) : (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center p-8 bg-slate-900 border border-white/10 rounded-3xl max-w-sm mx-4">
                {battleResult === 'WIN' ? (
                  <>
                    <Crown size={60} className="text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-yellow-400 mb-2">SUCCESS</h2>
                    <p className="text-sm text-slate-300">略奪成功。<br/>アイテムを獲得しました。</p>
                  </>
                ) : battleResult === 'LOSE' ? (
                  <>
                    <Skull size={60} className="text-slate-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-slate-500 mb-2">FAILED</h2>
                    <p className="text-sm text-slate-300">略奪失敗。<br/>相手の防衛網を突破できず。</p>
                  </>
                ) : (
                  <>
                    <Shield size={60} className="text-purple-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-purple-400 mb-2">BLOCKED</h2>
                    <p className="text-sm text-slate-300">相手の『イージス』により<br/>無効化されました。</p>
                  </>
                )}
                <button onClick={() => { setIsBattleAnimating(false); setBattleResult(null); setBattleTarget(null); }} className="mt-8 w-full py-3 bg-white/10 rounded-xl font-bold">CLOSE</button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Confirm */}
      {battleTarget && !isBattleAnimating && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
           <div className="bg-[#15161e] border border-red-500/50 rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-center text-red-500 font-black tracking-widest text-lg mb-6 flex items-center justify-center gap-2"><Sword size={18}/> WARNING</h3>
              <p className="text-center text-xs text-slate-400 mb-6">
                攻撃を実行しますか？<br/>
                <span className="text-white font-bold">クールダウン</span>が発生します。
              </p>
              
              <div className="bg-black/50 p-4 rounded mb-6 flex items-center gap-4 border border-white/5">
                 <div className={`w-12 h-12 rounded flex items-center justify-center border ${battleTarget.item.border} ${battleTarget.item.bg}`}>
                    <battleTarget.item.icon size={24} className={battleTarget.item.color} />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-300">ターゲット</div>
                    <div className="font-bold text-white">{battleTarget.item.name}</div>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setBattleTarget(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-xs">CANCEL</button>
                 <button onClick={executeBattle} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white shadow-lg shadow-red-900/50">ASSAULT</button>
              </div>
           </div>
        </div>
      )}

      <main className="pt-24 px-6 max-w-md mx-auto space-y-10">
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

        {config.isOpen && (
           <section className="bg-[#0B0C15] border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
             {hasSubmittedThisSession ? (
               <div className="py-6 text-center space-y-3">
                 <div className="w-12 h-12 bg-green-500/10 border border-green-500 rounded-full flex items-center justify-center mx-auto">
                   <Check size={24} className="text-green-500" />
                 </div>
                 <h3 className="font-bold text-white">SUBMISSION COMPLETE</h3>
                 <p className="text-xs text-slate-400">今回のスコアは提出済みです。<br/>次のセッションをお待ちください。</p>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="SCORE" value={inputScore} onChange={e=>setInputScore(e.target.value)} className="bg-black/50 border border-slate-700 p-3 rounded-xl text-center text-xl text-white outline-none font-mono" />
                   <input type="text" placeholder="KEY" value={studentPass} onChange={e=>setStudentPass(e.target.value)} className="bg-black/50 border border-slate-700 p-3 rounded-xl text-center text-xl text-white outline-none font-mono uppercase" />
                 </div>
                 <button onClick={submitScore} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-white transition-colors tracking-widest">
                   スコア提出 (SUBMIT)
                 </button>
               </div>
             )}
           </section>
        )}

        {ownedItems.length > 0 && (
          <section>
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={10}/> MY ARTIFACTS</h3>
             <div className="grid grid-cols-4 gap-3">
               {ownedItems.map(item => (
                 <div key={item.id} className={`aspect-square rounded-xl border ${item.border} ${item.bg} flex flex-col items-center justify-center gap-1 p-2`}>
                   <item.icon size={20} className={item.color} />
                   <div className={`text-[8px] font-black ${item.color} text-center leading-none`}>{item.name}</div>
                 </div>
               ))}
             </div>
          </section>
        )}

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

        <section className="space-y-4 pb-20">
          <h3 className="text-center text-[10px] tracking-[.4em] font-black text-slate-500 uppercase">TARGETS</h3>
          {players.map((p, i) => {
            const isGoldOwner = p.inventory?.['art_sss_gold'];
            let cardStyle = `bg-white/5 border-white/5`;
            if (p.id === myId) cardStyle = `!border-cyan-500/50 !bg-cyan-900/10`;
            if (isGoldOwner) cardStyle = `!border-yellow-500/50 bg-gradient-to-r from-yellow-900/30 to-black shadow-[0_0_15px_rgba(234,179,8,0.3)]`;

            return (
              <div key={p.id} className={`relative flex items-center justify-between p-3 rounded-xl border ${cardStyle}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-mono text-sm font-bold ${isGoldOwner ? 'text-yellow-400' : 'text-slate-500'}`}>{i+1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      {isGoldOwner && <Sun size={14} className="text-yellow-400 animate-spin-slow" />}
                      <span className={`font-bold text-sm ${p.id===myId?'text-cyan-300': isGoldOwner ? 'text-yellow-200' : 'text-slate-300'}`}>{p.name}</span>
                      <div className="flex flex-wrap gap-1 pl-2 max-w-[150px]">
                          {ARTIFACTS.filter(a => p.inventory?.[a.id]).map(item => (
                            <div key={item.id} className={`inline-flex items-center px-1.5 py-0.5 rounded-md border ${item.border} bg-slate-900/50 text-[8px] font-bold ${item.color}`}>
                              <item.icon size={8} className="mr-1"/>
                              {item.name}
                              {p.id !== myId && ['art_s_prism', 'art_ss_core', 'art_sss_gold'].includes(item.id) && (
                                <button onClick={() => initBattle(p, item)} className="ml-1 text-red-500 hover:text-red-400 transition-colors" title="奪う">
                                  <Sword size={8} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black opacity-60 ${getStage(p.points).color}`}>{getStage(p.points).name}</span>
                  </div>
                </div>
                <span className={`font-mono text-sm font-bold ${isGoldOwner ? 'text-yellow-400' : 'text-slate-500'}`}>{p.points}</span>
              </div>
            )
          })}
        </section>
      </main>

      <AnimatePresence>
        {showShop && (
           <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-40 bg-[#0B0C15] overflow-y-auto">
             <div className="p-6 pb-20 max-w-lg mx-auto">
               <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#0B0C15] z-10 py-4 border-b border-white/5">
                 <h2 className="text-xl font-black text-amber-400 tracking-widest uppercase italic flex gap-2"><ShoppingBag/> Kameya Market</h2>
                 <button onClick={() => setShowShop(false)} className="bg-white/10 p-2 rounded-full"><X size={20}/></button>
               </div>
               <div className="grid gap-4">
                 {ARTIFACTS.map(item => {
                   const stock = shopStock[item.id] || 0;
                   const isSoldOut = item.maxStock < 999 && stock >= item.maxStock;
                   const isOwned = me.inventory?.[item.id];
                   const isShield = item.id === 'art_a_shield';
                   const displayCost = isGoldenMode ? Math.floor(item.cost / 2) : item.cost;
                   
                   return (
                     <div key={item.id} className={`flex rounded-xl border bg-slate-900/50 overflow-hidden ${item.border} ${isSoldOut ? 'opacity-50 grayscale' : ''}`}>
                        <div className={`w-24 flex items-center justify-center shrink-0 ${item.bg} border-r border-white/5 relative`}>
                          <item.icon size={32} className={item.color} />
                          <div className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-black/60 border border-white/10 ${item.color}`}>Rank {item.rank}</div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-between">
                           <div>
                             <div className="flex justify-between items-start mb-1">
                               <h3 className={`font-black text-sm ${item.color}`}>{item.name}</h3>
                               {item.maxStock < 999 && <div className="text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap">残: {Math.max(0, item.maxStock - stock)}</div>}
                             </div>
                             <p className="text-[9px] text-yellow-200 font-bold mb-1">{item.effect}</p>
                             <p className="text-[9px] text-slate-400 leading-tight">{item.desc}</p>
                           </div>
                           <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                              <span className={`font-mono font-bold ${isGoldenMode ? 'text-red-400' : 'text-white'}`}>
                                {isGoldenMode && <span className="line-through text-slate-500 text-[9px] mr-1">{item.cost.toLocaleString()}</span>}
                                {displayCost.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">pts</span>
                              </span>
                              {isOwned && !isShield ? (
                                <span className="text-[9px] font-bold text-green-500 flex items-center gap-1"><CheckCircle size={10}/> 所持済</span>
                              ) : isSoldOut ? (
                                <span className="text-[9px] font-bold text-red-500">SOLD OUT</span>
                              ) : (
                                <button onClick={() => buyArtifact(item)} className="px-3 py-1 bg-white text-black text-[9px] font-bold rounded hover:bg-cyan-400 transition-all uppercase tracking-widest">
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
