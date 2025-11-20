// notification.js

// Ensure Bootstrap bundle is loaded
if (!window.bootstrap) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    document.head.appendChild(script);
}

export function showNotification(message, duration = 2000) {
    const container = document.getElementById("notification-container");
    if (!container) return;

    // Create the toast
    const toastEl = document.createElement("div");
    toastEl.className = "toast text-bg-primary border-0 d-flex justify-content-center";
    toastEl.role = "alert";
    toastEl.style.minWidth = "250px";    
    toastEl.style.textAlign = "center";  
    
    toastEl.innerHTML = `
        <div class="toast-body w-100">
            ${message}
        </div>
    `;

    container.appendChild(toastEl);

    // Activate Bootstrap toast
    const toast = new bootstrap.Toast(toastEl, {
        animation: true,
        autohide: true,
        delay: duration
    });

    toast.show();

    // Remove after hidden
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}
