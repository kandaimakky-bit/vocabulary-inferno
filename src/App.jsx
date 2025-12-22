import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Zap, ShieldAlert, User } from 'lucide-react';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

// --- 進化ステージ定義 ---
const getStage = (points) => {
  if (points >= 3000) return { name: "アカシック・インフェルノ", color: "text-white", scale: 1.5, effect: "drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" };
  if (points >= 2000) return { name: "青き神炎の魔人", color: "text-blue-400", scale: 1.3, effect: "drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]" };
  if (points >= 1000) return { name: "紅蓮の騎士", color: "text-red-500", scale: 1.2, effect: "drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" };
  if (points >= 300) return { name: "炎の歩兵", color: "text-orange-500", scale: 1.1, effect: "drop-shadow-lg" };
  return { name: "漂流する種火", color: "text-gray-500", scale: 1.0, effect: "opacity-80" };
};

export default function App() {
  const [myId, setMyId] = useState(localStorage.getItem('vocab_uid') || '');
  const [myName, setMyName] = useState(localStorage.getItem('vocab_name') || '');
  const [players, setPlayers] = useState([]);
  const [inputScore, setInputScore] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(!myId);

  // リアルタイム同期
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(data);
    });
    return () => unsubscribe();
  }, []);

  // 自分のデータ取得
  const me = players.find(p => p.id === myId) || { points: 0, name: 'Guest' };
  const stage = getStage(me.points);

  // 参加処理
  const handleJoin = async () => {
    if (!myName) return;
    const newId = Date.now().toString(); // 簡易ID生成
    localStorage.setItem('vocab_uid', newId);
    localStorage.setItem('vocab_name', myName);
    setMyId(newId);
    
    // Firebaseに保存
    await setDoc(doc(db, "players", newId), {
      name: myName,
      points: 0,
      joinedAt: new Date()
    });
    setIsJoinMode(false);
  };

  // ポイントチャージ
  const handleCharge = async () => {
    if (!inputScore || inputScore > 30) return alert("0〜30点で入力してください");
    
    const userRef = doc(db, "players", myId);
    await updateDoc(userRef, {
      points: increment(Number(inputScore))
    });
    
    setInputScore('');
    alert("エネルギー充填完了！ランキングを確認せよ。");
  };

  // 初回登録画面
  if (isJoinMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full space-y-6 text-center">
          <Flame size={60} className="mx-auto text-orange-600 animate-pulse" />
          <h1 className="text-3xl font-black tracking-tighter">VOCABULARY INFERNO</h1>
          <p className="text-gray-400">戦士名（ニックネーム）を登録せよ</p>
          <input 
            type="text" 
            placeholder="例: タカシ" 
            className="w-full p-4 bg-white/10 rounded-xl text-center text-xl outline-none border border-white/20 focus:border-orange-500"
            value={myName}
            onChange={e => setMyName(e.target.value)}
          />
          <button onClick={handleJoin} className="w-full bg-orange-600 py-4 rounded-xl font-bold text-xl hover:bg-orange-500 transition">
            参加する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-20">
      {/* ヘッダー */}
      <header className="p-4 bg-black/30 backdrop-blur border-b border-white/10 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 font-black italic">
          <Flame className="text-orange-600" /> INFERNO
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs">
          <User size={12} /> {me.name}
        </div>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-10">
        
        {/* キャラクターエリア */}
        <section className="text-center relative py-8">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent rounded-full blur-3xl" />
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`inline-block p-10 rounded-full bg-black/40 border-2 border-white/10 mb-4 ${stage.effect}`}
          >
            <Flame size={80} className={`${stage.color} fill-current`} />
          </motion.div>
          <h2 className={`text-2xl font-black ${stage.color}`}>{stage.name}</h2>
          <p className="text-4xl font-mono font-bold mt-2">{me.points} <span className="text-sm text-gray-500">pt</span></p>
        </section>

        {/* チャージエリア */}
        <section className="bg-white/5 p-5 rounded-2xl border border-white/10">
          <label className="text-xs font-bold text-gray-500 flex items-center gap-1 mb-2">
            <ShieldAlert size={12} /> テスト点数入力 (MAX 30)
          </label>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={inputScore}
              onChange={e => setInputScore(e.target.value)}
              className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 text-xl font-mono outline-none focus:border-orange-500"
            />
            <button onClick={handleCharge} className="bg-orange-600 px-6 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-500 transition active:scale-95">
              <Zap size={18} /> CHARGE
            </button>
          </div>
        </section>

        {/* ランキングボード */}
        <section>
          <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-400">
            <Trophy size={16} className="text-yellow-500" /> CLASS RANKING
          </h3>
          <div className="space-y-2">
            {[...players].sort((a,b) => b.points - a.points).map((p, i) => (
              <motion.div 
                layout
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${p.id === myId ? 'bg-orange-900/20 border-orange-500/50' : 'bg-white/5 border-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono w-6 text-center ${i < 3 ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>#{i+1}</span>
                  <span className="font-bold text-sm">{p.name}</span>
                </div>
                <span className="font-mono text-orange-200">{p.points}</span>
              </motion.div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}