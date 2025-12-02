// =======================================================
// SOCIAL FEED — DISPLAY FOLLOW EVENTS + EMPTY STATE
// =======================================================
import { auth, db } from "./firebaseConfig.js";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const feedContainer = document.getElementById("feed-container");

// Format timestamp
function formatTime(ts) {
    const date = new Date(ts);
    return date.toLocaleString();
}

// Build a FOLLOW EVENT card that navigates to the follower's profile
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

// MAIN FEED LISTENER
onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const eventsRef = collection(db, "feed", user.uid, "events");
    const q = query(eventsRef, orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        feedContainer.innerHTML = ""; // clear feed

        // ----------------------------------------------------
        // SHOW EMPTY MESSAGE IF NO EVENTS
        // ----------------------------------------------------
        if (snapshot.empty) {
            feedContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <h5 class="fw-light">Nothing seems to be here</h5>
                </div>
            `;
            return;
        }

        // ----------------------------------------------------
        // RENDER EVENTS
        // ----------------------------------------------------
        snapshot.forEach((doc) => {
            const event = doc.data();

            if (event.type === "follow") {
                feedContainer.appendChild(createFollowCard(event));
            }
        });
    });
});
