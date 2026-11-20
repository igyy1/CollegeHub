
// COLLEGEHUB - DASHBOARD SYSTEM

let assignments = JSON.parse(
    localStorage.getItem("collegeAssignments")
) || [];

// Display today's date
document.getElementById("today").textContent =
    new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

// Calculate days remaining
function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round(
        (due - today) / (1000 * 60 * 60 * 24)
    );
}

// Determine deadline colour
function getDeadlineStatus(days) {
    if (days < 7) return "red";
    if (days <= 14) return "yellow";
    return "green";
}

// Display assignments
function renderDashboard() {

    const list = document.getElementById("assignment-list");

    list.innerHTML = "";

    let active = 0;
    let completed = 0;
    let overdue = 0;
    let upcoming = 0;

    assignments.forEach((assignment, index) => {

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
                    <button onclick="completeAssignment(${index})">
                        Complete
                    </button>
                </div>
            </div>
        `;
    });

    if (assignments.length === 0) {
        list.innerHTML = "<p class='muted'>No assignments yet. Add your first one!</p>";
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

// Basic protection when displaying user-entered text
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Complete an assignment
function completeAssignment(index) {
    assignments[index].completed = true;
    saveAssignments();
}

// Save assignments to browser storage
function saveAssignments() {
    localStorage.setItem(
        "collegeAssignments",
        JSON.stringify(assignments)
    );

    renderDashboard();
}

// Show/hide assignment form
document.getElementById("add-button").addEventListener("click", () => {
    document.getElementById("assignment-form").classList.toggle("hidden");
});

// Add new assignment
document.getElementById("new-assignment").addEventListener("submit", event => {

    event.preventDefault();

    const title = document.getElementById("title").value;
    const subject = document.getElementById("subject").value;
    const deadline = document.getElementById("deadline").value;

    if (deadline < new Date().toLocaleDateString("en-CA")) {
        alert("This deadline is in the past. Please check the date.");
        return;
    }

    assignments.push({
        title,
        subject,
        deadline,
        completed: false
    });

    saveAssignments();

    event.target.reset();

    document.getElementById("assignment-form").classList.add("hidden");
});

// Initial dashboard load
renderDashboard();
