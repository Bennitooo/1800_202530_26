import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthReady } from "./authentication.js";

function showProfile() {
    const nameElement  = document.getElementById("name-goes-here");
    const levelElement = document.getElementById("level-goes-here");
    const bioElement   = document.getElementById("bio-goes-here");
    const progressBar  = document.getElementById("myProgressBar");
    const progressText = document.getElementById("progress-text");

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

            // Basic leveling: 100 XP per level
            const xpPerLevel = 100;
            const currentLevelXP = xp % xpPerLevel;
            const progressPercent = (currentLevelXP / xpPerLevel) * 100;

            // Update level display
            if (levelElement)
                levelElement.textContent = level;

            // Update progress bar
            if (progressBar && progressText) {

                // Width of the bar
                progressBar.style.width = progressPercent + "%";
                progressBar.setAttribute("aria-valuenow", progressPercent);

                // Centered percentage text
                const percentRounded = Math.round(progressPercent);
                progressText.textContent = `${percentRounded}%`;
            }
        });
    });
}

showProfile();
