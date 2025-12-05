// Firebase Authentication helper functions
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { db } from "./firebaseConfig.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthReady } from "/src/authentication.js";

// Display a quote from the firebase quotes collection
async function readQuote() {
    const quotesCollection = collection(db, "quotes");
    const querySnapshot = await getDocs(quotesCollection);
    const quotes = [];
    querySnapshot.forEach((doc) => quotes.push(doc.data()));

    const quoteEl = document.getElementById("quote-goes-here");

    if (!quoteEl) return;

    if (quotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteEl.textContent = quotes[randomIndex].quote;
    } else {
        quoteEl.textContent = "No quotes found.";
    }
}

// Loads Dashboard
function showDashboard() {
    const nameElement = document.getElementById("name-goes-here");

    if (!nameElement) return;

    onAuthReady(async (user) => {
        // Prevent login-loop, redirect only if NOT on index.html
        const onIndexPage = window.location.pathname.endsWith("index.html");

        if (!user && !onIndexPage) {
            window.location.href = "index.html";
            return;
        }

        if (!user) return; // No redirect loop

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const name = userDoc.exists()
            ? userDoc.data().name
            : user.displayName || user.email;

        nameElement.textContent = `${name}!`;
    });
}

readQuote();
showDashboard();
