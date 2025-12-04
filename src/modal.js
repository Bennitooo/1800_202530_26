import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal } from 'bootstrap';
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDoc, setDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { showNotification } from "./notification.js";

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
        if (listEl) {
            listEl.innerHTML = `<p class="text-muted">Sign in to see your sessions.</p>`;
        }
        return;
    }

    // Realtime listener for the current user's sessions
    if (listEl) {
        const q = query(
            collection(db, "workoutSessions"),
            where("uid", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        onSnapshot(q, (snap) => renderSessions(listEl, snap));
    }
});

// ------------- create a session from the modal -------------
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sessionForm");

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("You must be signed in.");
                return;
            }
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().currentSessionId) {
                showNotification("You must end your current session before creating a new one.");
                return;
            }

            const name = document.getElementById("sessionNameInput").value.trim();
            const movement = document.getElementById("movementSelect").value;

            if (!name) {
                alert("Please name your session.");
                return;
            }

            try {
                // Create the session document
                const sessionRef = await addDoc(collection(db, "workoutSessions"), {
                    uid: user.uid,
                    name,
                    movement,
                    createdAt: serverTimestamp(),
                    creatorName: user.displayName || user.email || "Anonymous",
                    isPublic: true,
                    isActive: true,
                    endedAt: null,
                });

                console.log("Session created with ID:", sessionRef.id);

                // Automatically add the creator as a participant
                // Automatically add the creator as a participant
                await setDoc(doc(db, "workoutSessions", sessionRef.id, "participants", user.uid), {
                    name: user.displayName || user.email || "Anonymous",
                    email: user.email || "",
                    joinedAt: serverTimestamp(),
                    uid: user.uid
                });

                console.log("Creator added as participant");

                // 🔥 Mark user as 'in a session'
                await setDoc(userRef, { currentSessionId: sessionRef.id }, { merge: true });

                // Clear inputs
                form.reset();

                // Close the modal
                const modalEl = document.getElementById("staticBackdrop");
                if (modalEl) {
                    const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
                    modal.hide();
                }

                // Trigger notification
                showNotification("Session Created!");

                // Redirect to the newly created session page
                setTimeout(() => {
                    window.location.href = `EachActiveSession.html?docID=${encodeURIComponent(sessionRef.id)}`;
                }, 500);

            } catch (err) {
                console.error("Failed to create session:", err);
                alert("Could not create session. Please try again.");
            }
        });
    }
});
