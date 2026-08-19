import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";

const firebaseConfig = {
  apiKey: "AIzaSyAbYwOAlJmAXwNhnse2XKwCALhdhRaUlYY",
  authDomain: "plotview-f5eec.firebaseapp.com",
  projectId: "plotview-f5eec",
  storageBucket: "plotview-f5eec.firebasestorage.app",
  messagingSenderId: "173508011029",
  appId: "1:173508011029:web:ff70ab7bbd7875df12da1c"
};

const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance);
const auth = getAuth(appInstance);

async function seed() {
  await signInWithEmailAndPassword(auth, "nahushpatel880@gmail.com", "Admin@2026@");
  console.log("Creating project: Yuvraj Park...");
  const newProject = {
    name: "Yuvraj Park",
    clientName: "Yuvraj Buildcon Pvt. Ltd.",
    slug: "yuvraj-park",
    backgroundUrl: "/map-background.png",
    createdAt: new Date().toISOString()
  };
  
  const docRef = await addDoc(collection(db, "projects"), newProject);
  console.log(`Created Project ID: ${docRef.id}`);

  const plots = [
    { name: "1", area: 1404, type: "Plot", status: "Available" },
    { name: "2", area: 910, type: "Plot", status: "Available" },
    { name: "3", area: 774, type: "Plot", status: "Available" },
    { name: "4", area: 638, type: "Plot", status: "Available" },
    { name: "5", area: 1225, type: "Plot", status: "Available" }
  ];

  console.log("Adding first 5 plots...");
  for (const plot of plots) {
    const plotId = uuidv4();
    await setDoc(doc(db, `projects/${docRef.id}/plots`, plotId), {
      ...plot,
      size: "",
      facing: "East",
      points: "100,100 200,100 200,200 100,200"
    });
    console.log(`Added Plot ${plot.name} with ID ${plotId}`);
  }
  
  console.log("Done!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
