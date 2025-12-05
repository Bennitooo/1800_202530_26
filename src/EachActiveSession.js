// Firebase Authentication helper functions
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    addDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { Modal } from "bootstrap";
import { showNotification } from "./notification.js";

// Global Variables
let currentUser = null;
let sessionData = null;
const userProfileCache = new Map();

// Helper Methods
function el(id) {
    return document.getElementById(id);
}

function safeText(node, text) {
    if (node) node.textContent = text;
}

function getDocIdFromUrl() {
    return new URL(window.location.href).searchParams.get("docID");
}

// Safe HTML helper
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (s) => {
        const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
        return map[s];
    });
}

// Firestore Timestamp formatting
function formatTimestamp(ts) {
    if (!ts) return "Unknown";

    if (typeof ts.toDate === "function") {
        return ts.toDate().toLocaleString();
    }

    if (ts.seconds) {
        return new Date(ts.seconds * 1000).toLocaleString();
    }

    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toLocaleString();

    return "Unknown";
}

// Fetch user profile with caching
async function fetchUserProfile(uid) {
    if (!uid) return {};
    if (userProfileCache.has(uid)) return userProfileCache.get(uid);

    try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? snap.data() : {};
        userProfileCache.set(uid, data);
        return data;
    } catch (err) {
        console.warn("fetchUserProfile error:", uid, err);
        userProfileCache.set(uid, {});
        return {};
    }
}

async function fetchProfilesForIds(uids = []) {
    const missing = uids.filter((id) => id && !userProfileCache.has(id));
    await Promise.all(
        missing.map(async (id) => {
            try {
                await fetchUserProfile(id);
            } catch (e) {
                console.warn("fetchProfilesForIds failed for", id, e);
            }
        })
    );
    return uids.map((id) => userProfileCache.get(id) || {});
}


// Participant Listener
function setupParticipantListener(sessionId) {
    const ref = collection(db, "workoutSessions", sessionId, "participants");
    return onSnapshot(
        ref,
        async () => {
            console.log("Participants changed — refreshing list");
            await displayParticipants(sessionId);
        },
        (err) => console.error("participants listener error", err)
    );
}

