// Import specific functions from the Firebase Auth SDK

// This part is temporarily commented out because we don't have a login page

// import {
//     onAuthStateChanged,
// } from "firebase/auth";

// import { auth } from '/src/firebaseConfig.js';
// import { logoutUser } from '/src/authentication.js';

// This part is temporarily commented out because we don't have a login page

class SiteNavbar extends HTMLElement {
    constructor() {
        super();
        this.renderNavbar();
        this.renderAuthControls();
    }

renderNavbar() {
    this.innerHTML = `
    <nav class="navbar navbar-expand-lg bg-body-tertiary">
        <button class="btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasWithBothOptions" aria-controls="offcanvasWithBothOptions">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="offcanvas offcanvas-start w-75" data-bs-scroll="true" tabindex="-1" id="offcanvasWithBothOptions" aria-labelledby="offcanvasWithBothOptionsLabel">
            <div class="offcanvas-header">
                <h5 class="offcanvas-title text-center" id="offcanvasWithBothOptionsLabel">Backdrop with scrolling</h5>
            </div>

            <!-- Red Logout Button -->
            <div class="text-center mt-auto mb-3">
                <button id="logoutButton" class="btn btn-danger w-75">Log Out</button>
            </div>
        </div>
        <div class="">
            <a class="navbar-brand href="#">Fitman</a>
        </div>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link" href="/"></a>
                </li>
            </ul>
        </div>
        <button class="btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasWithBothOptions" aria-controls="offcanvasWithBothOptions" class=">
            <span class="navbar-toggler-icon"></span>
        </button>
    `;

    // Attach logout handler
    const logoutBtn = this.querySelector("#logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            import("/src/authentication.js").then(module => {
                module.logoutUser();
            });
        });
    }
}


    renderAuthControls() {
        // const authControls = this.querySelector('#authControls');
        const target = document.getElementById("#authControls");
        if (!target) return;

        // Initialize with invisible placeholder to maintain layout space
        //authControls.innerHTML = `<div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">Log out</div>`;
        target.innerHTML = `<div class="btn btn-outline-light" style="visibility: hidden; min-width: 80px;">Log out</div>`;

        onAuthStateChanged(auth, (user) => {
            let updatedAuthControl;
            if (user) {
                updatedAuthControl = `<button class="btn btn-outline-light" id="signOutBtn" type="button" style="min-width: 80px;">Log out</button>`;
                authControls.innerHTML = updatedAuthControl;
                const signOutBtn = authControls.querySelector('#signOutBtn');
                signOutBtn?.addEventListener('click', logoutUser);
            } else {
                updatedAuthControl = `<a class="btn btn-outline-light" id="loginBtn" href="/login.html" style="min-width: 80px;">Log in</a>`;
                authControls.innerHTML = updatedAuthControl;
            }
        });
    }
    
}

customElements.define('site-navbar', SiteNavbar);