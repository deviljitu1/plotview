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
  const plotsSnap = await getDocs(collection(db, "projects", "82ae5c60-4ace-413c-bdd4-5c8b33db6ac1", "plots"));
  console.log("Plots count: ", plotsSnap.size);
  plotsSnap.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  });
  process.exit(0);
}

list().catch(console.error);
