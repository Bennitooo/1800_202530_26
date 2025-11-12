class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <footer class="navbar justify-content-evenly fixed-bottom bg-body-tertiary">
                <div class="container text-center">
                    <a class="nav-link" href="/main.html"><span class="material-icons" type="button" style="font-size: 48px;">home</span><br>Home</a>
                    <a class="nav-link" href="/session.html"><span class="material-icons" type="button" style="font-size: 48px;">fitness_center</span><br>Session</a>
                    <a class="nav-link" href="/create.html"><span class="material-icons" type="button" style="font-size: 48px;">add_circle</span><br>Create</a>
                    <a class="nav-link" href="/socialfeed.html"><span class="material-icons" type="button" style="font-size: 48px;">group</span><br>Feed</a>
                    <a class="nav-link" href="/profile.html"><span class="material-icons" type="button" style="font-size: 48px;">account_circle</span><br>Profile</a>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);