async function displayParticipants(sessionId) {
    try {
        const participantsRef = collection(db, "workoutSessions", sessionId, "participants");
        const participantsSnap = await getDocs(participantsRef);

        const container = el("participantsList");
        const activeUserCount = el("activeUserCount");

        if (!container) return;

        if (participantsSnap.empty) {
            container.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-person-x" style="font-size: 3rem;"></i>
          <p class="mt-3 mb-0">No participants yet. Be the first to join!</p>
        </div>`;
            if (activeUserCount) activeUserCount.textContent = "0";
            return;
        }

        const ids = participantsSnap.docs.map((d) => d.id);
        await fetchProfilesForIds(ids);

        // Get creator id
        const sessionRef = doc(db, "workoutSessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);
        const creatorId = sessionSnap.exists() ? sessionSnap.data().uid : null;

        let html = `<div class="list-group list-group-flush">`;

        for (const pDoc of participantsSnap.docs) {
            const uid = pDoc.id;
            const pData = pDoc.data();
            const userData = userProfileCache.get(uid) || {};

            const name = userData.username || pData.name || "Unknown";
            const email = userData.email || pData.email || "";
            const img = userData.profileImage ? `data:image/png;base64,${userData.profileImage}` : "/img/default.png";
            const joinedTime = formatTimestamp(pData.joinedAt);
            const isHost = uid === creatorId;

            html += `
        <div class="list-group-item participant-item" data-uid="${uid}" style="cursor:pointer;">
          <div class="d-flex align-items-center">
            <img src="${img}" class="rounded-circle border" width="48" height="48" style="object-fit:cover;">
            <div class="ms-3">
              <h6 class="mb-1">${escapeHtml(name)} ${isHost ? `<span class="badge bg-warning text-dark ms-2">Host</span>` : ""}</h6>
              <p class="mb-0 small text-muted">${escapeHtml(email)}</p>
              <p class="mb-0 small text-muted"><i class="bi bi-clock"></i> Joined: ${escapeHtml(joinedTime)}</p>
            </div>
          </div>
        </div>`;
        }

        html += `</div>`;
        container.innerHTML = html;

        container.onclick = (e) => {
            const item = e.target.closest(".participant-item");
            if (!item) return;
            const uid = item.getAttribute("data-uid");
            if (uid) window.location.href = `profile.html?uid=${uid}`;
        };

        if (activeUserCount) activeUserCount.textContent = String(participantsSnap.size);
    } catch (err) {
        console.error("Error loading participants:", err);
        const container = el("participantsList");
        if (container) {
            container.innerHTML = `
        <div class="alert alert-danger m-3">
          <i class="bi bi-exclamation-triangle"></i> Error loading participants.
        </div>`;
        }
    }
}

// Session Membership Check
async function checkUserInAnySession(userId) {
    try {
        const sessionsRef = collection(db, "workoutSessions");
        const activeQuery = query(sessionsRef, where("isActive", "==", true));
        const sessionsSnap = await getDocs(activeQuery);

        if (sessionsSnap.empty) return { isInSession: false };

        // Check in parallel
        const checks = await Promise.all(
            sessionsSnap.docs.map(async (sDoc) => {
                const sid = sDoc.id;
                const pRef = doc(db, "workoutSessions", sid, "participants", userId);
                const pSnap = await getDoc(pRef);
                return { exists: pSnap.exists(), sid, name: sDoc.data().name };
            })
        );

        const found = checks.find((c) => c.exists);
        return found ? { isInSession: true, sessionId: found.sid, sessionName: found.name } : { isInSession: false };
    } catch (err) {
        console.error("checkUserInAnySession error:", err);
        return { isInSession: false };
    }
}

// User Join Check
async function checkIfUserJoined(sessionId, userId) {
    try {
        const ref = doc(db, "workoutSessions", sessionId, "participants", userId);
        const snap = await getDoc(ref);
        return snap.exists();
    } catch (err) {
        console.error("checkIfUserJoined error:", err);
        return false;
    }
}

// Join Session function
async function joinSession(sessionId, user) {
    try {
        const sessionRef = doc(db, "workoutSessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            const modalEl = document.getElementById("sessionEndedModal");
            if (modalEl) {
                const modal = new Modal(modalEl);
                modal.show();
                return;
            } else {
                alert("Session no longer exists.");
                return;
            }
        }

        const sData = sessionSnap.data();
        if (!sData.isActive) {
            const modalEl = document.getElementById("sessionEndedModal");
            if (modalEl) {
                const modal = new Modal(modalEl);
                modal.show();
                return;
            } else {
                alert("This session has ended.");
                return;
            }
        }

        // Check if user already in another session
        const sessionCheck = await checkUserInAnySession(user.uid);
        if (sessionCheck.isInSession && sessionCheck.sessionId !== sessionId) {
            alert(`You're already in another session: "${sessionCheck.sessionName}". Please leave that session first.`);
            return;
        }

        // Add participant
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", user.uid);
        await setDoc(participantRef, {
            name: user.displayName || user.email || "Anonymous",
            email: user.email,
            joinedAt: serverTimestamp(),
            uid: user.uid
        }, { merge: true });

        // Mark user as “in this session”
        await updateDoc(doc(db, "users", user.uid), { currentSessionId: sessionId });

        updateJoinButtonState(true, false);
        await displayParticipants(sessionId);
    } catch (err) {
        console.error("joinSession error:", err);
        alert("Failed to join session: " + (err.message || err));
    }
}

async function exitSession(sessionId, userId) {
    try {
        // Remove participant
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", userId);
        await deleteDoc(participantRef);

        await updateDoc(doc(db, "users", userId), { currentSessionId: null });

        window.location.href = "session.html";
    } catch (err) {
        console.error("exitSession error:", err);
        alert("Failed to leave session: " + (err.message || err));
    }
}

