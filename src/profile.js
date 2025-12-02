// ====================================================================
// IMPORTS
// ====================================================================
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { Modal } from "bootstrap";
import { db, auth } from "./firebaseConfig.js";
import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    collection,
    addDoc
} from "firebase/firestore";
import { onAuthReady } from "./authentication.js";
import { onAuthStateChanged } from "firebase/auth";
import { showNotification } from "./notification.js";


// ====================================================================
// UTILITIES
// ====================================================================

// Detect which user profile is being viewed
function getViewedUserId() {
    const p = new URLSearchParams(window.location.search).get("uid");
    if (!p) return null;
    if (p === "undefined" || p === "null") return null;
    return p;
}

// Safe accessor
function getField(obj, key, fallback) {
    return obj && key in obj ? obj[key] : fallback;
}


// ====================================================================
// FOLLOW LIST MODAL
// ====================================================================
async function openFollowList(type) {
    const modalTitle = document.getElementById("followListTitle");
    const listContainer = document.getElementById("followListContainer");

    modalTitle.textContent = type === "followers" ? "Followers" : "Following";
    listContainer.innerHTML = `<div class="text-center p-2">Loading...</div>`;

    const uid = window.viewingProfileId;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;

    const data = snap.data();
    const ids = type === "followers" ? (data.followers ?? []) : (data.following ?? []);

    if (ids.length === 0) {
        listContainer.innerHTML = `<div class="text-center p-3 text-muted">No ${type} yet</div>`;
        return;
    }

    listContainer.innerHTML = "";

    for (const id of ids) {
        const uSnap = await getDoc(doc(db, "users", id));
        if (!uSnap.exists()) continue;

        const u = uSnap.data();

        const li = document.createElement("li");
        li.className = "list-group-item d-flex align-items-center gap-3";
        li.style.cursor = "pointer";
        li.onclick = () => (window.location.href = `profile.html?uid=${id}`);

        li.innerHTML = `
            <img src="${u.profileImage ? `data:image/png;base64,${u.profileImage}` : "/img/default.png"}"
                class="rounded-circle" style="width:40px;height:40px;object-fit:cover;">
            <span>${u.name || u.displayName || "Unknown User"}</span>
        `;

        listContainer.appendChild(li);
    }

    new bootstrap.Modal(document.getElementById("followListModal")).show();
}


