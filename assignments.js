
// COLLEGEHUB - ASSIGNMENT MANAGER

// Load assignments shared with the Dashboard
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

// Display assignments
function renderAssignments() {

    const list = document.getElementById("assignmentList");
    const search = document.getElementById("searchInput").value.toLowerCase();

    list.innerHTML = "";

    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    assignments.forEach((assignment, index) => {

        if (assignment.completed) {
            completed++;
        } else {
            inProgress++;

            if (getDaysRemaining(assignment.deadline) < 0) {
                overdue++;
            }
        }

        // Search assignments
        const matchesSearch =
            assignment.title.toLowerCase().includes(search) ||
            assignment.subject.toLowerCase().includes(search);

        if (!matchesSearch) return;

        const days = getDaysRemaining(assignment.deadline);

        let status;

        if (assignment.completed) {
            status = "COMPLETED";
        } else if (days < 0) {
            status = "OVERDUE";
        } else if (days === 0) {
            status = "DUE TODAY";
        } else {
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
                    <br><br>

                    ${!assignment.completed ? `
                        <button onclick="completeAssignment(${index})">
                            Complete
                        </button>
                    ` : ""}

                    <button onclick="deleteAssignment(${index})">
                        Delete
                    </button>
                </div>

            </div>
        `;
    });

    if (list.innerHTML === "") {
        list.innerHTML = "<p class='muted'>No assignments found.</p>";
    }

    // Update statistics
    document.getElementById("totalCount").textContent = assignments.length;
    document.getElementById("progressCount").textContent = inProgress;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("overdueCount").textContent = overdue;
}

// Save assignments for BOTH pages
function saveAssignments() {

    localStorage.setItem(
        "collegeAssignments",
        JSON.stringify(assignments)
    );

    renderAssignments();
}

// Complete assignment
function completeAssignment(index) {
    assignments[index].completed = true;
    saveAssignments();
}

// Delete assignment
function deleteAssignment(index) {

    if (confirm("Are you sure you want to delete this assignment?")) {
        assignments.splice(index, 1);
        saveAssignments();
    }
}

// Show and hide form
document.getElementById("addAssignmentBtn").addEventListener("click", () => {

    document.getElementById("assignment-form").classList.toggle("hidden");

});

// Add assignment
document.getElementById("new-assignment").addEventListener("submit", event => {

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
        alert("Please choose a deadline that isn't in the past.");
        return;
    }

    assignments.push({
        title: title,
        subject: subject,
        deadline: deadline,
        completed: false
    });

    saveAssignments();

    event.target.reset();

    document.getElementById("assignment-form").classList.add("hidden");

});

// Search assignments
document.getElementById("searchInput").addEventListener("input", renderAssignments);

// Initial page load
renderAssignments();
