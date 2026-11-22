
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // COLLEGEHUB - BUG REPORT SYSTEM
    // Supports logged-in and logged-out users
    // ==========================================

    const reportButton = document.getElementById("reportBugButton");
    const modal = document.getElementById("bugReportModal");
    const closeButton = document.getElementById("closeBugReport");
    const cancelButton = document.getElementById("cancelBugReport");
    const form = document.getElementById("bugReportForm");

    const categoryInput = document.getElementById("bugCategory");
    const descriptionInput = document.getElementById("bugDescription");
    const characterCount = document.getElementById("bugCharacterCount");
    const submitButton = document.getElementById("submitBugReport");
    const emailInput = document.getElementById("bugEmail");

    if (!reportButton || !modal || !form) return;

    // ==========================================
    // IN-APP NOTIFICATIONS
    // ==========================================

    function showBugNotification(title, message, type = "success") {
        const notification = document.createElement("div");
        notification.className = `bug-notification ${type}`;

        const heading = document.createElement("div");
        heading.className = "bug-notification-title";
        heading.textContent = title;

        const text = document.createElement("div");
        text.className = "bug-notification-message";
        text.textContent = message;

        notification.append(heading, text);
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add("show"), 10);

        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3500);
    }

    // ==========================================
    // OPEN MODAL
    // ==========================================

    reportButton.addEventListener("click", () => {
        modal.classList.remove("hidden");
        descriptionInput?.focus();
    });

    // ==========================================
    // CLOSE MODAL
    // ==========================================

    function closeModal() {
        modal.classList.add("hidden");
    }

    closeButton?.addEventListener("click", closeModal);
    cancelButton?.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.classList.contains("hidden")) {
            closeModal();
        }
    });

    // ==========================================
    // CHARACTER COUNTER
    // ==========================================

    descriptionInput?.addEventListener("input", () => {
        if (characterCount) {
            characterCount.textContent = descriptionInput.value.length;
        }
    });

    // ==========================================
    // SUBMIT BUG REPORT
    // ==========================================

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const category = categoryInput?.value;
        const description = descriptionInput?.value.trim();
        const contactEmail = emailInput?.value.trim() || "";

        if (!category || !description) {
            showBugNotification(
                "Missing information",
                "Please select a category and describe the issue.",
                "error"
            );
            return;
        }

        if (description.length > 2000) {
            showBugNotification(
                "Description too long",
                "Your description must be no longer than 2000 characters.",
                "error"
            );
            return;
        }

        if (contactEmail && !emailInput.validity.valid) {
            showBugNotification(
                "Invalid email",
                "Please enter a valid contact email address.",
                "error"
            );
            return;
        }

        const client = window.supabaseClient;

        if (!client) {
            showBugNotification(
                "Connection error",
                "CollegeHub could not connect to Supabase. Please refresh the page.",
                "error"
            );
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            const { data, error } = await client.functions.invoke(
                "submit-bug-report",
                {
                    body: {
                        category,
                        description,
                        contact_email: contactEmail || null,
                        page_url: window.location.href,
                        user_agent: navigator.userAgent
                    }
                }
            );

            if (error) {
                let responseData = null;

                try {
                    responseData = await error.context?.json();
                } catch (_) {
                    responseData = null;
                }

                if (responseData?.saved) {
                    showBugNotification(
                        "Report saved",
                        "Your report was saved, but the Discord notification failed.",
                        "error"
                    );

                    form.reset();

                    if (characterCount) {
                        characterCount.textContent = "0";
                    }

                    closeModal();
                    return;
                }

                throw new Error(
                    responseData?.error || error.message || "Submission failed."
                );
            }

            if (!data?.success) {
                throw new Error(
                    data?.error || "The report could not be submitted."
                );
            }

            showBugNotification(
                "Report submitted",
                "Your bug report has been sent successfully.",
                "success"
            );

            form.reset();

            if (characterCount) {
                characterCount.textContent = "0";
            }

            closeModal();

        } catch (error) {
            console.error("Bug report error:", error);

            showBugNotification(
                "Submission failed",
                error.message || "Something went wrong. Please try again.",
                "error"
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Submit Report";
            }
        }
    });

});