// ====================================================================
// MAIN PROFILE LOGIC
// ====================================================================
function showProfile() {
    const el = {
        name: document.getElementById("name-goes-here"),
        level: document.getElementById("level-goes-here"),
        bio: document.getElementById("bio-goes-here"),
        bioEditor: document.getElementById("bio-editor"),
        editBioBtn: document.getElementById("editBioButton"),

        progressBar: document.getElementById("myProgressBar"),
        progressText: document.getElementById("progress-text"),

        profileImage: document.getElementById("profileImage"),
        inputImage: document.getElementById("inputImage"),

        editBadgeBtn: document.getElementById("editBadgeButton"),
        badgeListContainer: document.getElementById("badge-list"),
        badgeContainer: document.getElementById("badges-container"),
        saveBadgesBtn: document.getElementById("saveBadgesBtn"),
        noBadgesText: document.getElementById("no-badges-text"),

        followBtn: document.getElementById("follow-btn"),
        followerCount: document.getElementById("followers-count"),
        followingCount: document.getElementById("following-count")
    };

    // Modal triggers
    el.followerCount.onclick = () => openFollowList("followers");
    el.followingCount.onclick = () => openFollowList("following");

    // Wait until Firebase Auth is ready
    onAuthReady(async (user) => {
        if (!user) return (location.href = "index.html");

        const otherUID = getViewedUserId();
        const viewingOwn = otherUID === null || otherUID === user.uid;

        console.log("Logged-in user:", user.uid);
        console.log("Viewing UID:", otherUID);
        console.log("Viewing own profile?", viewingOwn);

        // Track which profile is being viewed
        window.viewingProfileId = otherUID || user.uid;

        const profileRef = doc(db, "users", window.viewingProfileId);
        const xpRef = doc(db, "usersXPsystem", window.viewingProfileId);

        // Disable editing when viewing someone else
        if (!viewingOwn) {
            el.editBioBtn.classList.add("d-none");
            el.inputImage.disabled = true;
            el.editBadgeBtn.classList.add("d-none");
        }

        // ------------------------------------------------------------------
        // REAL-TIME PROFILE DATA
        // ------------------------------------------------------------------
        onSnapshot(profileRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();

            el.name.textContent = getField(data, "name", "User");
            el.bio.textContent = getField(data, "bio", "No bio available");

            el.profileImage.src = data.profileImage
                ? `data:image/png;base64,${data.profileImage}`
                : "/images/elmo.jpg";

            el.followerCount.textContent = data.followers?.length ?? 0;
            el.followingCount.textContent = data.following?.length ?? 0;
        });

        // ------------------------------------------------------------------
        // REAL-TIME XP SYSTEM
        // ------------------------------------------------------------------
        onSnapshot(xpRef, (snap) => {
            if (!snap.exists()) return;
            const xp = snap.data().xp ?? 0;
            const level = snap.data().level ?? 1;
            const badges = snap.data().badges ?? [];

            el.level.textContent = level;
            el.progressBar.style.width = `${xp}%`;
            el.progressText.textContent = `${xp}%`;
            renderBadges(badges);
        });

        // ------------------------------------------------------------------
        // BIO EDITING
        // ------------------------------------------------------------------
        if (el.editBioBtn) {
            let editing = false;

            el.editBioBtn.onclick = async () => {
                if (!viewingOwn) return;

                if (!editing) {
                    const snap = await getDoc(profileRef);
                    el.bioEditor.value = getField(snap.data(), "bio", "");

                    el.bio.classList.add("d-none");
                    el.bioEditor.classList.remove("d-none");
                    el.editBioBtn.textContent = "check_circle";
                } else {
                    await updateDoc(profileRef, { bio: el.bioEditor.value.trim() });

                    el.bio.textContent = el.bioEditor.value.trim();
                    el.bio.classList.remove("d-none");
                    el.bioEditor.classList.add("d-none");
                    el.editBioBtn.textContent = "edit_square";
                }

                editing = !editing;
            };
        }

        // ------------------------------------------------------------------
        // BADGE RENDERING
        // ------------------------------------------------------------------
        function renderBadges(selected) {
            el.badgeContainer.innerHTML = "";
            if (selected.length === 0) {
                el.noBadgesText.classList.remove("d-none");
                return;
            }
            el.noBadgesText.classList.add("d-none");

            selected.forEach((icon) => {
                const span = document.createElement("span");
                span.className = "material-icons fs-2";
                span.textContent = icon;
                el.badgeContainer.appendChild(span);
            });
        }

        // ------------------------------------------------------------------
        // BADGE SELECTION MODAL
        // ------------------------------------------------------------------
        if (el.editBadgeBtn) {
            el.editBadgeBtn.onclick = async () => {
                const modal = new Modal(document.getElementById("badgeModal"));
                modal.show();

                const snap = await getDoc(xpRef);
                let selected = snap.data().badges ?? [];
                const collection = snap.data().badgeCollection ?? [];

                el.badgeListContainer.innerHTML = "";

                collection.forEach((iconName) => {
                    const icon = document.createElement("span");
                    icon.className = "material-icons fs-2 p-2 border rounded";
                    icon.textContent = iconName;
                    icon.style.cursor = "pointer";

                    if (selected.includes(iconName)) {
                        icon.classList.add("bg-primary", "text-white");
                    }

                    icon.onclick = () => {
                        if (selected.includes(iconName)) {
                            selected = selected.filter((b) => b !== iconName);
                            icon.classList.remove("bg-primary", "text-white");
                        } else if (selected.length < 3) {
                            selected.push(iconName);
                            icon.classList.add("bg-primary", "text-white");
                        }
                    };

                    el.badgeListContainer.appendChild(icon);
                });

                el.saveBadgesBtn.onclick = () => {
                    updateDoc(xpRef, { badges: selected });
                    modal.hide();
                };
            };
        }

        // ------------------------------------------------------------------
        // PROFILE IMAGE UPLOAD
        // ------------------------------------------------------------------
        if (el.profileImage && el.inputImage) {
            el.profileImage.onclick = () => viewingOwn && el.inputImage.click();

            el.inputImage.onchange = (e) => {
                if (!viewingOwn) return;

                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (x) => {
                    const base64 = x.target.result.split(",")[1];

                    await setDoc(profileRef, { profileImage: base64 }, { merge: true });

                    el.profileImage.src = `data:image/png;base64,${base64}`;
                    showNotification("Profile Picture Updated!");
                };

                reader.readAsDataURL(file);
            };
        }

// ====================================================================
// FOLLOW SYSTEM with FEED EVENT CREATION
// ====================================================================
async function setupFollowButton() {
    if (!el.followBtn || viewingOwn) {
        el.followBtn.classList.add("d-none");
        return;
    }

    // Show button
    el.followBtn.classList.remove("d-none");

    const currentRef = doc(db, "users", user.uid);              // YOU (the follower)
    const viewedRef = doc(db, "users", window.viewingProfileId); // Person you're viewing

    const snap = await getDoc(currentRef);
    const following = snap.data()?.following ?? [];

    let isFollowing = following.includes(otherUID);

    el.followBtn.textContent = isFollowing ? "Unfollow" : "Follow";

    el.followBtn.onclick = async () => {

        if (isFollowing) {
            // --------------------------
            // UNFOLLOW
            // --------------------------
            await updateDoc(currentRef, {
                following: arrayRemove(otherUID)
            });

            await updateDoc(viewedRef, {
                followers: arrayRemove(user.uid)
            });

            showNotification("Unfollowed user");
            el.followBtn.textContent = "Follow";

        } else {
            // --------------------------
            // FOLLOW
            // --------------------------
            await updateDoc(currentRef, {
                following: arrayUnion(otherUID)
            });

            await updateDoc(viewedRef, {
                followers: arrayUnion(user.uid)
            });

            // =========================================================
            // CREATE FEED EVENT FOR THE USER WHO GOT FOLLOWED
            // =========================================================
            const eventsRef = collection(db, "feed", otherUID, "events");  
            // ^ Event goes into THEIR feed (NOT yours)

            const followerSnap = await getDoc(currentRef);
            const followerData = followerSnap.data();

            await addDoc(eventsRef, {
                type: "follow",
                followerId: user.uid,
                followerName: followerData.name || "Unknown User",
                followerImage: followerData.profileImage || null,
                timestamp: Date.now()
            });
            // =========================================================

            showNotification("You are now following this user!");
            el.followBtn.textContent = "Unfollow";
        }

        isFollowing = !isFollowing;
    };
}
        // IMPORTANT: call it here
        setupFollowButton();
    });
}

showProfile();


// ====================================================================
// LOAD PROFILE IMAGE AFTER REFRESH (own profile)
// ====================================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // Only load the logged-in user’s image when they are viewing THEIR OWN profile
    const viewedUID = getViewedUserId();
    const viewingOwn = !viewedUID || viewedUID === user.uid;
    if (!viewingOwn) return;  // DO NOT overwrite other profiles

    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().profileImage) {
        document.getElementById("profileImage").src =
            "data:image/png;base64," + snap.data().profileImage;
    }
});

