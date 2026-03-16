import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Manually parse .env because it's a bit easier in this context
const env = readFileSync('.env', 'utf-8');
const config: any = {};
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    config[key.trim()] = value.trim();
  }
});

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkEvents() {
  try {
    const snap = await getDocs(collection(db, "events"));
    console.log(`Found ${snap.size} events`);
    snap.docs.forEach(doc => {
      console.log(`- ID: ${doc.id}, Title: ${doc.data().title}, Status: ${doc.data().status}`);
    });
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkEvents();
