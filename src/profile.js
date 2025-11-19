import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthReady } from "./authentication.js";

function showProfile() {
    const nameElement  = document.getElementById("name-goes-here");
    const levelElement = document.getElementById("level-goes-here");
    const bioElement   = document.getElementById("bio-goes-here");
    const progressBar  = document.getElementById("myProgressBar");
    const progressText = document.getElementById("progress-text");
    const editBioButton = document.getElementById("editBioButton");
    const bioEditor = document.getElementById("bio-editor");

    onAuthReady(async (user) => {
        if (!user) {
            location.href = "index.html";
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const xpDocRef   = doc(db, "usersXPsystem", user.uid);

        // -----------------------
        // PROFILE DETAILS
        // -----------------------
        onSnapshot(userDocRef, (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            if (nameElement)
                nameElement.textContent = data.name || user.displayName;

            if (bioElement)
                bioElement.textContent = data.bio || "No bio available";
        });

        // -----------------------
        // XP / LEVEL + PROGRESS BAR
        // -----------------------
        onSnapshot(xpDocRef, (docSnap) => {
            if (!docSnap.exists()) return;

            const data = docSnap.data();

            const xp    = data.xp ?? 0;
            const level = data.level ?? 1;

            const xpPerLevel = 100;
            const currentLevelXP = xp % xpPerLevel;
            const progressPercent = (currentLevelXP / xpPerLevel) * 100;

            if (levelElement)
                levelElement.textContent = level;

            if (progressBar && progressText) {
                progressBar.style.width = progressPercent + "%";
                progressBar.setAttribute("aria-valuenow", progressPercent);
                const percentRounded = Math.round(progressPercent);
                progressText.textContent = `${percentRounded}%`;
            }
        });

        // -----------------------
        // EDIT BIO BUTTON
        // -----------------------
        if (editBioButton && bioEditor && bioElement) {
            let isEditing = false;

            editBioButton.addEventListener("click", async () => {
                if (!isEditing) {
                    // Start editing
                    bioEditor.value = bioElement.textContent;
                    bioEditor.classList.remove("d-none");
                    bioElement.classList.add("d-none");
                    isEditing = true;
                } else {
                    // Save changes
                    const newBio = bioEditor.value.trim();
                    try {
                        await updateDoc(userDocRef, { bio: newBio });
                        // UI will auto-update due to onSnapshot
                        bioEditor.classList.add("d-none");
                        bioElement.classList.remove("d-none");
                        editBioButton.textContent = "edit_square"; // Switch back to edit icon
                        isEditing = false;
                    } catch (error) {
                        console.error("Error updating bio:", error);
                        alert("Failed to update bio. Try again.");
                    }
                }
            });
        }
    });
}

showProfile();
