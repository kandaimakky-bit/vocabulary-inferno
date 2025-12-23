import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Zap, User, TrendingUp, Lock, Key, Sparkles, Stars, Orbit, Medal, BookOpen, X, ScrollText, CheckCircle, Crown } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

// --- 物語と伏線（Lore）の定義（タイトルも日本語化） ---
const LORE = [
  { id: 1, title: "I. 始まりの火花", hint: "微熱の自覚", text: "なぜ私は燃えている？暗闇の中で、ただ一つ「知りたい」という衝動だけが、私を突き動かす。無知という闇に対する、最初の抵抗。" },
  { id: 2, title: "II. 忘却への恐怖", hint: "消えゆく記憶", text: "風が吹くたび、記憶が削がれていく。学ばなければ、私はただの灰になって消えてしまう。留まるためには、燃え続けなければならない。" },
  { id: 3, title: "III. 先人の足跡", hint: "琥珀の記憶", text: "私だけではなかった。琥珀色の光の中に、かつて生きた者たちの「言葉」が保存されている。知識とは、死者からの手紙だ。" },
  { id: 4, title: "IV. 秩序の構築", hint: "言葉という剣", text: "言葉を得て、私は強くなった。混沌とした世界に名前をつけることで、「定義」という名の秩序を与える。世界が鮮明になっていく。" },
  { id: 5, title: "V. 炎の責務", hint: "力の代償", text: "知識は力だ。だが、振るうための理性がなければ、それはただ周囲を焼き尽くす業火となる。賢さとは、優しさの別名でなければならない。" },
  { id: 6, title: "VI. 形而上の変容", hint: "肉体の超越", text: "肉体を超えた。概念としての私は、もはや物理法則に縛られない。思考の翼を手に入れた。想像力こそが、最も自由な移動手段だ。" },
  { id: 7, title: "VII. 天空の論理", hint: "神の設計図", text: "世界の方程式が見える。空の青さも、星の巡りも、すべては美しい論理で記述されていた。学ぶことは、神の設計図を読むこと。" },
  { id: 8, title: "VIII. 孤高の頂", hint: "先駆者の孤独", text: "あまりに高く来てしまった。周りには誰もいない。だが、この輝きが地上の誰かの道標になると信じている。先を歩く者の宿命として。" },
  { id: 9, title: "IX. 静寂の真理", hint: "無知との対峙", text: "熱の果てにある静寂。全てが凍りつく世界で、私は「無知」という名の虚無と対峙する。知ることの終わりは、新たな謎の始まり。" },
  { id: 10, title: "X. 存在証明", hint: "アカシック・レコード", text: "なぜ学ぶのか。それは、この宇宙が冷めないようにするためだ。私たちが世界を認識し、理解した瞬間、そこに熱が生まれる。知識とは愛だ。汝、永遠の灯火となれ。" }
];

// --- Styles & Helpers（称号を日本語化） ---
const getStage = (points) => {
  if (points >= 3200) return { idx: 9, name: "根源の劫火", en: "AKASHIC INFERNO", color: "text-white", glow: "shadow-[0_0_40px_rgba(255,255,255,0.8)] border-white", bg: "bg-white/10" };
  if (points >= 2500) return { idx: 8, name: "絶対零度", en: "ABSOLUTE ZERO", color: "text-indigo-200", glow: "shadow-[0_0_30px_rgba(165,180,252,0.6)] border-indigo-200", bg: "bg-indigo-500/10" };
  if (points >= 1900) return { idx: 7, name: "天空の閃光", en: "CELESTIAL FLARE", color: "text-blue-400", glow: "shadow-[0_0_30px_rgba(96,165,250,0.5)] border-blue-400", bg: "bg-blue-500/10" };
  if (points >= 1400) return { idx: 6, name: "蒼き使徒", en: "AZURE APOSTLE", color: "text-cyan-400", glow: "shadow-[0_0_30px_rgba(34,211,238,0.4)] border-cyan-400", bg: "bg-cyan-500/10" };
  if (points >= 1000) return { idx: 5, name: "紫炎の精霊", en: "VIOLET SALAMANDER", color: "text-fuchsia-400", glow: "shadow-[0_0_20px_rgba(232,121,249,0.4)] border-fuchsia-400", bg: "bg-fuchsia-500/10" };
  if (points >= 700) return { idx: 4, name: "深紅の騎士", en: "CRIMSON KNIGHT", color: "text-rose-500", glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)] border-rose-500", bg: "bg-rose-500/10" };
  if (points >= 450) return { idx: 3, name: "緋色の聖騎士", en: "SCARLET PALADIN", color: "text-orange-500", glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)] border-orange-500", bg: "bg-orange-500/10" };
  if (points >= 250) return { idx: 2, name: "琥珀の斥候", en: "AMBER SCOUT", color: "text-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)] border-amber-500", bg: "bg-amber-500/10" };
  if (points >= 100) return { idx: 1, name: "熾火の戦士", en: "EMBERS WARRIOR", color: "text-orange-300", glow: "shadow-[0_0_10px_rgba(253,186,116,0.3)] border-orange-300", bg: "bg-orange-500/5" };
  return { idx: 0, name: "漂う種火", en: "DRIFTING SPARK", color: "text-slate-400", glow: "shadow-none border-slate-700", bg: "bg-slate-800/30" };
};

