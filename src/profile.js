import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc, collection, getDocs, addDoc, serverTimestamp} from "firebase/firestore";
import { onAuthReady } from "./authentication.js"

function showProfile() {
    const nameElement = document.getElementById("name-goes-here"); // the <h1> element to display "Hello, {name}"
    const levelElement = document.getElementById("level-goes-here");
    const bioElement = document.getElementById("bio-goes-here");

    onAuthReady(async (user) => {
        if (!user) {
            // If no user is signed in → redirect back to login page.
            location.href = "index.html";
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const levelDoc = await getDoc(doc(db, "users", user.uid));
        const bioDoc = await getDoc(doc(db, "users", user.uid));

        const name = userDoc.exists()
            ? userDoc.data().name
            : user.displayName || user.email;

        if (nameElement) {
            nameElement.textContent = `${name}`;
        }

        const level = levelDoc.exists()
            ? userDoc.data().level
            : "User level not fonud";

        if (levelElement){
            levelElement.textContent = `${level}`;
        }

        const bio = bioDoc.exists()
            ? userDoc.data().bio
            : "Lorem Ipsum";

        if (bioElement){
            bioElement.textContent = `${bio}`;
        }
    });
}
showProfile();

