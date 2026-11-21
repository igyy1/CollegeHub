
// COLLEGEHUB - AUTHENTICATION SYSTEM


// STUDENT REGISTRATION
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const displayName = document.getElementById("displayName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (!displayName) {
            alert("Please enter a display name.");
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
                alert("Account created successfully!");
                window.location.href = "index.html";
            } else {
                alert("Account created! Please check your email to confirm your account before logging in.");
                window.location.href = "login.html";
            }

        } catch (error) {
            alert("Registration failed: " + error.message);
        }
    });
}


// STUDENT LOGIN
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

            alert("Login successful!");
            window.location.href = "index.html";

        } catch (error) {
            alert("Login failed: " + error.message);
        }
    });
}
// PASSWORD RESET
const forgotPasswordButton = document.getElementById("forgotPasswordButton");

if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();

        if (!email) {
            alert("Please enter your email address first.");
            return;
        }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/reset-password.html"
        });

        if (error) {
            alert("Password reset failed: " + error.message);
            return;
        }

        alert("Password reset email sent! Check your inbox.");
    });
}