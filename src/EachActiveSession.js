import { collection, doc, getDocs, setDoc, getDoc, deleteDoc, query, where, updateDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";

let currentUser = null;
let sessionData = null;
let currentSessionId = null;

// Get the document ID from the URL
function getDocIdFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const docID = params.get("docID");
    console.log("Current URL:", window.location.href);
    console.log("Document ID from URL:", docID);
    return docID;
}

// Check if user is already in ANY session
async function checkUserInAnySession(userId) {
    try {
        console.log("Checking if user is in any session...");
        
        // Get all workout sessions
        const sessionsRef = collection(db, "workoutSessions");
        const sessionsSnap = await getDocs(sessionsRef);
        
        // Check each session's participants subcollection
        for (const sessionDoc of sessionsSnap.docs) {
            const participantRef = doc(db, "workoutSessions", sessionDoc.id, "participants", userId);
            const participantSnap = await getDoc(participantRef);
            
            if (participantSnap.exists()) {
                console.log("User is already in session:", sessionDoc.id);
                return {
                    isInSession: true,
                    sessionId: sessionDoc.id,
                    sessionName: sessionDoc.data().name
                };
            }
        }
        
        console.log("User is not in any session");
        return { isInSession: false };
        
    } catch (error) {
        console.error("Error checking user sessions:", error);
        return { isInSession: false };
    }
}

// Join the session - adds REAL user data automatically
async function joinSession(sessionId, user) {
    try {
        console.log("Joining session:", sessionId, "as user:", user.email);
        
        // First, check if session is still active
        const sessionRef = doc(db, "workoutSessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
            alert("This session no longer exists.");
            return;
        }
        
        const sessionData = sessionSnap.data();
        if (sessionData.isActive === false) {
            alert("This session has ended. You cannot join an ended session.");
            window.location.reload();
            return;
        }
        
        // Check if user is already in another session
        const sessionCheck = await checkUserInAnySession(user.uid);
        
        if (sessionCheck.isInSession && sessionCheck.sessionId !== sessionId) {
            alert(`You're already in another session: "${sessionCheck.sessionName}". Please leave that session first.`);
            return;
        }
        
        // This creates the participants subcollection automatically
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", user.uid);
        
        await setDoc(participantRef, {
            name: user.displayName || user.email || "Anonymous",
            email: user.email,
            joinedAt: serverTimestamp(),
            uid: user.uid
        });
        
        console.log("Successfully joined session!");
        
        // Update UI
        updateJoinButtonState(true, false);
        
        // Refresh the participants list
        await displayParticipants(sessionId);
        
    } catch (error) {
        console.error("Error joining session:", error);
        alert("Failed to join session: " + error.message);
    }
}

