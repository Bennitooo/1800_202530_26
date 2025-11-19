import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { Modal } from "bootstrap";
import { db } from "./firebaseConfig.js";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { onAuthReady } from "./authentication.js";

function showProfile() {
    // DOM references
    const nameElement = document.getElementById("name-goes-here");
    const levelElement = document.getElementById("level-goes-here");
    const bioElement = document.getElementById("bio-goes-here");
    const progressBar = document.getElementById("myProgressBar");
    const progressText = document.getElementById("progress-text");
    const editBioButton = document.getElementById("editBioButton");
    const bioEditor = document.getElementById("bio-editor");

    // Badge UI references
    const editBadgeButton = document.getElementById("editBadgeButton");
    const badgeListContainer = document.getElementById("badge-list");
    const saveBadgesBtn = document.getElementById("saveBadgesBtn");

    // Badge display references
    const badgeContainer = document.getElementById("badges-container");
    const noBadgesText = document.getElementById("no-badges-text");

    let selectedBadges = [];

    onAuthReady(async (user) => {
        if (!user) {
            location.href = "index.html";
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const xpDocRef = doc(db, "usersXPsystem", user.uid);

        // =========================================================
        // LIVE PROFILE DATA
        // =========================================================
        onSnapshot(userDocRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            nameElement.textContent = data.name || user.displayName;
            bioElement.textContent = data.bio || "No bio available";
        });

        // =========================================================
        // XP + LEVEL + PROGRESS BAR
        // =========================================================
        onSnapshot(xpDocRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            const xp = data.xp ?? 0;
            const level = data.level ?? 1;

            levelElement.textContent = level;
            progressBar.style.width = `${xp}%`;
            progressBar.setAttribute("aria-valuenow", xp);
            progressText.textContent = `${Math.round(xp)}%`;
        });

        // =========================================================
        // BIO INLINE EDITING
        // =========================================================
        let editingBio = false;

        if (editBioButton) {
            editBioButton.addEventListener("click", async () => {

                if (!editingBio) {
                    const snap = await getDoc(userDocRef);
                    const currentBio = snap.exists() ? (snap.data().bio || "") : "";

                    bioEditor.value = currentBio;

                    bioElement.classList.add("d-none");
                    bioEditor.classList.remove("d-none");
                    editBioButton.textContent = "check";

                    editingBio = true;
                    return;
                }

                const newBio = bioEditor.value.trim();
                await updateDoc(userDocRef, { bio: newBio });

                bioElement.textContent = newBio;
                bioElement.classList.remove("d-none");
                bioEditor.classList.add("d-none");
                editBioButton.textContent = "edit_square";

                editingBio = false;
            });
        }

        // =========================================================
        // BADGE EDIT → OPEN MODAL (LOAD FROM usersXPsystem)
        // =========================================================
        if (editBadgeButton) {
            editBadgeButton.addEventListener("click", async () => {
                const modalEl = document.getElementById("badgeModal");
                const modal = new Modal(modalEl);
                modal.show();

                // Load available badges from XP system
                const xpSnap = await getDoc(xpDocRef);
                const xpData = xpSnap.exists() ? xpSnap.data() : {};
                const badgeOptions = xpData.badgeCollection || [];

                // Load user's selected badges (from usersXPsystem)
                selectedBadges = xpData.badges || [];

                // Clear old UI
                badgeListContainer.innerHTML = "";

                // Build toggle buttons
                badgeOptions.forEach(iconName => {
                    const btn = document.createElement("span");
                    btn.className = "material-icons fs-2 p-2 border rounded me-2 mb-2";
                    btn.style.cursor = "pointer";
                    btn.textContent = iconName;

                    if (selectedBadges.includes(iconName)) {
                        btn.classList.add("bg-primary", "text-white");
                    }

                    btn.addEventListener("click", () => {
                        const isSelected = selectedBadges.includes(iconName);

                        if (isSelected) {
                            selectedBadges = selectedBadges.filter(b => b !== iconName);
                            btn.classList.remove("bg-primary", "text-white");
                        } else {
                            if (selectedBadges.length >= 3) {
                                alert("You can select at most 3 badges.");
                                return;
                            }
                            selectedBadges.push(iconName);
                            btn.classList.add("bg-primary", "text-white");
                        }
                    });

                    badgeListContainer.appendChild(btn);
                });
            });
        }

        // =========================================================
        // SAVE BADGES → WRITE TO usersXPsystem
        // =========================================================
        if (saveBadgesBtn) {
            saveBadgesBtn.addEventListener("click", async () => {
                await updateDoc(xpDocRef, { badges: selectedBadges });

                updateDisplayedBadges();

                const modalEl = document.getElementById("badgeModal");
                const modal = Modal.getInstance(modalEl);
                modal.hide();
            });
        }

        // =========================================================
        // FIRESTORE WATCH → UPDATE BADGES DISPLAY (usersXPsystem)
        // =========================================================
        onSnapshot(xpDocRef, (snap) => {
            if (!snap.exists()) return;

            selectedBadges = snap.data().badges || [];
            updateDisplayedBadges();
        });

        // =========================================================
        // RENDER BADGES TO PROFILE CARD
        // =========================================================
        function updateDisplayedBadges() {
            badgeContainer.innerHTML = "";

            if (selectedBadges.length === 0) {
                noBadgesText.classList.remove("d-none");
                badgeContainer.appendChild(noBadgesText);
                return;
            }

            noBadgesText.classList.add("d-none");

            selectedBadges.forEach(iconName => {
                const icon = document.createElement("span");
                icon.className = "material-icons fs-2 me-2";
                icon.textContent = iconName;
                badgeContainer.appendChild(icon);
            });
        }
    });
}

showProfile();
