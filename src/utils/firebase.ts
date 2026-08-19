import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAydOMJSS-bGH9LJ82NbDkN8BzIEyTlF4Q",
  authDomain: "music-player-c4be1.firebaseapp.com",
  projectId: "music-player-c4be1",
  storageBucket: "music-player-c4be1.firebasestorage.app",
  messagingSenderId: "928688843298",
  appId: "1:928688843298:web:a3353e06aefaff06e4f87b",
  measurementId: "G-996XZHLG2K"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