// End Session Function, Sorry Carly
async function endSession(sessionId) {
    try {
        const sessionRef = doc(db, "workoutSessions", sessionId);

        // Fetch session and participants
        const [sessionSnap, participantsSnap] = await Promise.all([
            getDoc(sessionRef),
            getDocs(collection(db, "workoutSessions", sessionId, "participants"))
        ]);
        if (!sessionSnap.exists()) return;

        const sData = sessionSnap.data();
        const creatorId = sData.uid;
        const sessionName = sData.name || "Workout Session";
        const participantIds = participantsSnap.docs.map(d => d.id);

        // Mark session ended
        await updateDoc(sessionRef, {
            isActive: false,
            endedAt: serverTimestamp()
        });

        // Fetch followers efficiently
        const userDocs = await Promise.all(
            participantIds.map(pid => getDoc(doc(db, "users", pid)))
        );

        const followerLists = userDocs.map(s => (s.exists() ? s.data().followers ?? [] : []));
        let allFollowers = followerLists.flat();

        // Solo session
        if (participantIds.length === 1) {
            const creatorSnap = await getDoc(doc(db, "users", creatorId));
            if (creatorSnap.exists()) {
                allFollowers.push(...(creatorSnap.data().followers ?? []));
            }
        }

        // Everyone who gets notified (participants + their followers)
        const notifyIds = [...new Set([...participantIds, ...allFollowers])];

        // Fetch creator’s profile
        const creatorProfile = await fetchUserProfile(creatorId);
        const creatorName =
            creatorProfile.username ||
            creatorProfile.displayName ||
            (creatorProfile.email ? creatorProfile.email.split("@")[0] : "User");
        const creatorImage = creatorProfile.profileImage || null;

        // Write feed events in parallel (settled = safe)
        const feedEvent = {
            type: "sessionEnded",
            sessionId,
            sessionName,
            creatorId,
            creatorName,
            creatorImage,
            participants: participantIds,
            endedBy: creatorId,
            timestamp: serverTimestamp()
        };

        await Promise.allSettled(
            notifyIds.map(uid =>
                addDoc(collection(db, "feed", uid, "events"), feedEvent)
            )
        );

        // Clear currentSessionId for ALL participants
        await Promise.allSettled(
            participantIds.map(uid =>
                updateDoc(doc(db, "users", uid), { currentSessionId: null })
            )
        );

        // XP / Leveling logic 
        const rewardXP = participantIds.length === 1 ? 10 : 20;

        await Promise.allSettled(
            participantIds.map(async uid => {
                const xpRef = doc(db, "usersXPsystem", uid);
                const xpSnap = await getDoc(xpRef);

                if (!xpSnap.exists()) {
                    return setDoc(xpRef, { xp: rewardXP, level: 1 }, { merge: true });
                }

                let { xp = 0, level = 1 } = xpSnap.data();
                xp += rewardXP;

                while (xp >= 100) {
                    xp -= 100;
                    level += 1;
                }

                return updateDoc(xpRef, { xp, level });
            })
        );

    } catch (err) {
        console.error("endSession error:", err);
    }
}

// Ui State Management
function updateButtonStates({ isCreator = false, isActive = true, hasJoined = false }) {
    const joinBtn = el("joinSessionBtn");
    const exitBtn = el("exitSessionBtn");
    const endBtn = el("endSessionBtn");

    if (joinBtn) joinBtn.style.display = "none";
    if (exitBtn) exitBtn.style.display = "none";
    if (endBtn) endBtn.style.display = "none";

    if (!isActive) {
        const header = el("workoutName");
        if (header && sessionData) {
            header.innerHTML = `${escapeHtml(sessionData.name || "Session")} <span class="badge bg-danger ms-2">Ended</span>`;
        }
        return;
    }

    if (isCreator) {
        if (endBtn) {
            endBtn.style.display = "inline-block";
            endBtn.className = "btn btn-danger btn-lg";
            endBtn.disabled = false;
        }
        return;
    }

    if (hasJoined) {
        if (joinBtn) {
            joinBtn.style.display = "inline-block";
            joinBtn.className = "btn btn-success btn-lg";
            joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
            joinBtn.disabled = true;
        }
        if (exitBtn) exitBtn.style.display = "inline-block";
    } else {
        if (joinBtn) {
            joinBtn.style.display = "inline-block";
            joinBtn.className = "btn btn-primary btn-lg";
            joinBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Join Session';
            joinBtn.disabled = false;
        }
    }
}

