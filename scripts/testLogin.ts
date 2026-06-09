/**
 * Teste rápido de login Firebase Auth + perfil Firestore.
 * Uso: tsx scripts/testLogin.ts [email] [password]
 */
import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const email = process.argv[2] || "ronald.oliveira@neurobots.com.br";
const password = process.argv[3] || "admin123";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log(`Testando login: ${email}`);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log(`Auth OK — uid: ${cred.user.uid}`);

  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) {
    console.error("ERRO: perfil Firestore não encontrado em users/" + cred.user.uid);
    process.exit(1);
  }
  console.log(`Perfil Firestore:`, snap.data());
  console.log("Login completo com sucesso.");
}

main().catch((err) => {
  console.error("Falha:", err.code || err.message);
  process.exit(1);
});
