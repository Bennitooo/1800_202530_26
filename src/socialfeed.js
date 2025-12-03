// =======================================================
// SOCIAL FEED — DISPLAY EVENTS (FOLLOW + SESSION ENDED)
// =======================================================
import { auth, db } from "./firebaseConfig.js";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const feedContainer = document.getElementById("feed-container");

// -------------------------------------
// Fetch profile (for correct displayName)
// -------------------------------------
async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : {};
}

// Format timestamp
function formatTime(ts) {
    if (!ts) return "Just now";

    if (ts.toDate) {
        return ts.toDate().toLocaleString();
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) return "Just now";

    return date.toLocaleString();
}


// =======================================================
// FOLLOW EVENT CARD
// =======================================================
function createFollowCard(event) {
    const imgSrc = event.followerImage
        ? `data:image/png;base64,${event.followerImage}`
        : "/img/default.png";

    const card = document.createElement("div");
    card.className = "card p-3 shadow-sm border border-primary-subtle";
    card.style.cursor = "pointer";

    card.onclick = () => {
        window.location.href = `profile.html?uid=${event.followerId}`;
    };

    card.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <img src="${imgSrc}" class="rounded-circle"
                 style="width:50px;height:50px;object-fit:cover;">

            <div>
                <h6 class="mb-1">
                    <strong>${event.followerName}</strong> followed you
                </h6>
                <small class="text-muted">${formatTime(event.timestamp)}</small>
            </div>
        </div>
    `;

    return card;
}


// =======================================================
// SESSION ENDED EVENT CARD (with correct name)
// =======================================================
async function createSessionEndedCard(event) {
    const profile = await fetchUserProfile(event.creatorId);

    const displayName =
        profile.username ||
        profile.displayName ||
        profile.name ||
        (profile.email ? profile.email.split("@")[0] : "User");

    const imgSrc = profile.profileImage
        ? `data:image/png;base64,${profile.profileImage}`
        : "/img/default.png";

    const card = document.createElement("div");
    card.className = "card p-3 shadow-sm border border-primary-subtle";
    card.style.cursor = "pointer";

    card.onclick = () => {
        window.location.href = `EachActiveSession.html?docID=${event.sessionId}`;
    };

    card.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <img src="${imgSrc}" 
                 class="rounded-circle"
                 style="width:50px;height:50px;object-fit:cover;">

            <div>
                <h6 class="mb-1">
                    <strong>${displayName}</strong> finished a session
                </h6>
                <p class="mb-1 text-muted">${event.sessionName}</p>
                <small class="text-muted">${formatTime(event.timestamp)}</small>
            </div>
        </div>
    `;

    return card;
}


// =======================================================
// MAIN FEED LISTENER (Instant Loading — No Staggering)
// =======================================================
onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const eventsRef = collection(db, "feed", user.uid, "events");
    const q = query(eventsRef, orderBy("timestamp", "desc"));

    onSnapshot(q, async (snapshot) => {
        feedContainer.innerHTML = ""; 

        // Empty state
        if (snapshot.empty) {
            feedContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <h5 class="fw-light">Nothing seems to be here</h5>
                </div>
            `;
            return;
        }

        // Build all cards *in parallel*
        const cardPromises = snapshot.docs.map(async (docSnap) => {
            const event = docSnap.data();

            if (event.type === "follow") {
                return createFollowCard(event);
            }

            if (event.type === "sessionEnded") {
                return await createSessionEndedCard(event);
            }

            return null;
        });

        // Wait for ALL cards first
        const cards = await Promise.all(cardPromises);

        // Then insert all at once (fast, smooth)
        const fragment = document.createDocumentFragment();
        cards.forEach(card => card && fragment.appendChild(card));

        feedContainer.appendChild(fragment);
    });
});
