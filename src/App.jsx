import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Zap, User, TrendingUp, Lock, Key, Sparkles, Stars, Orbit, Medal, BookOpen, X, ScrollText } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

// --- 物語と伏線（Lore）の定義 ---
const LORE = [
  { id: 1, title: "I. The Spark", hint: "始まりの微熱", text: "なぜ私は燃えている？暗闇の中で、ただ一つ「知りたい」という衝動だけが、私を突き動かす。無知という闇に対する、最初の抵抗。" },
  { id: 2, title: "II. The Fear", hint: "忘却への恐怖", text: "風が吹くたび、記憶が削がれていく。学ばなければ、私はただの灰になって消えてしまう。留まるためには、燃え続けなければならない。" },
  { id: 3, title: "III. Traces", hint: "先人たちの足跡", text: "私だけではなかった。琥珀色の光の中に、かつて生きた者たちの「言葉」が保存されている。知識とは、死者からの手紙だ。" },
  { id: 4, title: "IV. Order", hint: "言葉という武器", text: "言葉を得て、私は強くなった。混沌とした世界に名前をつけることで、「定義」という名の秩序を与える。世界が鮮明になっていく。" },
  { id: 5, title: "V. Duty", hint: "炎の責任", text: "知識は力だ。だが、振るうための理性がなければ、それはただ周囲を焼き尽くす業火となる。賢さとは、優しさの別名でなければならない。" },
  { id: 6, title: "VI. Metamorphosis", hint: "形而上の変容", text: "肉体を超えた。概念としての私は、もはや物理法則に縛られない。思考の翼を手に入れた。想像力こそが、最も自由な移動手段だ。" },
  { id: 7, title: "VII. Logic", hint: "天空の法則", text: "世界の方程式が見える。空の青さも、星の巡りも、すべては美しい論理で記述されていた。学ぶことは、神の設計図を読むこと。" },
  { id: 8, title: "VIII. Solitude", hint: "孤独な頂", text: "あまりに高く来てしまった。周りには誰もいない。だが、この輝きが地上の誰かの道標になると信じている。先を歩く者の宿命として。" },
  { id: 9, title: "IX. Silence", hint: "静寂の真理", text: "熱の果てにある静寂。全てが凍りつく世界で、私は「無知」という名の虚無と対峙する。知ることの終わりは、新たな謎の始まり。" },
  { id: 10, title: "X. The Answer", hint: "存在証明", text: "なぜ学ぶのか。それは、この宇宙が冷めないようにするためだ。私たちが世界を認識し、理解した瞬間、そこに熱が生まれる。知識とは愛だ。汝、永遠の灯火となれ。" }
];

