
// COLLEGEHUB - REMINDERS SYSTEM

// Load assignments from shared browser storage
let assignments = JSON.parse(
    localStorage.getItem("collegeAssignments")
) || [];

// Calculate days remaining
function getDaysRemaining(deadline) {
    const today = new Date();
    const due = new Date(deadline + "T00:00:00");

    today.setHours(0, 0, 0, 0);

    return Math.round(
        (due - today) / (1000 * 60 * 60 * 24)
    );
}

// Display reminders
function renderReminders() {

    const list = document.getElementById("reminderList");

    list.innerHTML = "";

    let upcoming = 0;
    let dueToday = 0;
    let overdue = 0;

    // Sort assignments by deadline
    const sortedAssignments = [...assignments].sort(
        (a, b) => a.deadline.localeCompare(b.deadline)
    );

    sortedAssignments.forEach(assignment => {

        if (assignment.completed) return;

        const days = getDaysRemaining(assignment.deadline);

        let status;

        if (days < 0) {
            overdue++;
            status = "OVERDUE";
        } else if (days === 0) {
            dueToday++;
            status = "DUE TODAY";
        } else {
            upcoming++;
            status = days + " DAYS LEFT";
        }

        list.innerHTML += `
            <div class="assignment">

                <div>
                    <h3>${escapeHTML(assignment.title)}</h3>
                    <p>${escapeHTML(assignment.subject)}</p>
                    <p>Deadline: ${new Date(
                        assignment.deadline + "T00:00:00"
                    ).toLocaleDateString("en-GB")}</p>
                </div>

                <div>
                    <span class="deadline-status">${status}</span>
                </div>

            </div>
        `;
    });

    if (list.innerHTML === "") {
        list.innerHTML = "<p class='muted'>No upcoming reminders.</p>";
    }

    document.getElementById("upcomingCount").textContent = upcoming;
    document.getElementById("todayCount").textContent = dueToday;
    document.getElementById("overdueCount").textContent = overdue;
}

// Protect user-entered text
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Initial load
renderReminders();
