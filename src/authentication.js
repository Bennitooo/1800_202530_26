// ------------------------------------------------------------
// Part of the COMP1800 Project
// Firebase Authentication helper functions
// ------------------------------------------------------------

import { db } from "/src/firebaseConfig.js";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Firebase Auth imports
import { auth } from "/src/firebaseConfig.js";
import { signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// -------------------------------------------------------------
// loginUser(email, password)
// -------------------------------------------------------------
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// -------------------------------------------------------------
// createUserXPDocument(user)
// -------------------------------------------------------------
// ONLY runs when the user signs up, never on login
// -------------------------------------------------------------
async function createUserXPDocument(user) {
  const xpRef = doc(db, "usersXPsystem", user.uid);

  // Prevent overwriting existing XP data
  const snap = await getDoc(xpRef);
  if (snap.exists()) {
    console.log("XP document already exists — not creating again.");
    return;
  }

  await setDoc(xpRef, {
    xp: 0,
    level: 1,
    badges: [],
  });

  console.log("New XP document created for:", user.uid);
}

// -------------------------------------------------------------
// signupUser(name, email, password)
// -------------------------------------------------------------
export async function signupUser(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  try {
    // Create main user profile
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      country: "Canada",
    });

    console.log("Firestore user document created successfully!");

    // 👉 XP doc ONLY created on signup
    await createUserXPDocument(user);
  } catch (error) {
    console.error("Error creating user document in Firestore:", error);
  }

  return user;
}

// -------------------------------------------------------------
// IMPORTANT: Removed XP creation from auth listener!
// This prevents XP from resetting on login.
// -------------------------------------------------------------

// ← This block was deleted:
// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     await createUserXPDocument(user);
//   }
// });

// -------------------------------------------------------------
// logoutUser()
// -------------------------------------------------------------
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

// -------------------------------------------------------------
// checkAuthState()
// -------------------------------------------------------------
export function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (window.location.pathname.endsWith("main.html")) {
      if (user) {
        const displayName = user.displayName || user.email;
        $("#welcomeMessage").text(`Hello, ${displayName}!`);
      } else {
        window.location.href = "index.html";
      }
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
// authErrorMessage(error)
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
