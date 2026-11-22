
// ==========================================
// COLLEGEHUB - SECURE DASHBOARD SYSTEM
// ==========================================

let assignments = [];
let currentUser = null;
let toastTimeout = null;


// ==========================================
// CALCULATE DAYS REMAINING
// ==========================================

function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round(
        (due - today) / (1000 * 60 * 60 * 24)
    );
}


// ==========================================
// DETERMINE DEADLINE COLOUR
// ==========================================

function getDeadlineStatus(days) {
    if (days < 7) return "red";
    if (days <= 14) return "yellow";
    return "green";
}


// ==========================================
// PROTECT USER-ENTERED TEXT
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ==========================================
// IN-APP NOTIFICATIONS
// ==========================================

function showDashboardToast(message, type = "success") {

    const toast = document.getElementById("dashboard-toast");

    if (!toast) return;

    clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = `dashboard-toast ${type} show`;

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


// ==========================================
// OPEN / CLOSE ASSIGNMENT MODAL
// ==========================================

function openAssignmentModal() {

    const modal = document.getElementById("assignment-modal");

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    setTimeout(() => {
        document.getElementById("title").focus();
    }, 100);
}


function closeAssignmentModal() {

    const modal = document.getElementById("assignment-modal");

    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    document.getElementById("new-assignment").reset();
}


// ==========================================
// LOAD ASSIGNMENTS FROM SUPABASE
// ==========================================

async function loadAssignments() {

    const { data, error } = await supabaseClient
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

    if (error) {
        console.error("Assignment loading error:", error);
        showDashboardToast(
            "Could not load your assignments. Please refresh the page.",
            "error"
        );
        return;
    }

    assignments = data || [];

    renderDashboard();
}


// ==========================================
// DISPLAY ASSIGNMENTS
// ==========================================

function renderDashboard() {

    const list = document.getElementById("assignment-list");

    list.innerHTML = "";

    let active = 0;
    let completed = 0;
    let overdue = 0;
    let upcoming = 0;

    assignments.forEach(assignment => {

        if (assignment.completed) {
            completed++;
            return;
        }

        active++;

        const days = getDaysRemaining(assignment.deadline);

        if (days < 0) {
            overdue++;
        } else {
            upcoming++;
        }

        const colour = getDeadlineStatus(days);

        let status;

        if (days < 0) {
            status = `OVERDUE (${Math.abs(days)} days)`;
        } else if (days === 0) {
            status = "DUE TODAY";
        } else {
            status = `${days} DAYS LEFT`;
        }

        list.innerHTML += `
            <div class="assignment ${colour}">
                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>
                    <p>${escapeHTML(assignment.subject)}</p>
                    <p>
                        Deadline:
                        ${new Date(
                            assignment.deadline + "T00:00:00"
                        ).toLocaleDateString("en-GB")}
                    </p>
                </div>

                <div>
                    <span class="deadline-status">${status}</span>
                    <br><br>
                    <button
                        type="button"
                        onclick="completeAssignment('${escapeHTML(assignment.id)}')"
                    >
                        Complete
                    </button>
                </div>
            </div>
        `;
    });

    if (assignments.length === 0) {
        list.innerHTML =
            "<p class='muted'>No assignments yet. Add your first one!</p>";
    }

    document.getElementById("active-count").textContent = active;
    document.getElementById("completed-count").textContent = completed;
    document.getElementById("upcoming-count").textContent = upcoming;
    document.getElementById("overdue-count").textContent = overdue;

    const percentage = assignments.length === 0
        ? 0
        : Math.round((completed / assignments.length) * 100);

    document.getElementById("progress-fill").style.width =
        percentage + "%";

    document.getElementById("progress-text").textContent =
        percentage + "% completed";
}


// ==========================================
// COMPLETE AN ASSIGNMENT
// ==========================================

async function completeAssignment(id) {

    const { error } = await supabaseClient
        .from("assignments")
        .update({ completed: true })
        .eq("id", id)
        .eq("user_id", currentUser.id);

    if (error) {
        console.error("Assignment completion error:", error);

        showDashboardToast(
            "Could not complete this assignment.",
            "error"
        );

        return;
    }

    showDashboardToast("Assignment marked as completed.");

    await loadAssignments();
}


// ==========================================
// ADD NEW ASSIGNMENT
// ==========================================

async function saveAssignment(event) {

    event.preventDefault();

    const titleInput = document.getElementById("title");
    const subjectInput = document.getElementById("subject");
    const deadlineInput = document.getElementById("deadline");
    const saveButton = document.getElementById("save-assignment-button");

    const title = titleInput.value.trim();
    const subject = subjectInput.value.trim();
    const deadline = deadlineInput.value;

    // Check required fields
    if (!title || !subject || !deadline) {
        showDashboardToast(
            "Please complete all assignment fields.",
            "error"
        );
        return;
    }

    // Check deadline
    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    if (deadline < localToday) {
        showDashboardToast(
            "This deadline is in the past. Please check the date.",
            "error"
        );
        return;
    }

    // Prevent duplicate submissions
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const { error } = await supabaseClient
        .from("assignments")
        .insert({
            user_id: currentUser.id,
            title: title,
            subject: subject,
            deadline: deadline,
            completed: false
        });

    saveButton.disabled = false;
    saveButton.textContent = "Save assignment";

    if (error) {
        console.error("Assignment saving error:", error);

        showDashboardToast(
            "Could not save your assignment. Please try again.",
            "error"
        );

        return;
    }

    closeAssignmentModal();

    showDashboardToast("Assignment added successfully!");

    await loadAssignments();
}


// ==========================================
// MODAL EVENT LISTENERS
// ==========================================

document.getElementById("add-button").addEventListener("click", () => {
    openAssignmentModal();
});


document.getElementById("close-assignment-modal").addEventListener("click", () => {
    closeAssignmentModal();
});


document.getElementById("cancel-assignment").addEventListener("click", () => {
    closeAssignmentModal();
});


document.getElementById("assignment-modal").addEventListener("click", event => {

    if (event.target.id === "assignment-modal") {
        closeAssignmentModal();
    }

});


document.addEventListener("keydown", event => {

    const modal = document.getElementById("assignment-modal");

    if (
        event.key === "Escape" &&
        !modal.classList.contains("hidden")
    ) {
        closeAssignmentModal();
    }

});


// ==========================================
// FORM SUBMISSION
// ==========================================

document.getElementById("new-assignment").addEventListener(
    "submit",
    saveAssignment
);


// ==========================================
// CHECK LOGIN AND START DASHBOARD
// ==========================================

async function initialiseDashboard() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = data.user;

    await loadAssignments();
}

initialiseDashboard();
