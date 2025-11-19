import { collection, doc, getDocs, setDoc, addDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";

// Get the document ID from the URL
function getDocIdFromUrl() {
    const params = new URL(window.location.href).searchParams;
    const docID = params.get("docID");
    console.log("Current URL:", window.location.href);
    console.log("Document ID from URL:", docID);
    return docID;
}


// Fetch the workout and display its name
async function displayInfo() {
    const id = getDocIdFromUrl();
    
    if (!id) {
        console.error("No document ID found in URL");
        document.getElementById("workoutName").textContent = "No workout selected.";
        return;
    }

    // Wait for authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            try {
                const workoutRef = doc(db, "workoutSessions", id);
                const workoutSnap = await getDoc(workoutRef);
                
                if (!workoutSnap.exists()) {
                    console.error("Workout session not found");
                    document.getElementById("workoutName").textContent = "Workout not found.";
                    return;
                }
                
                const workout = workoutSnap.data();
                const name = workout.name;
                const movement = workout.movement;

                // Update the page
                document.getElementById("workoutName").textContent = name;
                document.getElementById("movementName").textContent = movement;
                console.log("Workout loaded:", workout);
                
            } catch (error) {
                console.error("Error loading workout:", error);
                document.getElementById("workoutName").textContent = "Error loading workout.";
            }
        } else {
            // No user is signed in
            console.error("No user logged in");
            document.getElementById("workoutName").textContent = "Please log in to view workout.";
        }
    });
}


displayInfo();