const ADMIN_SECRET_KEY = "teacher777"; 

export default function App() {
  const [myId, setMyId] = useState(localStorage.getItem('vocab_uid') || '');
  const [myName, setMyName] = useState(localStorage.getItem('vocab_name') || '');
  const [players, setPlayers] = useState([]);
  const [inputScore, setInputScore] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(!myId);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminAuthInput, setAdminAuthInput] = useState('');
  const [config, setConfig] = useState({ isOpen: false, pass: '', sessionId: '' });
  const [isGambleAnimating, setIsGambleAnimating] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showGrimoire, setShowGrimoire] = useState(false); 
  const prevRanksRef = useRef({});

  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a, b) => b.points - a.points);
      const newRanks = {};
      const updatedData = sortedData.map((player, index) => {
        const currentRank = index + 1;
        const previousRank = prevRanksRef.current[player.id];
        let diff = 0;
        if (previousRank) diff = previousRank - currentRank;
        newRanks[player.id] = currentRank;
        return { ...player, rankDiff: diff };
      });
      prevRanksRef.current = newRanks;
      setPlayers(updatedData);
    });
    onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    });
    return () => unsubPlayers();
  }, []);

  const me = players.find(p => p.id === myId) || { points: 0, name: myName || 'Guest', perfectCount: 0, lastChargedSessionId: '' };
  const currentStage = getStage(me.points);
  const isSubmitted = config.isOpen && me.lastChargedSessionId === config.sessionId;

  const Badge = ({ count }) => {
    if (!count || count <= 0) return null;
    if (count >= 10) return <span className="flex items-center gap-1 text-cyan-950 bg-gradient-to-r from-cyan-200 to-blue-200 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter uppercase shadow-[0_0_10px_rgba(34,211,238,0.8)]"><Medal size={10} className="fill-current" /> Platinum</span>;
    return <span className="flex items-center gap-0.5 text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-500/30"><Medal size={10} /> {count}</span>;
  };

  const toggleOpen = async () => {
    const newState = !config.isOpen;
    const updates = { isOpen: newState };
    if (newState) updates.sessionId = Date.now().toString();
    await setDoc(doc(db, "settings", "global"), updates, { merge: true });
  };

  const processCharge = async (isGamble) => {
    if (!config.isOpen) return;
    if (isSubmitted) return alert("この回の提出は完了しています。");
    if (studentPass !== config.pass) return alert("パスコードが間違っています。");
    const score = Number(inputScore);
    if (!score || score < 0 || score > 30) return alert("0〜30点の間で入力してください。");

    let finalPoints = score;
    let message = score === 30 ? `👑 PERFECT! 満点バッジ獲得！ (+${score} pts)` : `ポイントチャージ完了: +${score} pts`;

    if (isGamble) {
      setIsGambleAnimating(true);
      await new Promise(r => setTimeout(r, 2200));
      const rand = Math.random();
      if (rand < 0.03) { finalPoints = score * 3; message = `✨ 神の恩恵！ 3倍ポイント獲得！ (+${finalPoints})`; }
      else if (rand < 0.08) { finalPoints = score * 2; message = `🌟 エーテルの奔流！ 2倍ポイント獲得！ (+${finalPoints})`; }
      else if (rand < 0.18) { finalPoints = Math.round(score * 1.5); message = `💎 精製成功！ 1.5倍ポイント獲得！ (+${finalPoints})`; }
      else { finalPoints = 0; message = `💫 消滅... エネルギーが霧散しました (0 pts)`; }
      setIsGambleAnimating(false);
    }

    const updateData = { points: increment(finalPoints), lastChargedSessionId: config.sessionId };
    if (score === 30) updateData.perfectCount = increment(1);
    
    await updateDoc(doc(db, "players", myId), updateData);
    alert(message);
    setInputScore('');
    setStudentPass('');
  };

  // --- Login Screen ---
  if (isJoinMode) {
    return (
      <div className="min-h-screen bg-[#050511] flex items-center justify-center p-6 text-white text-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 max-w-sm w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="mx-auto w-24 h-24 border border-dashed border-cyan-500/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
             <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Flame size={40} className="text-cyan-400 fill-cyan-400/20" />
             </div>
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter mb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">INFERNO</h1>
          <p className="text-xs text-slate-400 font-mono mb-8 uppercase tracking-[0.3em]">Knowledge Protocol</p>
          
          <input type="text" placeholder="名前を入力" className="w-full p-4 bg-black/40 rounded-xl text-center text-lg text-white outline-none border border-white/10 focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-mono mb-4 placeholder-slate-500" value={myName} onChange={e => setMyName(e.target.value)} />
          <button onClick={async () => {
            const newId = Date.now().toString();
            localStorage.setItem('vocab_uid', newId);
            setMyId(newId);
            await setDoc(doc(db, "players", newId), { name: myName, points: 0, perfectCount: 0 });
            setIsJoinMode(false);
          }} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-xl font-bold tracking-widest text-sm hover:scale-105 transition-transform shadow-lg shadow-cyan-900/50">接続開始 (CONNECT)</button>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="min-h-screen bg-[#030309] text-white pb-24 font-sans selection:bg-cyan-500/30 relative overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-gradient-to-b from-cyan-900/10 via-purple-900/5 to-transparent blur-[80px]" />
      </div>

      <AnimatePresence>
        {isGambleAnimating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
            <motion.div animate={{ scale: [1, 1.5, 1], rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }} className="relative">
               <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-50 rounded-full"></div>
               <Orbit size={120} className="text-white relative z-10" />
            </motion.div>
            <h2 className="text-3xl font-black mt-12 animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-[0.5em] uppercase italic">Synthesizing</h2>
          </motion.div>
        )}
        
        {showGrimoire && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-40 bg-[#020205]/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
             <div className="max-w-xl mx-auto w-full">
                <div className="flex justify-between items-center mb-10 sticky top-0 bg-transparent py-4 z-10">
                  <h2 className="text-xl font-black tracking-widest text-cyan-500 flex items-center gap-3"><BookOpen size={24}/> GRIMOIRE <span className="text-[10px] opacity-50">（物語の記録）</span></h2>
                  <button onClick={() => setShowGrimoire(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-white/20 transition"><X size={20}/></button>
                </div>
                <div className="space-y-6 pb-12">
                  {LORE.map((lore, i) => {
                    const isUnlocked = i <= currentStage.idx;
                    return (
                      <div key={lore.id} className={`relative p-6 rounded-2xl border overflow-hidden group ${isUnlocked ? 'bg-gradient-to-br from-slate-900 to-black border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.05)]' : 'bg-white/5 border-white/5'}`}>
                        {isUnlocked && <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 blur-[40px] rounded-full group-hover:bg-cyan-500/20 transition"></div>}
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] tracking-[0.2em] font-bold ${isUnlocked ? 'text-cyan-400' : 'text-slate-700'}`}>{lore.title}</span>
                            {!isUnlocked && <Lock size={14} className="text-slate-700"/>}
                          </div>
                          {isUnlocked ? (
                            <div className="space-y-3">
                              <h3 className="text-lg font-bold text-white tracking-tight">{lore.hint}</h3>
                              <p className="text-sm text-slate-400 font-serif leading-relaxed opacity-90">{lore.text}</p>
                            </div>
                          ) : (
                            <div className="space-y-2 blur-[3px] opacity-40">
                              <h3 className="text-lg font-bold text-slate-500">LOCKED MEMORY</h3>
                              <p className="text-sm text-slate-600">この記憶はまだ封印されています。</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 py-4 fixed top-0 w-full z-30 flex justify-between items-center backdrop-blur-sm bg-black/10 border-b border-white/5">
        <div className="flex items-center gap-2" onClick={() => { setLogoClicks(c => c + 1); if(logoClicks >= 4) { setShowAdminAuth(true); setLogoClicks(0); } }}>
           <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></div>
           <span className="font-bold tracking-widest text-xs text-white/80">INFERNO</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowGrimoire(true)} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full hover:bg-cyan-900/30 hover:border-cyan-500/50 transition-all group">
             <BookOpen size={12} className="text-slate-400 group-hover:text-cyan-400"/>
             <span className="text-[10px] font-bold text-slate-300 group-hover:text-cyan-300">{currentStage.idx + 1}<span className="text-slate-600 mx-0.5">/</span>10</span>
          </button>
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <User size={12} className="text-slate-400"/>
              <span className="text-xs font-bold text-white tracking-tight uppercase max-w-[80px] truncate">{me.name}</span>
              <Badge count={me.perfectCount} />
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 pb-6 max-w-md mx-auto space-y-12 relative z-10">
        
        {/* Admin Login Modal */}
        {showAdminAuth && (
          <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-xl">
            <div className="bg-[#0B0C15] border border-cyan-500/30 p-8 rounded-3xl w-full max-w-xs text-center space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
              <Key className="mx-auto text-cyan-500" size={32} />
              <input type="password" autoFocus className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-center text-white outline-none focus:border-cyan-500 font-mono" placeholder="ACCESS CODE" value={adminAuthInput} onChange={e => setAdminAuthInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (adminAuthInput === ADMIN_SECRET_KEY ? (setIsAdmin(true), setShowAdminAuth(false), setAdminAuthInput('')) : alert('Error'))} />
              <button onClick={() => setShowAdminAuth(false)} className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-white transition">キャンセル</button>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 space-y-4 backdrop-blur-md shadow-2xl">
             <h3 className="text-center text-xs text-cyan-500 uppercase tracking-[0.3em] font-bold">管理コンソール</h3>
             <button onClick={toggleOpen} className={`w-full py-4 rounded-xl font-black text-xs tracking-[0.2em] transition-all shadow-lg ${config.isOpen ? 'bg-cyan-500 text-black shadow-cyan-500/50' : 'bg-slate-800 text-slate-500'}`}>
               {config.isOpen ? "受付中 (OPEN)" : "受付停止 (CLOSED)"}
             </button>
             <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold ml-1">本日の合言葉 (KEY)</label>
                <input type="text" value={config.pass} onChange={e => setDoc(doc(db, "settings", "global"), { pass: e.target.value }, { merge: true })} className="w-full bg-black border border-slate-700 p-3 rounded-xl text-white text-center font-mono text-lg" />
             </div>
             <button onClick={() => setIsAdmin(false)} className="w-full text-[9px] uppercase tracking-widest text-slate-600 hover:text-white mt-2">閉じる</button>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center relative">
          <div className={`relative inline-flex items-center justify-center p-14 rounded-full border border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm transition-all duration-700 ${currentStage.glow}`}>
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-50 rounded-full"></div>
             <Flame size={80} className={`${currentStage.color} fill-current drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse`} />
          </div>
          <div className="mt-8 space-y-2">
             <h2 className={`text-lg font-black tracking-[0.2em] uppercase ${currentStage.color} drop-shadow-md`}>{currentStage.name}</h2>
             <p className="text-[9px] text-slate-500 tracking-[0.3em] font-bold uppercase">{currentStage.en}</p>
             <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter filter drop-shadow-lg pt-2">
               {me.points}
               <span className="text-lg ml-2 font-light text-slate-500 italic">pts</span>
             </div>
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => setShowGrimoire(true)}
            className="mt-8 mx-auto max-w-[90%] bg-gradient-to-r from-slate-900 to-black border border-white/10 p-5 rounded-2xl cursor-pointer hover:border-cyan-500/30 transition shadow-lg relative overflow-hidden group"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
             <div className="flex items-center justify-center gap-2 mb-2 opacity-60 group-hover:text-cyan-400 group-hover:opacity-100 transition"><ScrollText size={14} className="animate-bounce"/> <span className="text-[10px] font-bold uppercase tracking-widest">現在の記憶 (Fragment)</span></div>
             <p className="text-xs text-slate-300 font-serif leading-relaxed italic relative z-10">"{LORE[currentStage.idx].text}"</p>
          </motion.div>
        </section>

        {/* Input Control Panel */}
        <section className={`relative rounded-3xl transition-all duration-500 ${config.isOpen && !isSubmitted ? 'bg-[#0B0C15] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'opacity-40 grayscale pointer-events-none'}`}>
          {!config.isOpen ? (
             <div className="text-center py-10 font-bold text-slate-600 tracking-[.3em] uppercase flex flex-col items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><Lock size={20} /></div>
               封印中 (SEALED)
             </div>
          ) : isSubmitted ? (
             <div className="text-center py-10 flex flex-col items-center gap-4">
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                 <CheckCircle size={32} />
               </motion.div>
               <span className="font-bold text-cyan-400 tracking-[0.2em] uppercase text-sm">提出完了</span>
             </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] tracking-[.1em] font-bold text-slate-500 pl-1">スコア入力</label>
                  <div className="relative">
                    <input type="number" value={inputScore} onChange={e => setInputScore(e.target.value)} className="w-full bg-[#1A1B26] border border-slate-700 p-4 rounded-xl text-3xl font-mono text-center text-white outline-none focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all placeholder-slate-700" placeholder="00" />
                    <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-transparent via-cyan-500 to-transparent opacity-20"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] tracking-[.1em] font-bold text-slate-500 pl-1">解除キー</label>
                  <div className="relative">
                     <input type="text" value={studentPass} onChange={e => setStudentPass(e.target.value)} className="w-full bg-[#1A1B26] border border-slate-700 p-4 rounded-xl text-3xl font-mono text-center text-white outline-none focus:border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all uppercase placeholder-slate-700" placeholder="---" />
                     <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-transparent via-purple-500 to-transparent opacity-20"></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => processCharge(false)} className="group relative py-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-700 transition-all overflow-hidden">
                  <span className="relative z-10 text-[10px] tracking-widest font-bold text-slate-300 group-hover:text-white transition">通常チャージ</span>
                </button>
                <button onClick={() => processCharge(true)} className="group relative py-4 rounded-xl bg-white overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all">
                   <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                   <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                   <span className="relative z-10 text-[10px] tracking-widest font-black text-black group-hover:text-white flex items-center justify-center gap-1">
                      <Sparkles size={12} className="text-purple-600 group-hover:text-white" /> 幻想チャージ
                   </span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        <section className="space-y-6">
          <div className="flex items-center justify-center gap-4 opacity-50">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white"></div>
             <h3 className="text-[10px] tracking-[.4em] font-black text-white uppercase">序列ランキング</h3>
             <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white"></div>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence>
              {players.map((p, i) => {
                let rankStyle = "bg-white/5 border-white/5";
                let rankIcon = null;
                if (i === 0) { rankStyle = "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]"; rankIcon = <Crown size={14} className="text-yellow-400 mb-1"/>; }
                else if (i === 1) { rankStyle = "bg-gradient-to-r from-slate-300/20 to-transparent border-slate-300/30"; }
                else if (i === 2) { rankStyle = "bg-gradient-to-r from-orange-700/20 to-transparent border-orange-700/30"; }
                
                return (
                  <motion.div layout key={p.id} className={`relative flex items-center justify-between p-4 rounded-xl border backdrop-blur-md ${rankStyle} ${p.id === myId ? '!border-cyan-500/50 !bg-cyan-900/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 flex flex-col items-center justify-center font-mono font-bold text-sm ${i < 3 ? 'text-white' : 'text-slate-600'}`}>
                         {rankIcon}
                         {String(i + 1).padStart(2, '0')}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm tracking-tight ${p.id === myId ? 'text-cyan-300' : 'text-slate-200'}`}>{p.name}</span>
                          <Badge count={p.perfectCount} />
                        </div>
                        <span className={`text-[9px] tracking-[.1em] font-black opacity-80 ${getStage(p.points).color}`}>{getStage(p.points).name}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-lg font-bold text-white tracking-tighter">{p.points}</span>
                      {p.rankDiff > 0 && <span className="text-[8px] text-green-400 flex items-center gap-1 font-black bg-green-400/10 px-1 rounded"><TrendingUp size={8} /> {p.rankDiff}</span>}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
