import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, getDoc, collection, getDocs, addDoc, serverTimestamp} from "firebase/firestore";

async function readQuote() {
    const quotesCollection = collection(db, "quotes");
    const querySnapshot = await getDocs(quotesCollection);
    const quotes = [];
    querySnapshot.forEach((doc) => {
        quotes.push(doc.data());
    });

    if (quotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const randomQuote = quotes[randomIndex];

        document.getElementById("quote-goes-here").textContent = randomQuote.quote;
    } else {
        document.getElementById("quote-goes-here").textContent = "No quotes found.";
    }
}

function showDashboard() {
    const nameElement = document.getElementById("name-goes-here"); // the <h1> element to display "Hello, {name}"

    onAuthReady(async (user) => {
        if (!user) {
            // If no user is signed in → redirect back to login page.
            location.href = "index.html";
            return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const name = userDoc.exists()
            ? userDoc.data().name
            : user.displayName || user.email;

        // Update the welcome message with their name/email.
        if (nameElement) {
            nameElement.textContent = `${name}!`;
        }
    });
}
function sayHello() { }
readQuote();
showDashboard();
// document.addEventListener('DOMContentLoaded', sayHello);
