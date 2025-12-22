import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ↓↓↓ ここをステップ3でコピーした内容に書き換えてください ↓↓↓
const firebaseConfig = {
    apiKey: "AIzaSyAy46sEQs-_RLA2abGWwOnmv9HlxahHQpQ",
    authDomain: "vocab-inferno.firebaseapp.com",
    projectId: "vocab-inferno",
    storageBucket: "vocab-inferno.firebasestorage.app",
    messagingSenderId: "874525735396",
    appId: "1:874525735396:web:86b09d130561d2cad3aff1"
  };
// ↑↑↑ ここまで ↑↑↑

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);