// Display all REAL participants who clicked "Join Session"
async function displayParticipants(sessionId) {
    try {
        console.log("Loading participants for session:", sessionId);
        
        const participantsRef = collection(db, "workoutSessions", sessionId, "participants");
        const participantsSnap = await getDocs(participantsRef);
        
        const participantsList = document.getElementById("participantsList");
        const activeUserCount = document.getElementById("activeUserCount");
        
        if (participantsSnap.empty) {
            participantsList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-person-x" style="font-size: 3rem;"></i>
                    <p class="mt-3 mb-0">No participants yet. Be the first to join!</p>
                </div>`;
            activeUserCount.textContent = "0";
            return;
        }
        
        // Build the participants list from REAL users
        let html = '<div class="list-group list-group-flush">';
        
        participantsSnap.forEach((doc) => {
            const participant = doc.data();
            const joinedTime = participant.joinedAt?.toDate()?.toLocaleString() || "Just now";
            
            html += `
                <div class="list-group-item">
                    <div class="d-flex align-items-center">
                        <div class="flex-shrink-0">
                            <i class="bi bi-person-circle text-primary" style="font-size: 2.5rem;"></i>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h6 class="mb-1">${participant.name}</h6>
                            <p class="mb-0 small text-muted">${participant.email}</p>
                            <p class="mb-0 small text-muted">
                                <i class="bi bi-clock"></i> Joined: ${joinedTime}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        participantsList.innerHTML = html;
        
        // Update active user count
        activeUserCount.textContent = participantsSnap.size;
        
        console.log(`Displaying ${participantsSnap.size} participants`);
        
    } catch (error) {
        console.error("Error loading participants:", error);
        document.getElementById("participantsList").innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="bi bi-exclamation-triangle"></i> Error loading participants: ${error.message}
            </div>`;
    }
}

// Check if current user has already joined THIS session
async function checkIfUserJoined(sessionId, userId) {
    try {
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", userId);
        const participantSnap = await getDoc(participantRef);
        const hasJoined = participantSnap.exists();
        console.log("User has joined THIS session:", hasJoined);
        return hasJoined;
    } catch (error) {
        console.error("Error checking user participation:", error);
        return false;
    }
}

// Exit/leave the session
async function exitSession(sessionId, userId) {
    try {
        console.log("Exiting session:", sessionId);
        
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", userId);
        await deleteDoc(participantRef);
        
        console.log("Left session successfully");
        
        // Redirect back to sessions list
        window.location.href = "session.html";
        
    } catch (error) {
        console.error("Error leaving session:", error);
        alert("Failed to leave session: " + error.message);
    }
}

// Remove all participants from the session
async function removeAllParticipants(sessionId) {
    try {
        console.log("Removing all participants from session:", sessionId);
        
        const participantsRef = collection(db, "workoutSessions", sessionId, "participants");
        const participantsSnap = await getDocs(participantsRef);
        
        // Use batch to delete all participants at once
        const batch = writeBatch(db);
        
        participantsSnap.forEach((participantDoc) => {
            batch.delete(participantDoc.ref);
        });
        
        await batch.commit();
        
        console.log(`Removed ${participantsSnap.size} participants from session`);
        
    } catch (error) {
        console.error("Error removing participants:", error);
        throw error;
    }
}

// End the session (creator only)
async function endSession(sessionId) {
    if (!sessionId) {
        alert("Session ID not found");
        return;
    }

    try {
        const sessionRef = doc(db, "workoutSessions", sessionId);
        
        // First, remove all participants
        await removeAllParticipants(sessionId);
        console.log("All participants removed");
        
        // Then update session to inactive
        await updateDoc(sessionRef, {
            isActive: false,
            endedAt: serverTimestamp(),
        });

        console.log("Session ended successfully");
        
        alert("Session ended successfully! All participants have been removed.");

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = "session.html";
        }, 1500);

    } catch (error) {
        console.error("Error ending session:", error);
        alert("Failed to end session. Please try again.");
    }
}

// Update button states based on user role and session status
function updateButtonStates(isCreator, isActive, hasJoinedSession) {
    const joinBtn = document.getElementById("joinSessionBtn");
    const exitBtn = document.getElementById("exitSessionBtn");
    const endBtn = document.getElementById("endSessionBtn");
    
    // Hide all buttons first
    if (joinBtn) joinBtn.style.display = "none";
    if (exitBtn) exitBtn.style.display = "none";
    if (endBtn) endBtn.style.display = "none";
    
    if (!isActive) {
        // Session has ended - show ended state
        const alertDiv = document.createElement('div');
        alertDiv.className = "alert alert-danger mb-4";
        alertDiv.innerHTML = `
            <i class="bi bi-exclamation-circle"></i>
            <strong>This session has ended.</strong> All participants have been removed. You can now join other sessions.
            <a href="session.html" class="btn btn-sm btn-primary ms-2">View Active Sessions</a>
        `;
        
        // Add alert if it doesn't exist
        if (!document.querySelector('.alert-danger')) {
            const mainContainer = document.querySelector('main.container');
            const headerDiv = mainContainer.querySelector('.mb-4');
            headerDiv.parentElement.insertBefore(alertDiv, headerDiv.nextSibling);
        }
        
        // Update title
        const workoutName = document.getElementById("workoutName");
        if (workoutName && sessionData) {
            workoutName.innerHTML = `
                ${sessionData.name || "Session"}
                <span class="badge bg-danger ms-2">Ended</span>
            `;
        }
    } else if (isCreator) {
        // Creator sees "End Session" button
        if (endBtn) {
            endBtn.style.display = "inline-block";
            endBtn.innerHTML = '<i class="bi bi-stop-circle"></i> End Session';
            endBtn.className = "btn btn-danger btn-lg";
            endBtn.disabled = false;
        }
    } else if (hasJoinedSession) {
        // Regular participant who has joined
        if (joinBtn) {
            joinBtn.style.display = "inline-block";
            joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
            joinBtn.className = "btn btn-success btn-lg";
            joinBtn.disabled = true;
        }
        if (exitBtn) {
            exitBtn.style.display = "inline-block";
        }
    } else {
        // Regular user who hasn't joined
        if (joinBtn) {
            joinBtn.style.display = "inline-block";
            joinBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Join Session';
            joinBtn.className = "btn btn-primary btn-lg";
            joinBtn.disabled = false;
        }
    }
}

// Update join button state
function updateJoinButtonState(hasJoined, inOtherSession) {
    const joinBtn = document.getElementById("joinSessionBtn");
    const exitBtn = document.getElementById("exitSessionBtn");
    
    if (hasJoined) {
        joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
        joinBtn.className = "btn btn-success btn-lg";
        joinBtn.disabled = true;
        exitBtn.style.display = "inline-block";
    } else if (inOtherSession) {
        joinBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Already in Another Session';
        joinBtn.className = "btn btn-secondary btn-lg";
        joinBtn.disabled = true;
        exitBtn.style.display = "none";
    }
}

// Setup real-time listener for session updates
function setupSessionListener(sessionId) {
    const sessionRef = doc(db, "workoutSessions", sessionId);
    
    onSnapshot(sessionRef, async (docSnap) => {
        if (docSnap.exists()) {
            const previousIsActive = sessionData?.isActive;
            sessionData = docSnap.data();
            const currentIsActive = sessionData.isActive !== false;
            
            // If session just ended, check if current user was a participant
            if (previousIsActive !== false && !currentIsActive && currentUser) {
                const wasParticipant = await checkIfUserJoined(sessionId, currentUser.uid);
                if (wasParticipant) {
                    // User was in the session that just ended
                    alert("This session has ended. You have been removed and can now join other sessions.");
                    
                    // Reload page to show updated state
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                    return;
                }
            }
            
            const isCreator = currentUser && sessionData.uid === currentUser.uid;
            const hasJoinedSession = currentUser ? await checkIfUserJoined(sessionId, currentUser.uid) : false;
            
            console.log("Session updated:", { isCreator, isActive: currentIsActive, hasJoinedSession });
            
            // Update button states
            updateButtonStates(isCreator, currentIsActive, hasJoinedSession);
            
            // Refresh participants list
            await displayParticipants(sessionId);
        }
    }, (error) => {
        console.error("Error listening to session:", error);
    });
}

// Main function to fetch and display everything
async function displayInfo() {
    const id = getDocIdFromUrl();
    currentSessionId = id;
    
    if (!id) {
        console.error("No document ID found in URL");
        document.getElementById("workoutName").textContent = "No workout selected.";
        document.getElementById("movementName").textContent = "Please select a workout session from the list.";
        document.getElementById("participantsList").innerHTML = `
            <div class="alert alert-warning m-3">
                <i class="bi bi-exclamation-triangle"></i> No session ID provided in URL.
            </div>`;
        return;
    }

    // Wait for authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            console.log("Current user:", user.email);
            
            try {
                // Get session details
                const workoutRef = doc(db, "workoutSessions", id);
                const workoutSnap = await getDoc(workoutRef);
                
                if (!workoutSnap.exists()) {
                    console.error("Workout session not found");
                    document.getElementById("workoutName").textContent = "Workout not found";
                    document.getElementById("movementName").textContent = "This session may have been deleted.";
                    document.getElementById("participantsList").innerHTML = `
                        <div class="alert alert-danger m-3">
                            <i class="bi bi-x-circle"></i> Session not found in database.
                        </div>`;
                    return;
                }
                
                const workout = workoutSnap.data();
                sessionData = workout;
                
                // Update page with session details
                document.getElementById("workoutName").textContent = workout.name || "Unnamed Session";
                document.getElementById("movementName").textContent = workout.movement || "No movement specified";
                
                console.log("Workout loaded:", workout);
                
                // Load participants
                await displayParticipants(id);
                
                // Check user status
                const isCreator = workout.uid === user.uid;
                const isActive = workout.isActive !== false;
                const sessionCheck = await checkUserInAnySession(user.uid);
                const hasJoinedThisSession = await checkIfUserJoined(id, user.uid);
                
                console.log("User status:", { isCreator, isActive, hasJoinedThisSession, sessionCheck });
                
                // Setup real-time listener
                setupSessionListener(id);
                
                // Setup button event listeners
                const joinBtn = document.getElementById("joinSessionBtn");
                const exitBtn = document.getElementById("exitSessionBtn");
                const endBtn = document.getElementById("endSessionBtn");
                
                // Create End Session button if it doesn't exist
                if (!endBtn && isCreator) {
                    const newEndBtn = document.createElement("button");
                    newEndBtn.type = "button";
                    newEndBtn.className = "btn btn-danger btn-lg ms-2";
                    newEndBtn.id = "endSessionBtn";
                    newEndBtn.innerHTML = '<i class="bi bi-stop-circle"></i> End Session';
                    joinBtn.parentElement.appendChild(newEndBtn);
                }
                
                // Add event listeners
                if (joinBtn) {
                    joinBtn.addEventListener("click", () => {
                        joinSession(id, user);
                    });
                }
                
                if (exitBtn) {
                    exitBtn.addEventListener("click", () => {
                        if (confirm("Are you sure you want to leave this session?")) {
                            exitSession(id, user.uid);
                        }
                    });
                }
                
                const finalEndBtn = document.getElementById("endSessionBtn");
                if (finalEndBtn) {
                    finalEndBtn.addEventListener("click", () => {
                        if (confirm("Are you sure you want to end this session? All participants will be removed and this cannot be undone.")) {
                            endSession(id);
                        }
                    });
                }
                
                // Initial button state update
                updateButtonStates(isCreator, isActive, hasJoinedThisSession);
                
                // Handle "already in another session" case
                if (!hasJoinedThisSession && sessionCheck.isInSession && !isCreator) {
                    joinBtn.innerHTML = '<i class="bi bi-lock-fill"></i> Already in Another Session';
                    joinBtn.className = "btn btn-secondary btn-lg";
                    joinBtn.disabled = true;
                    joinBtn.title = `You're already in "${sessionCheck.sessionName}". Leave that session first.`;
                    
                    exitBtn.style.display = "none";
                    
                    // Show info message
                    const infoDiv = document.createElement('div');
                    infoDiv.className = "alert alert-info mt-3";
                    infoDiv.innerHTML = `
                        <i class="bi bi-info-circle"></i>
                        You're already in session: <strong>"${sessionCheck.sessionName}"</strong>. 
                        Please leave that session before joining this one.
                        <a href="EachActiveSession.html?docID=${sessionCheck.sessionId}" class="btn btn-sm btn-primary ms-2">
                            Go to My Session
                        </a>
                    `;
                    
                    const buttonsDiv = joinBtn.parentElement;
                    buttonsDiv.parentElement.insertBefore(infoDiv, buttonsDiv.nextSibling);
                }
                
            } catch (error) {
                console.error("Error loading workout:", error);
                document.getElementById("workoutName").textContent = "Error loading workout";
                document.getElementById("movementName").textContent = error.message;
                document.getElementById("participantsList").innerHTML = `
                    <div class="alert alert-danger m-3">
                        <i class="bi bi-exclamation-triangle"></i> Error: ${error.message}
                    </div>`;
            }
        } else {
            // No user is signed in
            console.error("No user logged in");
            document.getElementById("workoutName").textContent = "Please log in";
            document.getElementById("movementName").textContent = "You must be logged in to view this session.";
            document.getElementById("participantsList").innerHTML = `
                <div class="alert alert-info m-3">
                    <i class="bi bi-info-circle"></i> Please log in to view and join this session.
                </div>`;
            
            // Hide buttons
            document.getElementById("joinSessionBtn").style.display = "none";
            document.getElementById("exitSessionBtn").style.display = "none";
        }
    });
}

// Start the app
displayInfo();