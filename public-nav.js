
document.addEventListener("DOMContentLoaded", async () => {
    const backLink = document.getElementById("backLink");

    if (!backLink) return;

    try {
        const { data: { user }, error } =
            await supabaseClient.auth.getUser();

        if (error) throw error;

        if (user) {
            backLink.href = "index.html";
            backLink.textContent = "← Back to Main Dashboard";
        } else {
            backLink.href = "login.html";
            backLink.textContent = "← Back to Login";
        }

    } catch (error) {
        console.error("Authentication check failed:", error);

        backLink.href = "login.html";
        backLink.textContent = "← Back to Login";
    }
});