// Join Button Toggle
function updateJoinButtonState(hasJoined, inOtherSession) {
    const joinBtn = el("joinSessionBtn");
    const exitBtn = el("exitSessionBtn");
    if (!joinBtn) return;

    if (hasJoined) {
        joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
        joinBtn.className = "btn btn-success btn-lg";
        joinBtn.disabled = true;
        if (exitBtn) exitBtn.style.display = "inline-block";
    } else if (inOtherSession) {
        joinBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Already in Another Session';
        joinBtn.className = "btn btn-secondary btn-lg";
        joinBtn.disabled = true;
        if (exitBtn) exitBtn.style.display = "none";
    } else {
        joinBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Join Session';
        joinBtn.className = "btn btn-primary btn-lg";
        joinBtn.disabled = false;
        if (exitBtn) exitBtn.style.display = "none";
    }
}

// Session Listener
function setupSessionListener(sessionId) {
    const sessionRef = doc(db, "workoutSessions", sessionId);

    return onSnapshot(
        sessionRef,
        async (docSnap) => {
            if (!docSnap.exists()) return;

            const prevActive = sessionData?.isActive;
            sessionData = docSnap.data();
            const isActive = sessionData.isActive !== false;

            // Detect transition from active to ended
            if (prevActive !== false && !isActive) {
                showNotification("This session has ended.");
                // Update header UI
                const header = el("workoutName");
                if (header) {
                    header.innerHTML = `${escapeHtml(sessionData.name || "Session")}
                        <span class="badge bg-danger ms-2">Ended</span>`;
                }

                // Disable action buttons
                const joinBtn = el("joinSessionBtn");
                const exitBtn = el("exitSessionBtn");
                const endBtn = el("endSessionBtn");

                if (joinBtn) joinBtn.style.display = "none";
                if (exitBtn) exitBtn.style.display = "none";
                if (endBtn) {
                    endBtn.disabled = true;
                    endBtn.classList.remove("btn-danger");
                    endBtn.classList.add("btn-secondary");
                    endBtn.textContent = "Session Ended";
                }

                return;
            }

            // Normal UI updates when session is active
            const isCreator = currentUser?.uid === sessionData.uid;
            const hasJoined = currentUser
                ? await checkIfUserJoined(sessionId, currentUser.uid)
                : false;

            updateButtonStates({ isCreator, isActive, hasJoined });
            await displayParticipants(sessionId);
        },
        (err) => console.error("session listener error", err)
    );
}

