
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const listEl = document.getElementById("sessionsList");
const loadingEl = document.getElementById("sessionsLoading");
const modalBody = document.getElementById("sessionModalBody");

// Track current listener so we can unsubscribe when switching views
let currentUnsubscribe = null;

function openSessionModal(docId, data) {
  console.log(docId); // confirms the id is passed in

  // set modal content
  modalBody.innerHTML = `
    <h4>${data.name}</h4>
    <p><strong>Movements:</strong> <span class="badge bg-primary">${data.movement}</span></p>
  `;

  // attach click handler AFTER the DOM is updated
  const editBtn = document.getElementById("editSessionBtn");
  if (editBtn) {
    // assign (not addEventListener) so old handlers are replaced cleanly
    editBtn.onclick = (e) => {
      e.preventDefault();
      console.log(
        "Edit/Join clicked — navigating to EachActiveSession with id:",
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
  function sessionCard(docId, data) {
    const created = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "just now";

    // Get creator name
    const creatorName = data.creatorName || "Unknown User";

    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4";
    div.dataset.id = docId;
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-1">${data.name}</h5>
          <p class="text-muted mb-2">${created}</p>
          <p class="text-muted small mb-2">
            <i class="bi bi-person"></i> Created by: ${creatorName}
          </p>
          <span class="badge bg-primary">${data.movement}</span>
        </div>
      </div>`;

    // Opens session modal when user clicks on it
    div.addEventListener("click", () => openSessionModal(docId, data));
    return div;
  }

  function render(docs) {
    listEl.innerHTML = "";
    if (!docs.length) {
      listEl.innerHTML = `<div class="col-12 text-center text-muted">No sessions yet. Create one!</div>`;
      return;
    }
    docs.forEach((doc) => listEl.appendChild(sessionCard(doc.id, doc.data())));
  }

  // Function to show only MY sessions
  function showMySessions(user) {
    // Unsubscribe from previous listener
    if (currentUnsubscribe) currentUnsubscribe();

    const mySessionsQuery = query(
      collection(db, "workoutSessions"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    currentUnsubscribe = onSnapshot(
      mySessionsQuery,
      (snap) => render(snap.docs),
      (err) => {
        console.warn("[sessions] my sessions query failed:", err?.code);
        if (err?.code === "failed-precondition") {
          const fallback = query(
            collection(db, "workoutSessions"),
            where("uid", "==", user.uid)
          );
          currentUnsubscribe = onSnapshot(fallback, (snap) => {
            const docs = [...snap.docs].sort((a, b) => {
              const ta = a.data().createdAt?.toMillis?.() ?? 0;
              const tb = b.data().createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
            render(docs);
          });
        } else {
          listEl.innerHTML = `<div class="col-12 text-danger text-center">Failed to load sessions.</div>`;
        }
      }
    );

    // Update button styles if they exist
    const myBtn = document.getElementById("mySessionsBtn");
    const allBtn = document.getElementById("allSessionsBtn");
    if (myBtn && allBtn) {
      myBtn.className = "btn btn-primary";
      allBtn.className = "btn btn-outline-primary";
    }
  }

  // Function to show ALL public sessions
  function showAllSessions() {
    // Unsubscribe from previous listener
    if (currentUnsubscribe) currentUnsubscribe();

    const publicQuery = query(
      collection(db, "workoutSessions"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc")
    );

    currentUnsubscribe = onSnapshot(
      publicQuery,
      (snap) => render(snap.docs),
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
            render(docs);
          });
        } else {
          listEl.innerHTML = `<div class="col-12 text-danger text-center">Failed to load public sessions.</div>`;
        }
      }
    );

    // Update button styles if they exist
    const myBtn = document.getElementById("mySessionsBtn");
    const allBtn = document.getElementById("allSessionsBtn");
    if (myBtn && allBtn) {
      myBtn.className = "btn btn-outline-primary";
      allBtn.className = "btn btn-primary";
    }
  }

  // Set up button event listeners if they exist
  const mySessionsBtn = document.getElementById("mySessionsBtn");
  const allSessionsBtn = document.getElementById("allSessionsBtn");

  if (mySessionsBtn && allSessionsBtn) {
    mySessionsBtn.addEventListener("click", () => {
      const user = auth.currentUser;
      if (user) showMySessions(user);
    });

    allSessionsBtn.addEventListener("click", () => {
      showAllSessions();
    });
  }

  // On auth state change, show My Sessions by default
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      listEl.innerHTML = `<div class="col-12 text-center text-muted">Sign in to see your sessions.</div>`;
      return;
    }

    // Start with "My Sessions" view
    showMySessions(user);
  });
}