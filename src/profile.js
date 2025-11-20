import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { Modal } from "bootstrap";
import { db, auth } from "./firebaseConfig.js";
import { doc, setDoc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthReady } from "./authentication.js";
import { onAuthStateChanged } from "firebase/auth";

// ====================================================================
// MAIN PROFILE FUNCTION
// ====================================================================
function showProfile() {

    // DOM refs
    const nameElement = document.getElementById("name-goes-here");
    const levelElement = document.getElementById("level-goes-here");
    const bioElement = document.getElementById("bio-goes-here");
    const progressBar = document.getElementById("myProgressBar");
    const progressText = document.getElementById("progress-text");
    const editBioButton = document.getElementById("editBioButton");
    const bioEditor = document.getElementById("bio-editor");

    // Profile image
    const profileImage = document.getElementById("profileImage");
    const inputImage = document.getElementById("inputImage");

    if (profileImage && inputImage) {
        profileImage.addEventListener("click", () => inputImage.click());
    }

    // Badge UI
    const editBadgeButton = document.getElementById("editBadgeButton");
    const badgeListContainer = document.getElementById("badge-list");
    const saveBadgesBtn = document.getElementById("saveBadgesBtn");
    const badgeContainer = document.getElementById("badges-container");
    const noBadgesText = document.getElementById("no-badges-text");

    let selectedBadges = [];
    let imageLoaded = false; // ⭐ prevents overwriting the uploaded image

    // ====================================================================
    // AUTH READY
    // ====================================================================
    onAuthReady(async (user) => {
        if (!user) return (location.href = "index.html");

        const userDocRef = doc(db, "users", user.uid);
        const xpDocRef = doc(db, "usersXPsystem", user.uid);

        // ------------------------------------------------------------
        // LIVE USER INFORMATION (name, bio, image)
        // ------------------------------------------------------------
        onSnapshot(userDocRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            nameElement.textContent = data.name || user.displayName;
            bioElement.textContent = data.bio || "No bio available";

            // ⭐ Only apply default image ONCE
            if (data.profileImage) {
                profileImage.src = `data:image/png;base64,${data.profileImage}`;
                imageLoaded = true;
            } else if (!imageLoaded) {
                profileImage.src = "/images/elmo.jpg"; // Default ONLY once
                imageLoaded = true;
            }
        });

        // ------------------------------------------------------------
        // XP + LEVEL + PROGRESS BAR
        // ------------------------------------------------------------
        onSnapshot(xpDocRef, (snap) => {
            if (!snap.exists()) return;

            const data = snap.data();
            const xp = data.xp ?? 0;
            const level = data.level ?? 1;

            levelElement.textContent = level;
            progressBar.style.width = `${xp}%`;
            progressText.textContent = `${xp}%`;
        });

        // ------------------------------------------------------------
        // BIO EDITING SYSTEM
        // ------------------------------------------------------------
        let editingBio = false;

        editBioButton.addEventListener("click", async () => {
            if (!editingBio) {
                const snap = await getDoc(userDocRef);
                bioEditor.value = snap.data()?.bio || "";

                bioElement.classList.add("d-none");
                bioEditor.classList.remove("d-none");
                editBioButton.textContent = "check";
                editingBio = true;
                return;
            }

            await updateDoc(userDocRef, { bio: bioEditor.value.trim() });

            bioElement.textContent = bioEditor.value.trim();
            bioElement.classList.remove("d-none");
            bioEditor.classList.add("d-none");
            editBioButton.textContent = "edit_square";

            editingBio = false;
        });

        // ------------------------------------------------------------
        // BADGE MODAL (load + toggle)
        // ------------------------------------------------------------
        editBadgeButton.addEventListener("click", async () => {
            const modalEl = document.getElementById("badgeModal");
            const modal = new Modal(modalEl);
            modal.show();

            const xpSnap = await getDoc(xpDocRef);
            const data = xpSnap.data();

            const badgeOptions = data.badgeCollection || [];
            selectedBadges = data.badges || [];

            badgeListContainer.innerHTML = "";

            badgeOptions.forEach((iconName) => {
                const icon = document.createElement("span");
                icon.className = "material-icons fs-2 p-2 border rounded";
                icon.style.cursor = "pointer";
                icon.textContent = iconName;

                if (selectedBadges.includes(iconName)) {
                    icon.classList.add("bg-primary", "text-white");
                }

                icon.addEventListener("click", () => {
                    const selected = selectedBadges.includes(iconName);

                    if (selected) {
                        selectedBadges = selectedBadges.filter((b) => b !== iconName);
                        icon.classList.remove("bg-primary", "text-white");
                    } else {
                        if (selectedBadges.length >= 3) {
                            alert("You can select up to 3 badges only.");
                            return;
                        }
                        selectedBadges.push(iconName);
                        icon.classList.add("bg-primary", "text-white");
                    }
                });

                badgeListContainer.appendChild(icon);
            });
        });

        // ------------------------------------------------------------
        // SAVE BADGES BUTTON
        // ------------------------------------------------------------
        saveBadgesBtn.addEventListener("click", async () => {
            await updateDoc(xpDocRef, { badges: selectedBadges });
            updateDisplayedBadges();

            const modal = Modal.getInstance(
                document.getElementById("badgeModal")
            );
            modal.hide();
        });

        // ------------------------------------------------------------
        // LIVE BADGE DISPLAY
        // ------------------------------------------------------------
        onSnapshot(xpDocRef, (snap) => {
            selectedBadges = snap.data()?.badges || [];
            updateDisplayedBadges();
        });

        function updateDisplayedBadges() {
            badgeContainer.innerHTML = "";

            if (selectedBadges.length === 0) {
                noBadgesText.classList.remove("d-none");
                badgeContainer.appendChild(noBadgesText);
                return;
            }

            noBadgesText.classList.add("d-none");

            selectedBadges.forEach((iconName) => {
                const icon = document.createElement("span");
                icon.className = "material-icons fs-2";
                icon.textContent = iconName;

                badgeContainer.appendChild(icon);
            });
        }

        // ------------------------------------------------------------
        // IMAGE UPLOAD HANDLING + SAVE TO FIRESTORE
        // ------------------------------------------------------------
        inputImage.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result.split(",")[1];
                saveProfileImage(base64);
            };
            reader.readAsDataURL(file);
        });

        async function saveProfileImage(base64String) {
            await setDoc(
                userDocRef,
                { profileImage: base64String },
                { merge: true }
            );

            profileImage.src = `data:image/png;base64,${base64String}`;
            imageLoaded = true; // ensure Firestore doesn't overwrite it
        }
    });
}

// Start profile
showProfile();

// ====================================================================
// LOAD SAVED IMAGE ON HARD REFRESH
// ====================================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists() && snap.data().profileImage) {
        document.getElementById("profileImage").src =
            "data:image/png;base64," + snap.data().profileImage;
    }
});
