import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

const listEl = document.getElementById("sessionsList");
const loadingEl = document.getElementById("sessionsLoading");

if (!listEl) {
  console.warn("[sessions] #sessionsList not found on this page");
} else {
  function sessionCard(docId, data) {
    const created = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : "just now";
    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4";
    div.dataset.id = docId;
    div.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-1">${data.name}</h5>
          <p class="text-muted mb-2">${created}</p>
          <span class="badge bg-primary">${data.movement}</span>
        </div>
      </div>`;
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

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      listEl.innerHTML = `<div class="col-12 text-center text-muted">Sign in to see your sessions.</div>`;
      return;
    }

    const orderedQuery = query(
      collection(db, "workoutSessions"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      orderedQuery,
      (snap) => render(snap.docs),
      (err) => {
        console.warn("[sessions] ordered query failed:", err?.code);
        // Fallback if index still building
        if (err?.code === "failed-precondition") {
          const fallback = query(
            collection(db, "workoutSessions"),
            where("uid", "==", user.uid)
          );
          onSnapshot(fallback, (snap) => {
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
        unsub();
      }
    );
  });
}


