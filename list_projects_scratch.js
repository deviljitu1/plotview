import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbYwOAlJmAXwNhnse2XKwCALhdhRaUlYY",
  authDomain: "plotview-f5eec.firebaseapp.com",
  projectId: "plotview-f5eec",
  storageBucket: "plotview-f5eec.firebasestorage.app",
  messagingSenderId: "173508011029",
  appId: "1:173508011029:web:ff70ab7bbd7875df12da1c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function list() {
  const querySnapshot = await getDocs(collection(db, "projects"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  });
  process.exit(0);
}

list().catch(console.error);
