import { collection, doc, getDocs, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";

// Get the document ID from the URL
function getDocIdFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const docID = params.get("docID");
    console.log("Current URL:", window.location.href);
    console.log("Document ID from URL:", docID);
    return docID;
}

// Join the session - adds REAL user data automatically
async function joinSession(sessionId, user) {
    try {
        console.log("Joining session:", sessionId, "as user:", user.email);
        
        // This creates the participants subcollection automatically
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", user.uid);
        
        await setDoc(participantRef, {
            name: user.displayName || user.email || "Anonymous",
            email: user.email,
            joinedAt: serverTimestamp(),
            uid: user.uid
        });
        
        console.log("Successfully joined session!");
        
        // Show success message
        const joinBtn = document.getElementById("joinSessionBtn");
        joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
        joinBtn.className = "btn btn-success btn-lg me-2";
        joinBtn.disabled = true;
        
        // Show exit button
        const exitBtn = document.getElementById("exitSessionBtn");
        exitBtn.style.display = "inline-block";
        
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

// Check if current user has already joined
async function checkIfUserJoined(sessionId, userId) {
    try {
        const participantRef = doc(db, "workoutSessions", sessionId, "participants", userId);
        const participantSnap = await getDoc(participantRef);
        const hasJoined = participantSnap.exists();
        console.log("User has joined:", hasJoined);
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

// Main function to fetch and display everything
async function displayInfo() {
    const id = getDocIdFromUrl();
    
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
                
                // Update page with session details
                document.getElementById("workoutName").textContent = workout.name || "Unnamed Session";
                document.getElementById("movementName").textContent = workout.movement || "No movement specified";
                
                console.log("Workout loaded:", workout);
                
                // Load participants
                await displayParticipants(id);
                
                // Check if current user has already joined
                const hasJoined = await checkIfUserJoined(id, user.uid);
                const joinBtn = document.getElementById("joinSessionBtn");
                const exitBtn = document.getElementById("exitSessionBtn");
                
                if (hasJoined) {
                    // User already joined - show "Joined" state
                    joinBtn.innerHTML = '<i class="bi bi-check-circle"></i> Joined!';
                    joinBtn.className = "btn btn-success btn-lg me-2";
                    joinBtn.disabled = true;
                    
                    // Show and enable exit button
                    exitBtn.style.display = "inline-block";
                    exitBtn.addEventListener("click", () => {
                        if (confirm("Are you sure you want to leave this session?")) {
                            exitSession(id, user.uid);
                        }
                    });
                } else {
                    // User hasn't joined yet - show join button
                    exitBtn.style.display = "none";
                    
                    joinBtn.addEventListener("click", () => {
                        joinSession(id, user);
                    });
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