// Intial page bootstrap
async function displayInfo() {
    const id = getDocIdFromUrl();
    currentSessionId = id;

    if (!id) {
        console.error("No document ID in URL");
        safeText(el("workoutName"), "No workout selected.");
        safeText(el("movementName"), "Please select a workout session from the list.");
        if (el("participantsList")) el("participantsList").innerHTML = `<div class="alert alert-warning m-3"><i class="bi bi-exclamation-triangle"></i> No session ID provided in URL.</div>`;
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            safeText(el("workoutName"), "Please log in");
            safeText(el("movementName"), "You must be logged in to view this session.");
            if (el("participantsList")) el("participantsList").innerHTML = `<div class="alert alert-info m-3"><i class="bi bi-info-circle"></i> Please log in to view and join this session.</div>`;
            if (el("joinSessionBtn")) el("joinSessionBtn").style.display = "none";
            if (el("exitSessionBtn")) el("exitSessionBtn").style.display = "none";
            return;
        }

        currentUser = user;

        try {
            const workoutRef = doc(db, "workoutSessions", id);
            const workoutSnap = await getDoc(workoutRef);

            if (!workoutSnap.exists()) {
                safeText(el("workoutName"), "Workout not found");
                safeText(el("movementName"), "This session may have been deleted.");
                if (el("participantsList")) el("participantsList").innerHTML = `<div class="alert alert-danger m-3"><i class="bi bi-x-circle"></i> Session not found in database.</div>`;
                return;
            }

            const workout = workoutSnap.data();
            sessionData = workout;

            safeText(el("workoutName"), workout.name || "Unnamed Session");
            safeText(el("movementName"), workout.movement || "No movement specified");

            // Participants and listeners
            await displayParticipants(id);
            setupParticipantListener(id);
            setupSessionListener(id);

            const isCreator = workout.uid === user.uid;
            const isActive = workout.isActive !== false;
            const sessionCheck = await checkUserInAnySession(user.uid);
            const hasJoinedThis = await checkIfUserJoined(id, user.uid);

            // Creator End Button
            if (isCreator && !el("endSessionBtn")) {
                const joinBtn = el("joinSessionBtn");
                if (joinBtn && joinBtn.parentElement) {
                    const newEndBtn = document.createElement("button");
                    newEndBtn.type = "button";
                    newEndBtn.className = "btn btn-danger btn-lg ms-2";
                    newEndBtn.id = "endSessionBtn";
                    newEndBtn.innerHTML = '<i class="bi bi-stop-circle"></i> End Session';
                    joinBtn.parentElement.appendChild(newEndBtn);
                }
            }

            // Wire buttons (use modals where appropriate)
            const joinBtn = el("joinSessionBtn");
            const exitBtn = el("exitSessionBtn");
            const endBtn = el("endSessionBtn");

            if (joinBtn) {
                joinBtn.onclick = () => joinSession(id, user);
            }

            if (exitBtn) {
                exitBtn.onclick = () => {
                    const modalEl = document.getElementById("leaveSessionModal");
                    if (modalEl) {
                        const modal = new Modal(modalEl);
                        modal.show();
                        const btn = document.getElementById("confirmLeaveSessionBtn");
                        if (btn) {
                            btn.onclick = () => {
                                modal.hide();
                                exitSession(id, user.uid);
                            };
                        }
                    } else {
                        if (confirm("Are you sure you want to leave this session?")) exitSession(id, user.uid);
                    }
                };
            }

            if (endBtn) {
                endBtn.onclick = () => {
                    const modalEl = document.getElementById("endSessionModal");
                    if (modalEl) {
                        const modal = new Modal(modalEl);
                        modal.show();

                        const btn = document.getElementById("confirmEndSessionBtn");
                        if (btn) {
                            btn.onclick = async () => {
                                btn.disabled = true;
                                await endSession(id);
                                modal.hide();
                                btn.disabled = false;
                            };
                        }
                    } else {
                        // Fallback for no modal
                        if (confirm("Are you sure you want to end this session? This cannot be undone.")) {
                            endSession(id);
                        }
                    }
                };
            }



            // Initial button states
            updateButtonStates({ isCreator, isActive, hasJoined: hasJoinedThis });

            // When user is in another session
            if (!hasJoinedThis && sessionCheck.isInSession && !isCreator) {
                updateJoinButtonState(false, true);

                // Show info message
                if (!document.querySelector(".already-in-session-info") && joinBtn && joinBtn.parentElement) {
                    const infoDiv = document.createElement("div");
                    infoDiv.className = "alert alert-info mt-3 already-in-session-info";
                    infoDiv.innerHTML = `<i class="bi bi-info-circle"></i> You're already in session: <strong>"${escapeHtml(sessionCheck.sessionName)}"</strong>. Please leave that session before joining this one.
            <a href="EachActiveSession.html?docID=${encodeURIComponent(sessionCheck.sessionId)}" class="btn btn-sm btn-primary ms-2">Go to My Session</a>`;
                    joinBtn.parentElement.parentElement.insertBefore(infoDiv, joinBtn.parentElement.nextSibling);
                }
            }
        } catch (err) {
            console.error("displayInfo error:", err);
            alert("Error loading session: " + (err.message || err));
        }
    });
}

// Start the app
displayInfo();
