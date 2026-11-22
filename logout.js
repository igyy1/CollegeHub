
document.addEventListener("DOMContentLoaded", () => {

    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) return;

    // Create logout confirmation modal
    const logoutModal = document.createElement("div");

    logoutModal.className = "logout-modal hidden";

    logoutModal.innerHTML = `
        <div class="logout-modal-content">

            <div class="logout-modal-icon">↪</div>

            <h2>Sign out of CollegeHub?</h2>

            <p class="muted">
                Are you sure you want to sign out of your account?
            </p>

            <div class="logout-modal-actions">
                <button type="button" id="cancelLogout" class="secondary-button">
                    Cancel
                </button>

                <button type="button" id="confirmLogoutButton">
                    Log Out
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(logoutModal);

    const cancelLogout = logoutModal.querySelector("#cancelLogout");
    const confirmLogoutButton = logoutModal.querySelector("#confirmLogoutButton");

    // Open modal
    logoutButton.addEventListener("click", () => {
        logoutModal.classList.remove("hidden");
    });

    // Close modal
    cancelLogout.addEventListener("click", () => {
        logoutModal.classList.add("hidden");
    });

    // Close when clicking outside
    logoutModal.addEventListener("click", (event) => {
        if (event.target === logoutModal) {
            logoutModal.classList.add("hidden");
        }
    });

    // Confirm logout
    confirmLogoutButton.addEventListener("click", async () => {

        confirmLogoutButton.disabled = true;
        confirmLogoutButton.textContent = "Signing out...";

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            confirmLogoutButton.disabled = false;
            confirmLogoutButton.textContent = "Log Out";

            logoutModal.classList.add("hidden");

            console.error("Logout failed:", error);
            return;
        }

        window.location.href = "login.html";

    });

});
