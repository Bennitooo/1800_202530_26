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
    const saveBioButton = document.getElementById("saveBioButton");

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
                progressText.textContent = `${Math.round(progressPercent)}%`;
            }
        });

        // -----------------------
        // INLINE BIO EDIT
        // -----------------------
        if (editBioButton) {
            editBioButton.addEventListener("click", () => {
                // Show textarea and save button
                bioEditor.value = bioElement.textContent;
                bioElement.classList.add("d-none");
                bioEditor.classList.remove("d-none");
                saveBioButton.classList.remove("d-none");
            });
        }

        if (saveBioButton) {
            saveBioButton.addEventListener("click", async () => {
                const newBio = bioEditor.value.trim();
                if (newBio === "") return; // optional: don't save empty

                try {
                    await updateDoc(userDocRef, { bio: newBio });
                    bioElement.textContent = newBio;

                    // Hide editor and save button
                    bioElement.classList.remove("d-none");
                    bioEditor.classList.add("d-none");
                    saveBioButton.classList.add("d-none");
                } catch (error) {
                    console.error("Error updating bio:", error);
                }
            });
        }
    });
}

showProfile();
