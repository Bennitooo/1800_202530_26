// Import Firebase Auth + logout function
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '/src/firebaseConfig.js';
import { logoutUser } from '/src/authentication.js';

class SiteNavbar extends HTMLElement {
    constructor() {
        super();
        this.renderNavbar();
        this.renderAuthControls();
    }

    renderNavbar() {
        this.innerHTML = `
        <nav class="navbar bg-body-tertiary">

            <!-- Offcanvas toggle -->
            <button class="btn" type="button" data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasWithBothOptions" aria-controls="offcanvasWithBothOptions">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- Offcanvas menu -->
            <div class="offcanvas offcanvas-start w-75" data-bs-scroll="true" tabindex="-1"
                id="offcanvasWithBothOptions" aria-labelledby="offcanvasWithBothOptionsLabel">

                <div class="offcanvas-header">
                    <h5 class="offcanvas-title text-center" id="offcanvasWithBothOptionsLabel">
                        Menu
                    </h5>
                </div>

                <!-- Red Logout Button -->
                <div class="text-center mt-auto mb-3">
                    <button id="logoutButton" class="btn btn-danger w-50">Log Out</button>
                </div>
            </div>

            <!-- Logo -->
            <div>
                <a class="navbar-brand" href="#">FitQuest</a>
            </div>

            <!-- Spacer collapse (unused) -->
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item"><a class="nav-link" href="/"></a></li>
                </ul>
            </div>

            <!-- Duplicate toggle button -->
            <button class="btn" type="button" data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasWithBothOptions" aria-controls="offcanvasWithBothOptions">
            </button>
        </nav>
        `;
        const logoutBtn = this.querySelector("#logoutButton");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", logoutUser);
        }
    }

    renderAuthControls() {
        const authControls = document.getElementById("authControls");
        if (!authControls) return;

        authControls.innerHTML = `
            <div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">
                Log out
            </div>
        `;

        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User logged in → show logout button
                authControls.innerHTML = `
                    <button class="btn btn-outline-light" id="signOutBtn" type="button" style="min-width: 80px;">
                        Log out
                    </button>
                `;

                const signOutBtn = authControls.querySelector('#signOutBtn');
                if (signOutBtn) signOutBtn.addEventListener('click', logoutUser);

            } else {
                // User logged out → show login button
                authControls.innerHTML = `
                    <a class="btn btn-outline-light" id="loginBtn"
                       href="/login.html" style="min-width: 80px;">
                        Log in
                    </a>
                `;
            }
        });
    }
}

customElements.define('site-navbar', SiteNavbar);
