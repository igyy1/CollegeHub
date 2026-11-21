
// COLLEGEHUB - SECURE DASHBOARD SYSTEM

let assignments = [];
let currentUser = null;


// DISPLAY TODAY'S DATE
document.getElementById("today").textContent =
    new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });


// CALCULATE DAYS REMAINING
function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round(
        (due - today) / (1000 * 60 * 60 * 24)
    );
}


// DETERMINE DEADLINE COLOUR
function getDeadlineStatus(days) {
    if (days < 7) return "red";
    if (days <= 14) return "yellow";
    return "green";
}


// PROTECT USER-ENTERED TEXT
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// LOAD ASSIGNMENTS FROM SUPABASE
async function loadAssignments() {

    const { data, error } = await supabaseClient
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

    if (error) {
        console.error("Assignment loading error:", error);
        alert("Could not load your assignments. Please refresh the page.");
        return;
    }

    assignments = data || [];

    renderDashboard();
}


// DISPLAY ASSIGNMENTS
function renderDashboard() {

    const list = document.getElementById("assignment-list");

    list.innerHTML = "";

    let active = 0;
    let completed = 0;
    let overdue = 0;
    let upcoming = 0;

    assignments.forEach((assignment) => {

        if (assignment.completed) {
            completed++;
            return;
        }

        active++;

        const days = getDaysRemaining(assignment.deadline);

        if (days < 0) overdue++;
        else upcoming++;

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
                    <p>Deadline: ${new Date(
                        assignment.deadline + "T00:00:00"
                    ).toLocaleDateString("en-GB")}</p>
                </div>

                <div>
                    <span class="deadline-status">${status}</span>
                    <br><br>
                    <button onclick="completeAssignment('${assignment.id}')">
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


// COMPLETE AN ASSIGNMENT
async function completeAssignment(id) {

    const { error } = await supabaseClient
        .from("assignments")
        .update({ completed: true })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Could not complete this assignment.");
        return;
    }

    await loadAssignments();
}


// SHOW / HIDE ASSIGNMENT FORM
document.getElementById("add-button").addEventListener("click", () => {

    document.getElementById("assignment-form").classList.toggle("hidden");

});


// ADD NEW ASSIGNMENT
document.getElementById("new-assignment").addEventListener("submit", async event => {

    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const deadline = document.getElementById("deadline").value;

    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    if (deadline < localToday) {
        alert("This deadline is in the past. Please check the date.");
        return;
    }

    const { error } = await supabaseClient
        .from("assignments")
        .insert({
            user_id: currentUser.id,
            title: title,
            subject: subject,
            deadline: deadline,
            completed: false
        });

    if (error) {
        console.error(error);
        alert("Could not save your assignment: " + error.message);
        return;
    }

    event.target.reset();

    document.getElementById("assignment-form").classList.add("hidden");

    await loadAssignments();
});


// CHECK LOGIN AND START DASHBOARD
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
