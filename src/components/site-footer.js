class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <!-- Footer: single source of truth -->
            <footer class="navbar justify-content-evenly fixed-bottom bg-body-tertiary">
                <div class="container text-center">
                    <span class="material-icons" type="button" style="font-size: 48px;">home</span>
                    <span class="material-icons" type="button" style="font-size: 48px;">fitness_center</span>
                    <span class="material-icons" type="button" style="font-size: 48px;">add_circle</span>
                    <span class="material-icons" type="button" style="font-size: 48px;">favorite</span>
                    <span class="material-icons" type="button" style="font-size: 48px;">account_circle</span>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);