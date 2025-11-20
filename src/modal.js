import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal } from 'bootstrap';
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from "firebase/firestore";

// ------------- helpers to render cards -------------
function sessionCardHTML(docId, data) {
    const created = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString()
    : "just now";

    return `
        <div class="col-12 col-md-6 col-lg-4" data-id="${docId}">
        <div class="card h-100 shadow-sm">
            <div class="card-body">
            <h5 class="card-title mb-1">${data.name}</h5>
            <p class="text-muted mb-2">${created}</p>
            <span class="badge bg-primary">${data.movement}</span>
            </div>
        </div>
        </div>
    `;
    }

function renderSessions(container, snapshot) {
    let html = "";
    snapshot.forEach(doc => (html += sessionCardHTML(doc.id, doc.data())));
    container.innerHTML = html || `<p class="text-muted">No sessions yet.</p>`;
}

// ------------- auth gate + listeners -------------
onAuthStateChanged(auth, (user) => {
    const listEl = document.getElementById("sessionsList");

    if (!user) {
        listEl.innerHTML = `<p class="text-muted">Sign in to see your sessions.</p>`;
        return;
    }

  // Realtime listener for the current user's sessions
    const q = query(
        collection(db, "workoutSessions"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => renderSessions(listEl, snap));
});

// ------------- create a session from the modal -------------
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("You must be signed in.");

    const name = document.getElementById("sessionNameInput").value.trim();
    const movement = document.getElementById("movementSelect").value;

    if (!name) return alert("Please name your session.");

    try {
        await addDoc(collection(db, "workoutSessions"), {
            uid: user.uid,
            name,
            movement,
            createdAt: serverTimestamp(),
            creatorName: user.displayName || user.email || "Anonymous",
            isPublic: true,
});

    // clear inputs
    e.target.reset();

    // close the modal

    const modalEl = document.getElementById("staticBackdrop");
    if (modalEl) {
    Modal.getOrCreateInstance(modalEl).hide(); // use Modal directly
    }
    } catch (err) {
    console.error("Failed to create session:", err);
    alert("Could not create session. Please try again.");
    }
});

import { showNotification } from "./notification.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sessionForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Close the modal
        const modalEl = document.getElementById("staticBackdrop");
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();

        // Trigger notification
        showNotification("Session Created!");

        // Optional: reset the form
        form.reset();
    });
});
