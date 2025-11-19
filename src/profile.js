import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { onAuthReady } from "./authentication.js";

function showProfile() {
    const nameElement = document.getElementById("name-goes-here");
    const levelElement = document.getElementById("level-goes-here");
    const bioElement = document.getElementById("bio-goes-here");
    const progressBar = document.getElementById("myProgressBar");
    const progressText = document.getElementById("progress-text");
    const editBioButton = document.getElementById("editBioButton");
    const bioEditor = document.getElementById("bio-editor");

    onAuthReady(async (user) => {
        if (!user) {
            location.href = "index.html";
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const xpDocRef = doc(db, "usersXPsystem", user.uid);

        // -----------------------
        // PROFILE DETAILS
        // -----------------------
        onSnapshot(userDocRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            if (nameElement)
                nameElement.textContent = data.name || user.displayName;

            if (bioElement)
                bioElement.textContent = data.bio || "No bio available";
        });

        // -----------------------
        // XP / LEVEL + PROGRESS
        // -----------------------
        onSnapshot(xpDocRef, (snap) => {
            if (!snap.exists()) return;

            const data = snap.data();
            const xp = data.xp ?? 0;
            const level = data.level ?? 1;

            const xpPerLevel = 100;
            const currentLevelXP = xp % xpPerLevel;
            const progressPercent = (currentLevelXP / xpPerLevel) * 100;

            if (levelElement)
                levelElement.textContent = level;

            if (progressBar && progressText) {
                progressBar.style.width = `${progressPercent}%`;
                progressBar.setAttribute("aria-valuenow", progressPercent);
                progressText.textContent = `${Math.round(progressPercent)}%`;
            }
        });

        // ---------------------------------------------------------
        // INLINE BIO EDITING
        // ---------------------------------------------------------
        let editingBio = false;

        if (editBioButton) {
            editBioButton.addEventListener("click", async () => {

                // ENTER EDIT MODE
                if (!editingBio) {
                    try {
                        const snap = await getDoc(userDocRef);
                        const currentBio = snap.exists() ? (snap.data().bio || "") : "";

                        bioEditor.value = currentBio;

                        bioElement.classList.add("d-none");
                        bioEditor.classList.remove("d-none");
                        editBioButton.textContent = "check";

                        editingBio = true;
                    } catch (err) {
                        console.error("Failed loading bio:", err);
                    }
                    return;
                }

                // SAVE EDIT
                const newBio = bioEditor.value.trim();

                try {
                    await updateDoc(userDocRef, { bio: newBio });

                    bioElement.textContent = newBio;
                    bioElement.classList.remove("d-none");
                    bioEditor.classList.add("d-none");
                    editBioButton.textContent = "edit_square";

                    editingBio = false;
                } catch (err) {
                    console.error("BIO UPDATE FAILED:", err);
                }
            });
        }
    });
}

showProfile();
