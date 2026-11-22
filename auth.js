
// ==========================================
// COLLEGEHUB - AUTHENTICATION SYSTEM
// ==========================================


// ==========================================
// IN-APP NOTIFICATIONS
// ==========================================

function showAuthNotification(title, message, type = "success") {

    const notification = document.createElement("div");

    notification.className = `auth-notification ${type}`;
    notification.setAttribute("role", "status");

    const heading = document.createElement("div");
    heading.className = "auth-notification-title";
    heading.textContent = title;

    const description = document.createElement("div");
    description.className = "auth-notification-message";
    description.textContent = message;

    notification.appendChild(heading);
    notification.appendChild(description);

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add("show");
    });

    setTimeout(() => {
        notification.classList.remove("show");

        setTimeout(() => {
            notification.remove();
        }, 300);

    }, 3500);
}


// ==========================================
// STUDENT REGISTRATION
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const displayName = document.getElementById("displayName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!displayName) {
            showAuthNotification(
                "Missing information",
                "Please enter a display name.",
                "error"
            );
            return;
        }

        try {

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        display_name: displayName
                    }
                }
            });

            if (error) throw error;

            if (data.session) {

                showAuthNotification(
                    "Account created",
                    "Your CollegeHub account has been created successfully."
                );

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);

            } else {

                showAuthNotification(
                    "Account created",
                    "Please check your email to confirm your account before logging in."
                );

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 3000);

            }

        } catch (error) {

            showAuthNotification(
                "Registration failed",
                error.message,
                "error"
            );

        }

    });

}


// ==========================================
// STUDENT LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {

            const { error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            showAuthNotification(
                "Login successful",
                "Welcome back to CollegeHub."
            );

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1200);

        } catch (error) {

            showAuthNotification(
                "Login failed",
                error.message,
                "error"
            );

        }

    });

}


// ==========================================
// PASSWORD RESET REQUEST
// ==========================================

const forgotPasswordButton = document.getElementById("forgotPasswordButton");

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();

        if (!email) {

            showAuthNotification(
                "Email required",
                "Please enter your email address first.",
                "error"
            );

            return;
        }

        try {

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password.html"
            });

            if (error) throw error;

            showAuthNotification(
                "Email sent",
                "Password reset instructions have been sent. Check your inbox."
            );

        } catch (error) {

            showAuthNotification(
                "Password reset failed",
                error.message,
                "error"
            );

        }

    });

}


// ==========================================
// PASSWORD UPDATE
// ==========================================

const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {

    resetPasswordForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const newPassword = document.getElementById("newPassword").value;

        try {

            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showAuthNotification(
                "Password updated",
                "Your password has been updated successfully."
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } catch (error) {

            showAuthNotification(
                "Password update failed",
                error.message,
                "error"
            );

        }

    });

}