const getStage = (points) => {
  if (points >= 3200) return { idx: 9, name: "Akashic Inferno", color: "text-white", effect: "drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]" };
  if (points >= 2500) return { idx: 8, name: "Absolute Zero", color: "text-indigo-200", effect: "drop-shadow-[0_0_20px_rgba(199,210,254,0.6)]" };
  if (points >= 1900) return { idx: 7, name: "Celestial Flare", color: "text-blue-400", effect: "drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" };
  if (points >= 1400) return { idx: 6, name: "Azure Apostle", color: "text-cyan-400", effect: "drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]" };
  if (points >= 1000) return { idx: 5, name: "Violet Salamander", color: "text-violet-400", effect: "" };
  if (points >= 700) return { idx: 4, name: "Crimson Knight", color: "text-rose-500", effect: "" };
  if (points >= 450) return { idx: 3, name: "Scarlet Paladin", color: "text-orange-500", effect: "" };
  if (points >= 250) return { idx: 2, name: "Amber Scout", color: "text-amber-500", effect: "" };
  if (points >= 100) return { idx: 1, name: "Embers Warrior", color: "text-orange-300", effect: "" };
  return { idx: 0, name: "Drifting Spark", color: "text-slate-500", effect: "opacity-70" };
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
  const [config, setConfig] = useState({ isOpen: false, pass: '' });
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
    // 設定ファイルの監視（存在しなくてもエラーにならないよう修正）
    onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data());
      }
    });
    return () => unsubPlayers();
  }, []);

  const me = players.find(p => p.id === myId) || { points: 0, name: myName || 'Guest', perfectCount: 0 };
  const currentStage = getStage(me.points);

  const Badge = ({ count }) => {
    if (!count || count <= 0) return null;
    if (count >= 10) return <span className="flex items-center gap-1 text-cyan-200 bg-cyan-200/10 px-2 py-0.5 rounded-full text-[8px] font-black border border-cyan-200/40 shadow-[0_0_10px_rgba(165,243,252,0.5)] tracking-tighter uppercase"><Medal size={10} className="fill-current" /> Platinum</span>;
    return <span className="flex items-center gap-0.5 text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded text-[9px] font-black border border-yellow-500/20"><Medal size={10} /> {count}</span>;
  };

  const processCharge = async (isGamble) => {
    if (!config.isOpen) return;
    if (studentPass !== config.pass) return alert("Passcode Error.");
    const score = Number(inputScore);
    if (!score || score < 0 || score > 30) return alert("0-30 pts only.");

    let finalPoints = score;
    let message = score === 30 ? `👑 PERFECT! Master Badge Earned. (+${score} pts)` : `Successfully charged +${score} pts.`;

    if (isGamble) {
      setIsGambleAnimating(true);
      await new Promise(r => setTimeout(r, 2200));
      const rand = Math.random();
      if (rand < 0.03) { finalPoints = score * 3; message = `✨ Divine Grace! Triple Points! (+${finalPoints})`; }
      else if (rand < 0.08) { finalPoints = score * 2; message = `🌟 Ether Flow! Double Points! (+${finalPoints})`; }
      else if (rand < 0.18) { finalPoints = Math.round(score * 1.5); message = `💎 Refinement Success! 1.5x Points! (+${finalPoints})`; }
      else { finalPoints = 0; message = `💫 Vanished... The energy dissipated. (0 pts)`; }
      setIsGambleAnimating(false);
    }

    const updateData = { points: increment(finalPoints) };
    if (score === 30) updateData.perfectCount = increment(1);
    await updateDoc(doc(db, "players", myId), updateData);
    alert(message);
    setInputScore('');
    setStudentPass('');
  };

  if (isJoinMode) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full space-y-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="mx-auto w-20 h-20 border-2 border-dashed border-cyan-500/30 rounded-full flex items-center justify-center">
             <Flame size={40} className="text-cyan-500" />
          </motion.div>
          <div>
            <h1 className="text-4xl font-light tracking-[0.2em] uppercase mb-2">Inferno</h1>
            <p className="text-xs text-slate-500 font-serif italic">"The world is cold. Find the 10 truths."</p>
          </div>
          <input type="text" placeholder="Your Name" className="w-full p-4 bg-white/5 rounded-2xl text-center text-xl text-white outline-none border border-white/10 focus:border-cyan-500" value={myName} onChange={e => setMyName(e.target.value)} />
          <button onClick={async () => {
            const newId = Date.now().toString();
            localStorage.setItem('vocab_uid', newId);
            setMyId(newId);
            await setDoc(doc(db, "players", newId), { name: myName, points: 0, perfectCount: 0 });
            setIsJoinMode(false);
          }} className="w-full bg-cyan-600/20 border border-cyan-500/50 py-4 rounded-2xl font-bold tracking-widest hover:bg-cyan-500/30 transition">AWAKEN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 font-sans tracking-tight">
      <AnimatePresence>
        {isGambleAnimating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-2xl">
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
              <Orbit size={100} className="text-cyan-400 opacity-50 absolute" />
              <Stars size={100} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
            </motion.div>
            <h2 className="text-xl font-light mt-12 animate-pulse text-cyan-200 tracking-[0.3em] uppercase">Resonating...</h2>
          </motion.div>
        )}
        
        {showGrimoire && (
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-40 bg-[#020617] flex flex-col p-6 overflow-y-auto">
             <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#020617] py-4 border-b border-white/10 z-10">
               <h2 className="text-xl font-light tracking-widest text-cyan-500 uppercase flex items-center gap-2"><BookOpen size={20}/> Grimoire</h2>
               <button onClick={() => setShowGrimoire(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
             </div>
             <div className="space-y-6 pb-10">
               <p className="text-center text-xs text-slate-500 italic mb-4 font-serif">"Recover the 10 lost truths to understand the meaning of existence."</p>
               {LORE.map((lore, i) => {
                 const isUnlocked = i <= currentStage.idx;
                 return (
                   <div key={lore.id} className={`p-5 rounded-xl border transition-all ${isUnlocked ? 'bg-cyan-900/10 border-cyan-500/30' : 'bg-white/5 border-white/5 opacity-50'}`}>
                     <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] tracking-widest uppercase font-bold ${isUnlocked ? 'text-cyan-400' : 'text-slate-600'}`}>{lore.title}</span>
                       {!isUnlocked && <Lock size={12} className="text-slate-600"/>}
                     </div>
                     {isUnlocked ? (
                       <div className="space-y-2">
                         <h3 className="text-sm font-bold text-white/90">{lore.hint}</h3>
                         <p className="text-xs text-slate-300 font-serif leading-relaxed">{lore.text}</p>
                       </div>
                     ) : (
                       <div className="space-y-2 blur-[2px]">
                         <h3 className="text-sm font-bold text-slate-700">{lore.hint}</h3>
                         <p className="text-xs text-slate-800 font-serif leading-relaxed">この記憶はまだ封印されています。ポイントを集めて解放してください。</p>
                       </div>
                     )}
                   </div>
                 )
               })}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      <header className="p-6 bg-black/20 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2 font-light tracking-[0.2em] text-cyan-500 cursor-pointer text-sm" onClick={() => { setLogoClicks(c => c + 1); if(logoClicks >= 4) { setShowAdminAuth(true); setLogoClicks(0); } }}>
          <Flame size={16} /> INFERNO
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGrimoire(true)} className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-white hover:bg-white/10 transition">
             <BookOpen size={12} className="text-cyan-400"/>
             <span className="text-[10px] tracking-widest uppercase">{currentStage.idx + 1}/10</span>
          </button>
          <div className="bg-white/5 px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase border border-white/10 flex items-center gap-2">
              <User size={10} /> {me.name}
              <Badge count={me.perfectCount} />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-10">
        {showAdminAuth && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-slate-900 border border-cyan-500/30 p-10 rounded-[2rem] w-full max-w-xs text-center space-y-6">
              <Key className="mx-auto text-cyan-500 opacity-50" size={30} />
              <input type="password" autoFocus className="w-full bg-black border border-white/10 rounded-xl p-4 text-center text-white outline-none focus:border-cyan-500" value={adminAuthInput} onChange={e => setAdminAuthInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (adminAuthInput === ADMIN_SECRET_KEY ? (setIsAdmin(true), setShowAdminAuth(false), setAdminAuthInput('')) : alert('Error'))} />
              <button onClick={() => setShowAdminAuth(false)} className="text-[10px] tracking-widest uppercase text-slate-500">Cancel</button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-3xl p-6 space-y-4">
             {/* 修正点: updateDocではなくsetDoc(merge:true)を使用して、ファイルが無い場合は自動作成する */}
             <button onClick={() => setDoc(doc(db, "settings", "global"), { isOpen: !config.isOpen }, { merge: true })} className={`w-full py-3 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-all ${config.isOpen ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-500'}`}>
               {config.isOpen ? "Receiving Open" : "Receiving Closed"}
             </button>
             <input type="text" value={config.pass} onChange={e => setDoc(doc(db, "settings", "global"), { pass: e.target.value }, { merge: true })} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-white text-center font-mono" />
             <button onClick={() => setIsAdmin(false)} className="w-full text-[9px] uppercase tracking-widest text-slate-500">Close Panel</button>
          </div>
        )}

        <section className="text-center space-y-6">
          <div className={`relative inline-block p-12 rounded-full bg-gradient-to-b from-white/5 to-transparent border border-white/10 ${currentStage.effect}`}>
            <Flame size={70} className={`${currentStage.color} fill-current`} />
          </div>
          <div>
            <h2 className={`text-xl font-light tracking-widest uppercase ${currentStage.color}`}>{currentStage.name}</h2>
            <div className="text-5xl font-extralight text-white mt-2 tracking-tighter">{me.points}<span className="text-lg ml-1 text-slate-500 italic">pts</span></div>
            
            <motion.div 
              key={currentStage.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowGrimoire(true)}
              className="mt-6 mx-auto max-w-[90%] bg-white/5 border border-white/10 p-5 rounded-xl text-xs text-slate-300 font-serif leading-relaxed italic cursor-pointer hover:bg-white/10 transition group"
            >
              <div className="flex justify-center mb-2 opacity-50 group-hover:text-cyan-400 transition"><ScrollText size={14}/></div>
              <span className="font-bold text-cyan-500 block mb-1 text-[10px] uppercase tracking-widest">{LORE[currentStage.idx].title}: {LORE[currentStage.idx].hint}</span>
              "{LORE[currentStage.idx].text}"
              <div className="mt-3 text-[9px] text-center text-slate-500 uppercase tracking-widest">Tap to open Grimoire</div>
            </motion.div>
          </div>
        </section>

        <section className={`p-8 rounded-[2.5rem] border transition-all duration-700 ${config.isOpen ? 'bg-white/5 border-white/10 shadow-2xl' : 'opacity-20 grayscale pointer-events-none'}`}>
          {!config.isOpen ? <div className="text-center py-4 font-light text-slate-500 tracking-[.3em] uppercase"><Lock size={20} className="mx-auto mb-3 opacity-30" /> Sealed</div> : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] tracking-[.2em] font-bold text-slate-500 uppercase ml-1">Score</label>
                  <input type="number" value={inputScore} onChange={e => setInputScore(e.target.value)} className="w-full bg-transparent border-b border-white/20 p-2 text-3xl font-light text-center outline-none focus:border-cyan-500 text-white" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] tracking-[.2em] font-bold text-slate-500 uppercase ml-1">Key</label>
                  <input type="text" value={studentPass} onChange={e => setStudentPass(e.target.value)} className="w-full bg-transparent border-b border-white/20 p-2 text-3xl font-light text-center outline-none focus:border-cyan-500 transition-all uppercase text-white" placeholder="---" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => processCharge(false)} className="group py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all text-white relative overflow-hidden">
                  <span className="relative z-10 text-[10px] tracking-widest font-bold uppercase opacity-70 group-hover:opacity-100 text-white">Standard</span>
                </button>
                <button onClick={() => processCharge(true)} className="group py-4 rounded-2xl bg-white text-black hover:bg-cyan-50 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <span className="relative z-10 text-[10px] tracking-widest font-black uppercase">Ethereal</span>
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] tracking-[.4em] font-bold text-slate-600 uppercase flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-white/5" /> Rank <div className="h-[1px] flex-1 bg-white/5" />
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div layout key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${p.id === myId ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-mono text-xs ${i < 3 ? 'text-cyan-400' : 'text-slate-700'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight text-white">{p.name}</span>
                        <Badge count={p.perfectCount} />
                      </div>
                      <span className={`text-[8px] tracking-[.1em] font-black uppercase opacity-60 ${getStage(p.points).color}`}>{getStage(p.points).name}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-sm font-light text-white tracking-tighter">{p.points} <span className="text-[9px] opacity-40">pts</span></span>
                    {p.rankDiff > 0 && <span className="text-[8px] text-cyan-400 flex items-center gap-1 font-black"><TrendingUp size={8} /> {p.rankDiff}</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
