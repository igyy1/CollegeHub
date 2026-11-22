
const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const newPassword = document.getElementById("newPassword").value;

        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert("Password update failed: " + error.message);
            return;
        }

        alert("Password updated successfully! You can now log in.");
        window.location.href = "login.html";
    });
}
