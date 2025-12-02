
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
const modalBody = document.getElementById("sessionModalBody");

// Track current listener so we can unsubscribe when switching views
let currentUnsubscribe = null;

// Check if user is in a specific session
async function isUserInSession(sessionId, userId) {
  try {
    const participantRef = doc(db, "workoutSessions", sessionId, "participants", userId);
    const participantSnap = await getDoc(participantRef);
    return participantSnap.exists();
  } catch (error) {
    console.error("Error checking if user in session:", error);
    return false;
  }
}

// Find which session the user is currently in
async function getUserCurrentSession(userId) {
  try {
    console.log("Finding user's current session...");
    
    // Get all workout sessions
    const sessionsRef = collection(db, "workoutSessions");
    const sessionsSnap = await getDocs(sessionsRef);
    
    // Check each session's participants subcollection
    for (const sessionDoc of sessionsSnap.docs) {
      const participantRef = doc(db, "workoutSessions", sessionDoc.id, "participants", userId);
      const participantSnap = await getDoc(participantRef);
      
      if (participantSnap.exists()) {
        console.log("User is in session:", sessionDoc.id);
        return sessionDoc.id;
      }
    }
    
    console.log("User is not in any session");
    return null;
    
  } catch (error) {
    console.error("Error finding user session:", error);
    return null;
  }
}

// Get participant count for a session
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

function openSessionModal(docId, data) {
  console.log(docId); // confirms the id is passed in

  // set modal content
  modalBody.innerHTML = `
    <h4>${data.name}</h4>
    <p><strong>Movement:</strong> <span class="badge bg-primary">${data.movement}</span></p>
    <p><strong>Created by:</strong> ${data.creatorName || "Unknown"}</p>
  `;

  // attach click handler AFTER the DOM is updated
  const editBtn = document.getElementById("editSessionBtn");
  if (editBtn) {
    // assign (not addEventListener) so old handlers are replaced cleanly
    editBtn.onclick = (e) => {
      e.preventDefault();
      console.log(
        "Join clicked — navigating to EachActiveSession with id:",
        docId
      );
      // navigate to detail page with docID query param
      window.location.href = `EachActiveSession.html?docID=${encodeURIComponent(
        docId
      )}`;
    };
  } else {
    console.warn(
      "[sessions] editSessionBtn not found in DOM when opening modal"
    );
  }

  // show modal
  const modal = new bootstrap.Modal(document.getElementById("sessionModal"));
  modal.show();
}

// Console warning detecting if there isn't a #sessionsList
if (!listEl) {
  console.warn("[sessions] #sessionsList not found on this page");
} else {
  // Create cards on sessions.html
  async function sessionCard(docId, data, isCurrentSession = false) {
    const created = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "just now";

    // Get creator name
    const creatorName = data.creatorName || "Unknown User";

    // Get participant count
    const participantCount = await getParticipantCount(docId);

    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4";
    div.dataset.id = docId;
    div.style.cursor = "pointer";
    
    // Add special styling if this is the user's current session
    const cardClass = isCurrentSession ? "card h-100 shadow border-success border-3" : "card h-100 shadow-sm";
    const headerBadge = isCurrentSession ? '<span class="badge bg-success position-absolute top-0 end-0 m-2">You\'re Here!</span>' : '';
    
    div.innerHTML = `
      <div class="${cardClass}" style="position: relative;">
        ${headerBadge}
        <div class="card-body">
          <h5 class="card-title mb-1">${data.name}</h5>
          <p class="text-muted mb-2">
            <small><i class="material-icons align-middle" style="font-size: 1rem;">schedule</i> ${created}</small>
          </p>
          <p class="text-muted small mb-2">
            <i class="material-icons align-middle" style="font-size: 1rem;">person</i> Created by: ${creatorName}
          </p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-primary">${data.movement}</span>
            <span class="badge ${isCurrentSession ? 'bg-success' : 'bg-secondary'}">
              <i class="material-icons align-middle" style="font-size: 1rem;">group</i>
              ${participantCount} ${participantCount === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>
      </div>`;

    // Opens session modal when user clicks on it
    div.addEventListener("click", () => openSessionModal(docId, data));
    return div;
  }

  async function render(docs, currentUserId = null) {
    listEl.innerHTML = "";
    
    if (!docs.length) {
      listEl.innerHTML = `<div class="col-12 text-center text-muted">No sessions yet. Create one!</div>`;
      return;
    }
    
    // Show loading while fetching participant counts
    listEl.innerHTML = `<div class="col-12 text-center text-muted">Loading sessions...</div>`;
    
    // Find user's current session
    let userCurrentSessionId = null;
    if (currentUserId) {
      userCurrentSessionId = await getUserCurrentSession(currentUserId);
    }
    
    // Separate docs into: user's session and other sessions
    let userSessionDoc = null;
    let otherDocs = [];
    
    docs.forEach(doc => {
      if (userCurrentSessionId && doc.id === userCurrentSessionId) {
        userSessionDoc = doc;
      } else {
        otherDocs.push(doc);
      }
    });
    
    // Clear loading
    listEl.innerHTML = "";
    
    // Add user's current session FIRST (at the top) if they're in one
    if (userSessionDoc) {
      console.log("Pinning user's session to top:", userSessionDoc.id);
      const card = await sessionCard(userSessionDoc.id, userSessionDoc.data(), true);
      listEl.appendChild(card);
    }
    
    // Then add all other sessions
    const otherCardPromises = otherDocs.map(doc => sessionCard(doc.id, doc.data(), false));
    const otherCards = await Promise.all(otherCardPromises);
    otherCards.forEach(card => listEl.appendChild(card));
    
    // Hide loading indicator
    if (loadingEl) loadingEl.style.display = "none";
    
    // Update session count
    const sessionCountBadge = document.getElementById("sessionCount");
    if (sessionCountBadge) {
      sessionCountBadge.textContent = `${docs.length} ${docs.length === 1 ? 'Session' : 'Sessions'}`;
    }
  }

  // Function to show ALL public sessions
  function showAllSessions(currentUserId) {
    // Unsubscribe from previous listener
    if (currentUnsubscribe) currentUnsubscribe();

    const publicQuery = query(
      collection(db, "workoutSessions"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc")
    );

    currentUnsubscribe = onSnapshot(
      publicQuery,
      (snap) => render(snap.docs, currentUserId),
      (err) => {
        console.warn("[sessions] public sessions query failed:", err?.code);
        if (err?.code === "failed-precondition") {
          // Fallback without orderBy if index isn't ready
          const fallback = query(
            collection(db, "workoutSessions"),
            where("isPublic", "==", true)
          );
          currentUnsubscribe = onSnapshot(fallback, (snap) => {
            const docs = [...snap.docs].sort((a, b) => {
              const ta = a.data().createdAt?.toMillis?.() ?? 0;
              const tb = b.data().createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
            render(docs, currentUserId);
          });
        } else {
          listEl.innerHTML = `<div class="col-12 text-danger text-center">Failed to load public sessions.</div>`;
        }
      }
    );
  }

  // On auth state change, show ALL Sessions automatically
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      listEl.innerHTML = `<div class="col-12 text-center text-muted">Sign in to see sessions.</div>`;
      return;
    }

    // Show all public sessions, passing user ID to check their current session
    showAllSessions(user.uid);
  });
}