// ------------------------------------------------------------
// Firebase Authentication helper functions
// ------------------------------------------------------------

import { db } from "/src/firebaseConfig.js";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Firebase Auth imports
import { auth } from "/src/firebaseConfig.js";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// -------------------------------------------------------------
// loginUser()
// -------------------------------------------------------------
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// -------------------------------------------------------------
// Default available badges
// -------------------------------------------------------------
const DEFAULT_BADGE_COLLECTION = ["favorite", "anchor", "star"];

// -------------------------------------------------------------
// Creates XP profile on FIRST sign-up only
// -------------------------------------------------------------
async function createUserXPDocument(user) {
  const xpRef = doc(db, "usersXPsystem", user.uid);

  const snap = await getDoc(xpRef);
  if (snap.exists()) return;

  await setDoc(xpRef, {
    xp: 0,
    level: 1,
    badges: [],
    badgeCollection: DEFAULT_BADGE_COLLECTION,
  });
}

// -------------------------------------------------------------
// signupUser()
// -------------------------------------------------------------
export async function signupUser(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    bio: "Starting my fitness journey!",
    country: "Canada",
    profileImage: "" // initialize empty so profile doesn't break
  });

  await createUserXPDocument(user);

  return user;
}

// -------------------------------------------------------------
// logout
// -------------------------------------------------------------
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// SAFE auth-state handling (no infinite loops)
// -------------------------------------------------------------
export function checkAuthState() {
  onAuthStateChanged(auth, (user) => {

    const path = window.location.pathname;

    // pages that REQUIRE login
    const protectedPages = [
      "/dashboard.html",
      "/main.html",
      "/profile.html",
      "/workout.html"
    ];

    const onProtectedPage = protectedPages.some((p) => path.endsWith(p));

    if (onProtectedPage && !user) {
      // user is not logged in but trying to access private page
      window.location.href = "index.html";
      return;
    }

    // If on login/signup and user IS logged in → redirect to dashboard
    const authPages = ["/login.html", "/signup.html"];
    const onAuthPage = authPages.some((p) => path.endsWith(p));

    if (onAuthPage && user) {
      window.location.href = "dashboard.html";
    }
  });
}

// -------------------------------------------------------------
// onAuthReady(callback)
// -------------------------------------------------------------
export function onAuthReady(callback) {
  return onAuthStateChanged(auth, callback);
}

// -------------------------------------------------------------
// authErrorMessage()
// -------------------------------------------------------------
export function authErrorMessage(error) {
  const code = (error?.code || "").toLowerCase();

  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/email-already-in-use": "Email is already in use.",
    "auth/weak-password": "Password too weak (min 6 characters).",
    "auth/missing-password": "Password cannot be empty.",
    "auth/network-request-failed": "Network error. Try again.",
  };

  return map[code] || "Something went wrong. Please try again.";
}
