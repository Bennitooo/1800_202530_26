//---------------------------------------------------------
// sessionsList.js — Fully Fixed Version
//---------------------------------------------------------

import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";

const listEl = document.getElementById("sessionsList");
const loadingEl = document.getElementById("sessionsLoading");

let currentUnsubscribe = null;

//---------------------------------------------------------
// 1️⃣ Get user's ACTIVE session (correct location)
//---------------------------------------------------------
async function getUserCurrentSession(userId) {
  try {
    console.log("Checking active session for:", userId);

    const sessionsRef = collection(db, "workoutSessions");
    const q = query(sessionsRef, where("isActive", "==", true));
    const activeSnap = await getDocs(q);

    for (const sessionDoc of activeSnap.docs) {
      const participantRef = doc(db, "workoutSessions", sessionDoc.id, "participants", userId);
      const participantSnap = await getDoc(participantRef);

      if (participantSnap.exists()) {
        console.log("User active session:", sessionDoc.id);
        return sessionDoc.id;
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding user's active session:", error);
    return null;
  }
}


//---------------------------------------------------------
// 2️⃣ Get participant count for each session card
//---------------------------------------------------------
async function getParticipantCount(sessionId) {
  try {
    const participantsRef = collection(db, "workoutSessions", sessionId, "participants");
    const participantsSnap = await getDocs(participantsRef);
    return participantsSnap.size;
  } catch (error) {
    console.error("Error getting participant count:", error);
    return 0;
  }
}

//---------------------------------------------------------
// 3️⃣ Build session card (supports active session highlight)
//---------------------------------------------------------
async function sessionCard(docId, data, isCurrent = false) {
  const created = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString()
    : "just now";

  const creatorName = data.creatorName || "Unknown User";
  const participantCount = await getParticipantCount(docId);

  const div = document.createElement("div");
  div.className = "col-12 col-md-6 col-lg-4";
  div.dataset.id = docId;
  div.style.cursor = "pointer";

  const cardClass = isCurrent
    ? "card h-100 shadow border-success border-3"
    : "card h-100 shadow-sm";

  const headerBadge = isCurrent
    ? `<span class="badge bg-success position-absolute top-0 end-0 m-2">You're Here!</span>`
    : "";

  div.innerHTML = `
    <div class="${cardClass}" style="position: relative;">
      ${headerBadge}
      <div class="card-body">
        <h5 class="card-title mb-1">${data.name}</h5>

        <p class="text-muted mb-2">
          <small>
            <i class="material-icons align-middle" style="font-size: 1rem;">schedule</i>
            ${created}
          </small>
        </p>

        <p class="text-muted small mb-2">
          <i class="material-icons align-middle" style="font-size: 1rem;">person</i>
          Created by: ${creatorName}
        </p>

        <div class="d-flex justify-content-between align-items-center">
          <span class="badge bg-primary">${data.movement}</span>

          <span class="badge ${isCurrent ? "bg-success" : "bg-secondary"}">
            <i class="material-icons align-middle" style="font-size: 1rem;">group</i>
            ${participantCount} ${participantCount === 1 ? "user" : "users"}
          </span>
        </div>
      </div>
    </div>
  `;

  // Open session page
  div.addEventListener("click", () => {
    window.location.href = `EachActiveSession.html?docID=${encodeURIComponent(docId)}`;
  });

  return div;
}

//---------------------------------------------------------
// 4️⃣ Render list — pin active session at top
//---------------------------------------------------------
async function render(docs, userId) {
  listEl.innerHTML = "";

  // ⭐ Always update badge FIRST
  const badge = document.getElementById("sessionCount");
  if (badge) {
    const count = docs.length;
    badge.textContent =
      count === 0 ? "0 Sessions" :
      count === 1 ? "1 Session" :
      `${count} Sessions`;
  }

  // ⭐ Handle empty state (after badge is updated)
  if (!docs.length) {
    listEl.innerHTML = `<div class="col-12 text-center text-muted">No active sessions right now.</div>`;
    if (loadingEl) loadingEl.style.display = "none";
    return;
  }

  // Get user's active session
  const currentSessionId = await getUserCurrentSession(userId);

  let currentDoc = null;
  let others = [];

  docs.forEach((d) => {
    if (d.id === currentSessionId) currentDoc = d;
    else others.push(d);
  });

  listEl.innerHTML = "";

  // ⭐ Put user’s active session at top
  if (currentDoc) {
    const card = await sessionCard(currentDoc.id, currentDoc.data(), true);
    listEl.appendChild(card);
  }

  // All other sessions
  for (const d of others) {
    const card = await sessionCard(d.id, d.data(), false);
    listEl.appendChild(card);
  }

  // Hide loading spinner
  if (loadingEl) loadingEl.style.display = "none";
}



//---------------------------------------------------------
// 5️⃣ Listen for active public sessions
//---------------------------------------------------------
function showAllSessions(userId) {
  if (currentUnsubscribe) currentUnsubscribe();

  const qSessions = query(
    collection(db, "workoutSessions"),
    where("isPublic", "==", true),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );

  currentUnsubscribe = onSnapshot(
    qSessions,
    (snap) => render(snap.docs, userId),
    (err) => {
      if (err.code === "failed-precondition") {
        const fallback = query(
          collection(db, "workoutSessions"),
          where("isPublic", "==", true),
          where("isActive", "==", true)
        );

        currentUnsubscribe = onSnapshot(fallback, (snap) => {
          const docs = [...snap.docs].sort((a, b) => {
            const ta = a.data().createdAt?.toMillis?.() ?? 0;
            const tb = b.data().createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
          render(docs, userId);
        });
      } else {
        listEl.innerHTML =
          `<div class="col-12 text-danger text-center">Failed to load sessions.</div>`;
      }
    }
  );
}

//---------------------------------------------------------
// 6️⃣ Auth listener
//---------------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    listEl.innerHTML = `<div class="col-12 text-center text-muted">Sign in to see sessions.</div>`;
    return;
  }

  showAllSessions(user.uid);
});
