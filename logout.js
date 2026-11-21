
const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        const confirmLogout = confirm("Are you sure you want to log out?");

        if (!confirmLogout) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Could not log out: " + error.message);
            return;
        }

        window.location.href = "login.html";
    });
}
